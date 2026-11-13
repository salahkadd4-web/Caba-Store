'use client'

// components/retours/flowmerce/FlowmerceReturnForm.tsx
//
// Formulaire de retour dynamique piloté par Flowmerce.
// Les champs déjà connus (commande, client, produit — fournis via `prefill`
// par ClientRetourView) sont injectés dans les réponses SANS être affichés :
// l'utilisateur ne voit que ce qui reste (motif, résolution, description…).
// La soumission est déléguée au parent (voir ReturnConfirmation) : ce composant
// se contente de charger, afficher, valider, et exposer { form, answers }.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, PackageX } from 'lucide-react'
import type { ReturnForm, ReturnAnswer, ReturnPrefill } from '@/lib/flowmerce-types'
import { ENGINE_VERSION, flattenFields } from '@/lib/flowmerce-types'
import { validateForm } from '@/lib/flowmerce-validation'
import { availableOptions, isAwaitingParent, isEmphasized, pruneDependentAnswers, withDependents } from '@/lib/flowmerce-dependencies'
import DynamicField, { type UploadFn } from './DynamicField'
import { useI18n } from '@/components/I18nProvider'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; retryable: boolean }
  | { kind: 'empty' }
  | { kind: 'incompatible'; version: number }
  | { kind: 'ready'; form: ReturnForm }

export interface FlowmerceReturnFormHandle {
  /** Valide les champs visibles. Retourne { form, answers } (avec prefill fusionné)
   *  si tout est valide, ou null (et affiche les erreurs) sinon. */
  validateAndGet: () => { form: ReturnForm; answers: ReturnAnswer } | null
}

interface FlowmerceReturnFormProps {
  /** Réponses déjà connues (commande, client, produit) — masquées à l'écran. */
  prefill: ReturnPrefill
  /** Appelé à chaque changement de réponse : true si tous les champs requis sont valides. */
  onValidityChange?: (valid: boolean) => void
}

const FlowmerceReturnForm = forwardRef<FlowmerceReturnFormHandle, FlowmerceReturnFormProps>(
  function FlowmerceReturnForm({ prefill, onValidityChange }, ref) {
    const { t } = useI18n()
    const f = t.returns.form
    const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' })
    const [answers,   setAnswers]   = useState<ReturnAnswer>({})
    const [errors,    setErrors]    = useState<Record<string, string>>({})

    // ── Chargement de la définition du formulaire ────────────────────────────
    const fetchForm = useCallback(async (): Promise<LoadState> => {
      try {
        const res  = await fetch('/api/retours/form', { cache: 'no-store' })
        const data = await res.json().catch(() => ({})) as { form?: ReturnForm; error?: string }

        if (!res.ok || !data.form) {
          return { kind: 'error', message: data.error ?? f.loadError, retryable: res.status >= 500 || res.status === 429 }
        }

        const form = data.form

        if (form.min_compatible_version > ENGINE_VERSION) {
          return { kind: 'incompatible', version: form.version }
        }

        if (!Array.isArray(form.sections) || form.sections.every(s => s.fields.length === 0)) {
          return { kind: 'empty' }
        }

        return { kind: 'ready', form }
      } catch {
        return { kind: 'error', message: f.networkError, retryable: true }
      }
    }, [f])

    useEffect(() => {
      let cancelled = false
      void fetchForm().then(state => {
        if (cancelled) return
        setLoadState(state)
        if (state.kind === 'ready') {
          const fields = flattenFields(state.form)
          const defaults: ReturnAnswer = {}
          for (const field of fields) {
            if (field.defaultValue !== undefined) defaults[field.id] = field.defaultValue
          }
          // Une valeur par défaut d'un champ dépendant peut ne pas correspondre à son parent.
          setAnswers(pruneDependentAnswers(fields, { ...defaults, ...prefill }))
        }
      })
      return () => { cancelled = true }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchForm])

    // Si le prefill arrive/change après coup (profil chargé un peu plus tard),
    // on le refusionne dans les réponses sans écraser ce que l'utilisateur a saisi.
    useEffect(() => {
      if (loadState.kind === 'ready') {
        const fields = flattenFields(loadState.form)
        setAnswers(prev => pruneDependentAnswers(fields, { ...prev, ...prefill }))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefill, loadState.kind])


    // ── Notifie le parent de la validité courante à chaque changement ─────────
    useEffect(() => {
      if (loadState.kind !== 'ready') return
      const currentErrors = validateForm(flattenFields(loadState.form), answers, t.returns.validation)
      onValidityChange?.(Object.keys(currentErrors).length === 0)
    }, [loadState, answers, onValidityChange, t])

    const handleRetry = () => {
      setLoadState({ kind: 'loading' })
      void fetchForm().then(setLoadState)
    }

    const uploadFile: UploadFn = useCallback(async (field, file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fieldId', field.id)

      const res = await fetch('/api/retours/upload', { method: 'POST', body: formData, signal: AbortSignal.timeout(60_000) })
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string }

      if (!res.ok || !data.url) throw new Error(data.error ?? f.uploadFailed)
      return data.url
    }, [f])

    const formFields = useMemo(
      () => (loadState.kind === 'ready' ? flattenFields(loadState.form) : []),
      [loadState],
    )

    const setAnswer = useCallback((fieldId: string, value: unknown) => {
      // Changer un parent vide, en cascade, les champs dépendants devenus invalides.
      setAnswers(prev => pruneDependentAnswers(formFields, { ...prev, [fieldId]: value }))
      // Erreurs à effacer : le champ modifié et les champs qui en dépendent.
      const touched = withDependents(formFields, fieldId)
      setErrors(prev => {
        if (!touched.some(id => id in prev)) return prev
        const rest = { ...prev }
        for (const id of touched) delete rest[id]
        return rest
      })
    }, [formFields])

    // ── Exposé au parent : valider les champs visibles + renvoyer les réponses
    //    complètes (visibles + prefill), prêtes pour la confirmation/soumission ──
    useImperativeHandle(ref, () => ({
      validateAndGet: () => {
        if (loadState.kind !== 'ready') return null

        const validationErrors = validateForm(flattenFields(loadState.form), answers, t.returns.validation)
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors)
          return null
        }
        return { form: loadState.form, answers }
      },
    }), [loadState, answers, t])

    // ── Rendu par état de chargement ──────────────────────────────────────────
    if (loadState.kind === 'loading') {
      return (
        <div className="flex items-center justify-center gap-3 py-14 text-stone-500 dark:text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{f.loading}</span>
        </div>
      )
    }

    if (loadState.kind === 'error') {
      return (
        <StateCard icon={<AlertTriangle className="w-8 h-8 text-red-500" />} title={f.unavailable} message={loadState.message}>
          {loadState.retryable && (
            <button onClick={handleRetry} className="px-5 py-2 bg-orange-700 hover:bg-orange-800 text-white rounded-xl text-sm font-semibold transition">
              {f.retry}
            </button>
          )}
        </StateCard>
      )
    }

    if (loadState.kind === 'empty') {
      return (
        <StateCard icon={<PackageX className="w-8 h-8 text-stone-400" />} title={f.emptyTitle}
          message={f.emptyMessage} />
      )
    }

    if (loadState.kind === 'incompatible') {
      return (
        <StateCard icon={<AlertTriangle className="w-8 h-8 text-amber-500" />} title={f.incompatibleTitle}
          message={f.incompatibleMessage(loadState.version)} />
      )
    }

    // ── Formulaire prêt : uniquement les sections dont au moins un champ
    //    n'est PAS déjà connu (prefill) ────────────────────────────────────────
    const form = loadState.form
    const visibleSections = form.sections
      .map(section => ({ ...section, fields: section.fields.filter(f => !(f.id in prefill)) }))
      .filter(section => section.fields.length > 0)

    return (
      <div className="space-y-6">
        {visibleSections.map(section => (
          <div key={section.id} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-stone-700 dark:text-stone-200">{section.title}</h3>
              {section.description && (
                <p className="text-xs text-stone-400 mt-0.5">{section.description}</p>
              )}
            </div>
            {section.fields.map(field => {
              // Dépendances v3 (depends_on / emphasized_by) : sans elles, rendu inchangé.
              const parent = field.depends_on ? formFields.find(p => p.id === field.depends_on) : undefined
              return (
                <DynamicField
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  error={errors[field.id]}
                  onChange={value => setAnswer(field.id, value)}
                  onUpload={uploadFile}
                  options={field.depends_on ? availableOptions(field, answers) : undefined}
                  // Le placeholder JSON d'un champ dépendant décrit l'attente du
                  // parent (ex. « Sélectionnez d'abord un motif… ») ; à défaut, texte i18n.
                  awaitingHint={isAwaitingParent(field, answers)
                    ? field.placeholder ?? f.awaitingParent(parent?.label ?? field.depends_on ?? '')
                    : undefined}
                  emphasized={isEmphasized(field, formFields, answers)}
                />
              )
            })}
          </div>
        ))}
      </div>
    )
  },
)

export default FlowmerceReturnForm

function StateCard({ icon, title, message, children }: { icon: React.ReactNode; title: string; message: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-10">
      <div className="mx-auto mb-3 flex justify-center">{icon}</div>
      <h3 className="text-base font-bold text-stone-800 dark:text-stone-100 mb-1.5">{title}</h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto mb-5 leading-relaxed">{message}</p>
      {children}
    </div>
  )
}
