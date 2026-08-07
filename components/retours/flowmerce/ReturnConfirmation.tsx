'use client'

// components/retours/flowmerce/ReturnConfirmation.tsx
//
// Étape 4 — récapitulatif en lecture seule de TOUTE la réclamation (commande,
// client, produit, motif, résolution, description) avant envoi définitif à
// Flowmerce. Les libellés et options viennent du JSON Flowmerce (aucun champ
// codé en dur).

import { AlertTriangle } from 'lucide-react'
import type { ReturnForm, ReturnAnswer, ReturnField } from '@/lib/flowmerce-types'
import { normalizeOption } from '@/lib/flowmerce-validation'

interface ReturnConfirmationProps {
  form: ReturnForm
  answers: ReturnAnswer
  error?: string | null
}

function formatAnswer(field: ReturnField, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'

  if ((field.type === 'select' || field.type === 'radio') && typeof value === 'string') {
    const opt = (field.options ?? []).map(normalizeOption).find(o => o.value === value)
    return opt?.label ?? value
  }

  if (field.type === 'checkbox' && Array.isArray(value)) {
    const opts = (field.options ?? []).map(normalizeOption)
    return value.map(v => opts.find(o => o.value === v)?.label ?? String(v)).join(', ') || '—'
  }

  if (field.type === 'boolean' || field.type === 'switch') return value ? 'Oui' : 'Non'

  if (field.type === 'date' && typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return String(value)
}

export default function ReturnConfirmation({ form, answers, error }: ReturnConfirmationProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Récapitulatif de la demande</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Vérifiez les informations avant l&apos;envoi.</p>
      </div>

      {form.sections.map(section => (
        <div key={section.id} className="rounded-xl border border-stone-100 dark:border-stone-800 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-3">{section.title}</h3>
          <dl className="space-y-2">
            {section.fields.map(field => (
              <div key={field.id} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-stone-500 dark:text-stone-400 shrink-0">{field.label ?? field.id}</dt>
                <dd className="text-sm font-semibold text-stone-800 dark:text-stone-100 text-right">
                  {formatAnswer(field, answers[field.id])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}
