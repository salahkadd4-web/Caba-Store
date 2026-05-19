'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Banknote, Check, CheckCircle2, Loader2, Package,
  RefreshCw, Wrench, XCircle, AlertCircle, Info,
} from 'lucide-react'

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
type OrderItem = {
  id: string
  quantite: number
  prix: number
  variantNom: string | null
  variantOptionValeur: string | null
  product: {
    id: string
    nom: string
    images: string[]
    category?: { nom: string }
  }
}

type Order = {
  id: string
  statut: string
  total: number
  createdAt: string
  retourDemande: boolean
  items: OrderItem[]
}

/* ══════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════ */
const REASONS = [
  { label: 'Produit défectueux',          icon: '⚠️' },
  { label: 'Produit contrefait',           icon: '🚫' },
  { label: 'Produit endommagé livraison',  icon: '📦' },
  { label: "Changement d'avis",            icon: '🔄' },
  { label: 'Panne après utilisation',     icon: '🔧' },
  { label: 'Mauvaise taille',             icon: '📏' },
  { label: 'Allergie/Réaction',           icon: '🩺' },
  { label: 'Ne correspond pas',           icon: '❌' },
  { label: 'Erreur de commande vendeur',  icon: '🏷️' },
  { label: 'Pièces manquantes',           icon: '🔩' },
]

const RESOLUTIONS = [
  { value: 'REFUND',   label: 'Remboursement', icon: Banknote,  desc: 'Recevoir le montant payé'           },
  { value: 'EXCHANGE', label: 'Échange',        icon: RefreshCw, desc: 'Recevoir un produit de remplacement' },
  { value: 'REPAIR',   label: 'Réparation',     icon: Wrench,    desc: 'Faire réparer le produit'            },
]

const STEPS = ['Commande', 'Article', 'Motif', 'Confirmation']

/* ══════════════════════════════════════════
   STEPPER
══════════════════════════════════════════ */
function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center shrink-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
              i < current   ? 'bg-indigo-600 border-indigo-600 text-white'
              : i === current ? 'bg-white dark:bg-gray-900 border-indigo-600 text-indigo-600 shadow-md shadow-indigo-100 dark:shadow-indigo-900'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400'
            }`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1.5 whitespace-nowrap font-medium ${
              i === current ? 'text-indigo-600 dark:text-indigo-400'
              : i < current ? 'text-indigo-400 dark:text-indigo-500'
              : 'text-gray-400'
            }`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500 ${
              i < current ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════
   LIBELLÉ VARIANTE
══════════════════════════════════════════ */
function chipLabel(item: OrderItem): string {
  const parts = []
  if (item.variantNom)          parts.push(item.variantNom)
  if (item.variantOptionValeur) parts.push(item.variantOptionValeur)
  return parts.join(' / ') || 'Sans variante'
}

/* ══════════════════════════════════════════
   CONTENU PRINCIPAL
══════════════════════════════════════════ */
function RetourContent() {
  const searchParams = useSearchParams()
  const preOrderId   = searchParams.get('orderId') ?? ''

  const [step,          setStep]          = useState(0)
  const [commandes,     setCommandes]     = useState<Order[]>([])
  const [loading,       setLoading]       = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  /* Étape 1 — un seul item sélectionné */
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  /* Étape 2 */
  const [reason,       setReason]       = useState('')
  const [resolution,   setResolution]   = useState<'REFUND' | 'EXCHANGE' | 'REPAIR'>('REFUND')
  const [description,  setDescription]  = useState('')

  /* Envoi */
  const [submitting, setSubmitting] = useState(false)
  const [result,     setResult]     = useState<{
    success?: boolean; message?: string; claimId?: string
    processingDays?: number; error?: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/commandes')
      .then(r => r.json())
      .then((data: Order[]) => {
        const livrees = data.filter(c => c.statut === 'LIVREE' && !c.retourDemande)
        setCommandes(livrees)
        const pre = livrees.find(c => c.id === preOrderId) ?? null
        if (pre) { setSelectedOrder(pre); setStep(1) }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [preOrderId])

  /* Item actuellement sélectionné */
  const selectedItem = selectedOrder?.items.find(i => i.id === selectedItemId) ?? null

  /* Construire le payload API */
  const buildApiPayload = () => {
    if (!selectedItem) return { productName: '', description: '' }
    const label = chipLabel(selectedItem)
    const detail = `${selectedItem.product.nom}${label !== 'Sans variante' ? ` (${label})` : ''} ×1`
    const productName = selectedItem.product.nom
    const finalDesc   = description
      ? `${description}\n\nArticle retourné : ${detail}`
      : `Article retourné : ${detail}`
    return { productName, description: finalDesc }
  }

  const handleSubmit = async () => {
    if (!selectedOrder || !selectedItem || !reason) return
    setSubmitting(true)
    const { productName, description: desc } = buildApiPayload()
    try {
      const res = await fetch('/api/retours/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId:           selectedOrder.id,
          productName,
          reason,
          desiredResolution: resolution,
          description:       desc,
        }),
      })
      const data = await res.json()
      setResult(res.ok ? { success: true, ...data } : { error: data.error })
    } catch {
      setResult({ error: 'Erreur réseau, réessayez.' })
    } finally {
      setSubmitting(false)
    }
  }

  /* Validation par étape */
  const canNext = [
    !!selectedOrder,
    !!selectedItemId,
    !!reason,
  ][step] ?? true

  const next = () => setStep(s => Math.min(s + 1, 3))
  const prev = () => setStep(s => Math.max(s - 1, 0))

  /* ── États terminaux ── */
  if (result?.success) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-green-50 dark:bg-green-950 rounded-2xl p-8 border border-green-200 dark:border-green-800">
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">Demande enregistrée</h2>
        <p className="text-sm text-green-700 dark:text-green-400 mb-4">{result.message}</p>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 mb-4 border border-green-100 dark:border-green-900 space-y-1">
          <p className="text-xs text-gray-500">Statut</p>
          <p className="font-bold text-amber-600 dark:text-amber-400">En attente de traitement</p>
          {result.processingDays && (
            <p className="text-xs text-gray-400">Délai estimé : {result.processingDays} jours ouvrés</p>
          )}
          {result.claimId && (
            <p className="text-xs font-mono text-gray-400">Réf. {result.claimId}</p>
          )}
        </div>
        <Link href="/commandes"
          className="inline-block px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition">
          ← Mes commandes
        </Link>
      </div>
    </div>
  )

  if (result?.error) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-red-50 dark:bg-red-950 rounded-2xl p-8 border border-red-200 dark:border-red-800">
        <XCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">Erreur</h2>
        <p className="text-sm text-red-700 dark:text-red-400 mb-6">{result.error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setResult(null)}
            className="px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-80 transition">
            Réessayer
          </button>
          <Link href="/commandes"
            className="px-5 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Mes commandes
          </Link>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center text-gray-400">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
      Chargement…
    </div>
  )

  if (commandes.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <Package className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Aucune commande livrée</h2>
      <p className="text-sm text-gray-500 mb-6">Les retours sont disponibles uniquement pour les commandes livrées.</p>
      <Link href="/commandes" className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">
        ← Mes commandes
      </Link>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-10">

      <div className="mb-6">
        <Link href="/commandes"
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 mb-4">
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Demande de retour</h1>
      </div>

      <Stepper current={step} />

      {/* ══ ÉTAPE 0 — Choisir la commande ══ */}
      {step === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Quelle commande souhaitez-vous retourner ?
          </p>
          <div className="space-y-2">
            {commandes.map(c => (
              <label key={c.id}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedOrder?.id === c.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60'
                    : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                }`}>
                <input type="radio" name="order" checked={selectedOrder?.id === c.id}
                  onChange={() => {
                    setSelectedOrder(c)
                    setSelectedItemId(null)
                    setReason('')
                    setResolution('REFUND')
                  }}
                  className="accent-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                    #{c.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                    {' · '}{c.items.length} article{c.items.length > 1 ? 's' : ''}
                    {' · '}{c.total.toFixed(2)} DA
                  </p>
                </div>
                <span className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Livrée
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ══ ÉTAPE 1 — Sélection d'UN article ══ */}
      {step === 1 && selectedOrder && (
        <div className="space-y-3">

          {/* Hint */}
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl px-4 py-2.5 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
              Sélectionnez l&apos;article que vous souhaitez retourner. Une seule demande par article est possible.
            </p>
          </div>

          {/* Liste des articles — radio */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {selectedOrder.items.map((item, idx) => {
              const isSelected = selectedItemId === item.id
              const label      = chipLabel(item)
              const image      = item.product.images?.[0] ?? null

              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all ${
                    idx < selectedOrder.items.length - 1
                      ? 'border-b border-gray-100 dark:border-gray-800'
                      : ''
                  } ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {/* Radio visuel */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <input
                    type="radio"
                    name="item"
                    checked={isSelected}
                    onChange={() => setSelectedItemId(item.id)}
                    className="sr-only"
                  />

                  {/* Image produit */}
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    {image
                      ? <img src={image} alt={item.product.nom} className="w-full h-full object-cover" />
                      : <Package className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                    }
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-snug line-clamp-1 ${
                      isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100'
                    }`}>
                      {item.product.nom}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>

                  {/* Prix — quantité fixe 1 */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${
                      isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'
                    }`}>
                      {item.prix.toFixed(2)} DA
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Qté commandée : {item.quantite}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>

          {/* Badge article sélectionné */}
          {selectedItem && (
            <div className="flex items-center gap-2.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3">
              <Check className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                  {selectedItem.product.nom}
                  {chipLabel(selectedItem) !== 'Sans variante' && (
                    <span className="font-normal ml-1 text-indigo-500 dark:text-indigo-400">
                      · {chipLabel(selectedItem)}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-indigo-500 dark:text-indigo-500 mt-0.5">
                  Quantité retournée : 1
                </p>
              </div>
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                {selectedItem.prix.toFixed(2)} DA
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══ ÉTAPE 2 — Motif + résolution ══ */}
      {step === 2 && (
        <div className="space-y-4">

          {/* Motif */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Motif du retour</p>
            <div className="grid grid-cols-2 gap-2">
              {REASONS.map(r => (
                <label key={r.label}
                  className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm transition-all ${
                    reason === r.label
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}>
                  <input type="radio" name="reason" checked={reason === r.label}
                    onChange={() => setReason(r.label)} className="sr-only" />
                  <span className="text-base shrink-0 mt-0.5">{r.icon}</span>
                  <span className="leading-tight">{r.label}</span>
                  {reason === r.label && <Check className="w-3.5 h-3.5 ml-auto shrink-0 text-indigo-500 mt-0.5" />}
                </label>
              ))}
            </div>
            {!reason && (
              <p className="text-xs text-orange-500 dark:text-orange-400 flex items-center gap-1 mt-2">
                <AlertCircle className="w-3.5 h-3.5" /> Sélectionnez un motif pour continuer
              </p>
            )}
          </div>

          {/* Résolution */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Résolution souhaitée</p>
            <div className="grid grid-cols-3 gap-3">
              {RESOLUTIONS.map(res => {
                const Icon = res.icon
                return (
                  <label key={res.value}
                    className={`flex flex-col items-center text-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      resolution === res.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 shadow-sm shadow-indigo-100 dark:shadow-indigo-900'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}>
                    <input type="radio" name="resolution" checked={resolution === res.value}
                      onChange={() => setResolution(res.value as typeof resolution)} className="sr-only" />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all ${
                      resolution === res.value ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <Icon className={`w-5 h-5 ${resolution === res.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`} />
                    </div>
                    <span className={`text-xs font-bold ${resolution === res.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
                      {res.label}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5 leading-tight">{res.desc}</span>
                    {resolution === res.value && <Check className="w-3.5 h-3.5 text-indigo-500 mt-1.5" />}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Détails <span className="font-normal text-gray-400">(optionnel)</span>
            </p>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              maxLength={1000} rows={3} placeholder="Décrivez le problème en détails…"
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition" />
            <p className="text-[10px] text-gray-400 mt-1">{description.length}/1000</p>
          </div>
        </div>
      )}

      {/* ══ ÉTAPE 3 — Récapitulatif ══ */}
      {step === 3 && selectedOrder && selectedItem && (
        <div className="space-y-4">

          {/* Article sélectionné */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Article à retourner</p>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                {selectedItem.product.images?.[0]
                  ? <img src={selectedItem.product.images[0]} alt="" className="w-full h-full object-cover" />
                  : <Package className="w-6 h-6 text-gray-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-1">
                  {selectedItem.product.nom}
                </p>
                {chipLabel(selectedItem) !== 'Sans variante' && (
                  <p className="text-xs text-gray-500 mt-0.5">{chipLabel(selectedItem)}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Quantité retournée : 1</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                  {selectedItem.prix.toFixed(2)} DA
                </p>
                <p className="text-[10px] text-gray-400">potentiel</p>
              </div>
            </div>
          </div>

          {/* Infos récap */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            {[
              ['Commande',   `#${selectedOrder.id.slice(-8).toUpperCase()}`],
              ['Motif',      reason],
              ['Résolution', RESOLUTIONS.find(r => r.value === resolution)?.label ?? resolution],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="text-xs text-gray-400 shrink-0">{k}</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 text-right ml-4">{v}</span>
              </div>
            ))}
            {description && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mt-2">
                <p className="text-xs text-gray-400 mb-1">Détails</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{description}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Vous recevrez une notification dès qu&apos;une décision est rendue.
          </p>
        </div>
      )}

      {/* ══ NAVIGATION ══ */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button type="button" onClick={prev}
            className="flex-1 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold py-3.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            ← Précédent
          </button>
        )}
        {step < 3 && (
          <button type="button" onClick={next} disabled={!canNext}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
            Suivant →
          </button>
        )}
        {step === 3 && (
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
              : '↩ Confirmer le retour'
            }
          </button>
        )}
      </div>
    </div>
  )
}

export default function RetourPage() {
  return (
    <Suspense fallback={
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
        Chargement…
      </div>
    }>
      <RetourContent />
    </Suspense>
  )
}