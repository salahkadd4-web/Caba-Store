'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, CheckCircle2, Package, AlertCircle, Loader2, Send } from 'lucide-react'
import type { ReturnForm, ReturnAnswer, ReturnPrefill } from '@/lib/flowmerce-types'
import { mapPaymentMethod } from '@/lib/flowmerce-mapping'
import FlowmerceReturnForm, { type FlowmerceReturnFormHandle } from './flowmerce/FlowmerceReturnForm'
import ReturnConfirmation from './flowmerce/ReturnConfirmation'

type OrderItem = {
  id: string
  quantite: number
  prix: number
  variantNom: string | null
  variantOptionValeur: string | null
  product: { id: string; nom: string; images: string[]; category?: { nom: string } }
}

type Order = {
  id: string
  statut: string
  total: number
  createdAt: string
  retourDemande: boolean
  modePaiement: string
  methodeExpedition: string
  fraisLivraison: number
  items: OrderItem[]
}

type Profil = { nom: string; prenom: string; email: string | null; telephone: string | null; age: number | null; genre: 'HOMME' | 'FEMME' | null; wilaya: string | null }

const STEPS = ['Commande', 'Article', 'Motif', 'Confirmation']

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center shrink-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
              i < current
                ? 'bg-orange-700 border-orange-700 text-white'
                : i === current
                  ? 'bg-white dark:bg-stone-900 border-orange-700 text-orange-700 shadow-md shadow-orange-100 dark:shadow-orange-900/20'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-400'
            }`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1.5 whitespace-nowrap font-medium ${
              i === current ? 'text-orange-700 dark:text-orange-500' : i < current ? 'text-orange-600 dark:text-orange-600' : 'text-stone-400'
            }`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500 ${i < current ? 'bg-orange-700' : 'bg-stone-200 dark:bg-stone-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function chipLabel(item: OrderItem): string {
  const parts = []
  if (item.variantNom) parts.push(item.variantNom)
  if (item.variantOptionValeur) parts.push(item.variantOptionValeur)
  return parts.join(' / ') || 'Sans variante'
}

function RetourContent({ orderId: preOrderId }: { orderId: string }) {
  const [step,          setStep]          = useState(0)
  const [commandes,     setCommandes]     = useState<Order[]>([])
  const [loading,       setLoading]       = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [profil,        setProfil]        = useState<Profil | null>(null)
  const [submission,    setSubmission]    = useState<{ form: ReturnForm; answers: ReturnAnswer } | null>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)
  const [result,        setResult]        = useState<{ success?: boolean; claimId?: string; status?: string; error?: string } | null>(null)

  const formRef = useRef<FlowmerceReturnFormHandle>(null)

  useEffect(() => {
    fetch('/api/commandes/')
      .then(async r => {
        const data = await r.json()
        if (!r.ok || !Array.isArray(data)) return
        const eligibles = (data as Order[]).filter(c => c.statut !== 'ANNULEE' && !c.retourDemande)
        setCommandes(eligibles)
        const pre = eligibles.find(c => c.id === preOrderId) ?? null
        if (pre) { setSelectedOrder(pre); setStep(1) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [preOrderId])

  // Profil client — sert à préremplir nom/email/téléphone sans les redemander.
  useEffect(() => {
    fetch('/api/profil')
      .then(async r => (r.ok ? r.json() : null))
      .then(setProfil)
      .catch(() => {})
  }, [])

  const selectedItem = selectedOrder?.items.find(i => i.id === selectedItemId) ?? null
  const [formValid, setFormValid] = useState(false)
  // Valeurs déjà connues → masquées dans FlowmerceReturnForm, affichées en
  // lecture seule dans le récapitulatif.
  const prefill: ReturnPrefill = selectedOrder && selectedItem
    ? {
        order_id:         selectedOrder.id,
        order_date:       selectedOrder.createdAt,
        product_name:     selectedItem.product.nom,
        customer_name:    profil ? `${profil.prenom} ${profil.nom}`.trim() : undefined,
        customer_email:   profil?.email ?? undefined,
        customer_phone:   profil?.telephone ?? undefined,
        product_price:    selectedItem.prix,
        order_quantity:   selectedItem.quantite,
        order_total:      selectedOrder.total,
        // Flowmerce n'accepte que ses valeurs d'enum (Cash on Delivery / Card /
        // CCP / Bank Transfer) pour ce champ select — modePaiement est un
        // libellé libre côté Caba Store, d'où la traduction. Si aucune
        // correspondance fiable n'est trouvée, on omet le champ : il n'est
        // jamais requis (source: 'merchant').
        payment_method:   mapPaymentMethod(selectedOrder.modePaiement),
        shipping_method:  selectedOrder.methodeExpedition,
        shipping_cost:    selectedOrder.fraisLivraison,
        product_category: selectedItem.product.category?.nom ?? undefined,
        customer_gender:  profil?.genre === 'HOMME' ? 'Male' : profil?.genre === 'FEMME' ? 'Female' : undefined,
        customer_age:     profil?.age ?? undefined,
        customer_wilaya:  profil?.wilaya ?? undefined,
      }
    : {}

  const handleNext = () => {
    if (step === 2) {
      const res = formRef.current?.validateAndGet()
      if (!res) return
      setSubmission(res)
      setStep(3)
      return
    }
    setStep(s => Math.min(s + 1, 3))
  }

  const handleConfirmSubmit = async () => {
    if (!selectedOrder || !selectedItem || !submission) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/retours/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId: selectedOrder.id, productId: selectedItem.product.id, answers: submission.answers }),
      })
      const data = await res.json().catch(() => ({})) as { claimId?: string; status?: string; error?: string }

      if (!res.ok) {
        setSubmitError(data.error ?? 'Erreur lors de l\u2019envoi de la demande')
        return
      }
      setResult({ success: true, claimId: data.claimId, status: data.status })
    } catch {
      setSubmitError('Erreur réseau, réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result?.success) {
    const statusLabel =
      result.status?.toUpperCase() === 'APPROVED' ? { text: 'Approuvée', color: 'text-green-600 dark:text-green-400' }
      : result.status?.toUpperCase() === 'REJECTED' ? { text: 'Refusée', color: 'text-red-600 dark:text-red-400' }
      : { text: 'En attente de traitement', color: 'text-amber-600 dark:text-amber-400' }
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-green-50 dark:bg-green-950 rounded-2xl p-8 border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">Demande enregistrée</h2>
          <div className="bg-white dark:bg-stone-900 rounded-xl p-3 mb-4 border border-green-100 dark:border-green-900 space-y-1">
            <p className="text-xs text-stone-500">Statut</p>
            <p className={`font-bold ${statusLabel.color}`}>{statusLabel.text}</p>
            {result.claimId && <p className="text-xs font-mono text-stone-400">Réf. {result.claimId}</p>}
          </div>
          <Link href="/mes-commandes" className="inline-block px-6 py-2.5 bg-orange-700 text-white text-sm font-semibold rounded-xl hover:bg-orange-800 transition">← Mes commandes</Link>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center text-stone-400">
      <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin mx-auto mb-3" />
      Chargement…
    </div>
  )

  if (commandes.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <Package className="w-16 h-16 mx-auto mb-4 text-stone-300 dark:text-stone-600" />
      <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">Aucune commande éligible</h2>
      <p className="text-sm text-stone-500 mb-6">Les retours sont soumis à la politique de Flowmerce.</p>
      <Link href="/mes-commandes" className="text-orange-700 dark:text-orange-500 text-sm font-medium hover:underline">← Mes commandes</Link>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/mes-commandes" className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 flex items-center gap-1 mb-4">← Retour</Link>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Demande de retour</h1>
      </div>

      <Stepper current={step} />

      {/* Étape 0 — Choisir la commande */}
      {step === 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-5">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-4">Quelle commande souhaitez-vous retourner ?</p>
          <div className="space-y-2">
            {commandes.map(c => (
              <label key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedOrder?.id === c.id ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60' : 'border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'}`}>
                <input type="radio" name="order" checked={selectedOrder?.id === c.id} onChange={() => { setSelectedOrder(c); setSelectedItemId(null); setResult(null) }} className="accent-orange-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-100">#{c.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}{c.items.length} article{c.items.length > 1 ? 's' : ''}
                    {' · '}{c.total.toFixed(2)} DA
                  </p>
                </div>
                <span className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium shrink-0">{c.statut}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Étape 1 — Sélection d'un article */}
      {step === 1 && selectedOrder && (
        <div className="space-y-3">
          <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900 rounded-xl px-4 py-2.5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-700 dark:text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700 dark:text-orange-500 leading-relaxed">Sélectionnez l&apos;article à retourner. Une seule demande par commande est possible.</p>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden">
            {selectedOrder.items.map((item, idx) => {
              const isSelected = selectedItemId === item.id
              const label      = chipLabel(item)
              const image      = item.product.images?.[0] ?? null
              return (
                <label key={item.id} className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all ${idx < selectedOrder.items.length - 1 ? 'border-b border-stone-100 dark:border-stone-800' : ''} ${isSelected ? 'bg-orange-50 dark:bg-orange-950/30' : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-orange-700 bg-orange-700 dark:border-orange-500 dark:bg-orange-600' : 'border-stone-300 dark:border-stone-600'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <input type="radio" name="item" checked={isSelected} onChange={() => setSelectedItemId(item.id)} className="sr-only" />
                  <div className="relative w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    {image ? <Image src={image} alt={item.product.nom} fill sizes="48px" className="object-cover" /> : <Package className="w-5 h-5 text-stone-300 dark:text-stone-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug line-clamp-1 ${isSelected ? 'text-orange-700 dark:text-orange-400' : 'text-stone-800 dark:text-stone-100'}`}>{item.product.nom}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{label}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isSelected ? 'text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-200'}`}>{item.prix.toFixed(2)} DA</p>
                    <p className="text-[11px] text-stone-400">Qté commandée : {item.quantite}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Étape 2 — Formulaire dynamique Flowmerce (2-3 champs visibles seulement) */}
      {step === 2 && selectedOrder && selectedItem && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-5">
          <FlowmerceReturnForm ref={formRef} prefill={prefill} onValidityChange={setFormValid} />
       </div>
      )}

      {/* Étape 3 — Confirmation : récapitulatif complet */}
      {step === 3 && submission && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-5">
          <ReturnConfirmation form={submission.form} answers={submission.answers} error={submitError} />
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={submitting} className="flex-1 border-2 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-sm font-semibold py-3.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition disabled:opacity-40">
            ← Précédent
          </button>
        )}
        {step < 3 && (
          <button
            type="button"
            onClick={handleNext}
            disabled={step === 0 ? !selectedOrder : step === 1 ? !selectedItemId : step === 2 ? !formValid : false}
            className="flex-1 bg-orange-700 hover:bg-orange-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            Suivant →
          </button>
        )}
        {step === 3 && (
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={submitting}
            className="flex-1 bg-orange-700 hover:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</> : <><Send className="w-4 h-4" /> Confirmer et envoyer</>}
          </button>
        )}
      </div>
    </div>
  )
}

export default function ClientRetourView({ orderId }: { orderId: string }) {
  return <RetourContent orderId={orderId} />
}
