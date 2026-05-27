'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Check, CheckCircle2, ClipboardList, CreditCard, MapPin,
  Package, ShoppingBag, ShoppingCart, Smartphone, Truck,
  ChevronRight, TrendingDown, Ruler,
  Banknote, Landmark, ArrowLeftRight, Lock,
} from 'lucide-react'

/* ── Types ── */
type PrixTier = { minQte: number; maxQte: number | null; prix: number }
type VariantOption = { id: string; valeur: string; stock: number }
type Variant = { id: string; nom: string; couleur: string | null; stock: number; images: string[] }

type CartItem = {
  id: string
  quantite: number
  variant: Variant | null
  variantOption: VariantOption | null
  product: {
    id: string
    nom: string
    prix: number
    prixVariables: PrixTier[] | null
    images: string[]
    typeOption: string | null
  }
}

type Cart = { id: string; items: CartItem[] }

/* ── Helper prix dégressif ── */
function getPrixUnitaire(product: CartItem['product'], quantite: number): number {
  if (!product.prixVariables?.length) return product.prix
  const sorted = [...product.prixVariables].sort((a, b) => b.minQte - a.minQte)
  for (const t of sorted) { if (quantite >= t.minQte) return t.prix }
  return product.prix
}

/* ── Modes de paiement avec icônes Lucide ── */
const MODES_PAIEMENT = [
  {
    label:     'Paiement à la livraison',
    icon:      Banknote,
    disabled:  false,
    subtitle:  'Payez en espèces à la réception',
  },
  {
    label:     'CCP',
    icon:      Landmark,
    disabled:  true,
    subtitle:  'Prochainement disponible',
  },
  {
    label:     'Dahabia',
    icon:      CreditCard,
    disabled:  true,
    subtitle:  'Prochainement disponible',
  },
  {
    label:     'Virement bancaire',
    icon:      ArrowLeftRight,
    disabled:  true,
    subtitle:  'Prochainement disponible',
  },
  {
    label:     'BaridiMob',
    icon:      Smartphone,
    disabled:  true,
    subtitle:  'Prochainement disponible',
  },
]

const METHODES_EXPEDITION = [
  { label: 'Livraison standard',      frais: 700,  delai: '3–5 jours' },
  { label: 'Livraison express',       frais: 1200, delai: '1–2 jours' },
  { label: 'Retrait en point relais', frais: 400,  delai: '2–4 jours' },
]

export default function NouvelleCommandePage() {
  const router = useRouter()
  const [panier,     setPanier]     = useState<Cart | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [showModal,  setShowModal]  = useState(false)

  const [adresse,           setAdresse]           = useState('')
  const [modePaiement,      setModePaiement]       = useState(MODES_PAIEMENT[0].label)
  const [methodeExpedition, setMethodeExpedition]  = useState(METHODES_EXPEDITION[0].label)

  const [telephone,    setTelephone]    = useState('')
  const [hasTelephone, setHasTelephone] = useState(true)
  const [savingTel,    setSavingTel]    = useState(false)
  const [telError,     setTelError]     = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/panier').then(r => r.json()),
      fetch('/api/profil').then(r => r.json()),
    ]).then(([panierData, profilData]) => {
        setPanier(panierData)
        setHasTelephone(!!profilData.telephone)
        if (profilData.adresse) setAdresse(profilData.adresse)
        setLoading(false)
      })
  }, [])

  const selectedExpedition = METHODES_EXPEDITION.find(m => m.label === methodeExpedition) ?? METHODES_EXPEDITION[0]

  const qteParProduit = new Map<string, number>()
  for (const item of panier?.items ?? []) {
    qteParProduit.set(item.product.id, (qteParProduit.get(item.product.id) ?? 0) + item.quantite)
  }

  const lignesCalc = (panier?.items ?? []).map(item => {
    const prixUnit  = getPrixUnitaire(item.product, qteParProduit.get(item.product.id) ?? item.quantite)
    const prixBase  = item.product.prix
    const estReduit = prixUnit < prixBase
    return {
      item, prixUnit, prixBase, estReduit,
      sousLigne: prixUnit * item.quantite,
      economie:  estReduit ? (prixBase - prixUnit) * item.quantite : 0,
    }
  })
  const sousTotal      = lignesCalc.reduce((s, l) => s + l.sousLigne, 0)
  const totalEconomies = lignesCalc.reduce((s, l) => s + l.economie, 0)
  const fraisLivraison = selectedExpedition.frais
  const total          = sousTotal + fraisLivraison

  const handleSaveTelephone = async () => {
    setTelError('')
    if (!/^(05|06|07)[0-9]{8}$/.test(telephone.replace(/\s/g, ''))) {
      setTelError('Format invalide. Ex: 05XX XX XX XX'); return
    }
    setSavingTel(true)
    try {
      const res  = await fetch('/api/profil', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: telephone.replace(/\s/g, '') }),
      })
      const data = await res.json()
      if (!res.ok) { setTelError(data.error); return }
      setHasTelephone(true)
    } catch { setTelError('Erreur serveur') } finally { setSavingTel(false) }
  }

  const handleConfirmer = async () => {
    setError(''); setSubmitting(true); setShowModal(false)
    try {
      const res = await fetch('/api/commandes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adresse, modePaiement, methodeExpedition, fraisLivraison }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/commandes?success=true')
    } catch { setError('Erreur serveur, veuillez réessayer') } finally { setSubmitting(false) }
  }

  const inputCls = 'w-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 transition'
  const labelCls = 'block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-1.5'

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-stone-500 dark:text-stone-400 text-sm">Chargement…</p>
    </div>
  )

  if (!panier || panier.items.length === 0) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ShoppingCart className="w-10 h-10 text-stone-400 dark:text-stone-500" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-100 mb-2">Panier vide</h1>
      <Link href="/produits" className="inline-block mt-4 bg-orange-700 hover:bg-orange-800 text-white px-8 py-3 rounded-xl font-semibold transition-colors">
        Voir les produits
      </Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
        <ShoppingBag className="w-6 h-6 text-orange-700" /> Passer la commande
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ══ FORMULAIRE (col 3) ══ */}
        <div className="lg:col-span-3 space-y-4">

          {/* Téléphone manquant */}
          {!hasTelephone && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Numéro de téléphone requis</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Nécessaire pour le suivi de votre livraison.</p>
                </div>
              </div>
              <input type="tel" value={telephone}
                onChange={e => { setTelephone(e.target.value); setTelError('') }}
                placeholder="05XX XX XX XX"
                className="w-full border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2"
              />
              {telError && <p className="text-xs text-red-500 mb-2">{telError}</p>}
              <button onClick={handleSaveTelephone} disabled={savingTel || !telephone}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                {savingTel ? 'Enregistrement…' : <><Check className="w-4 h-4" /> Enregistrer</>}
              </button>
            </div>
          )}

          {/* Formulaire principal */}
          <div className={`bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-5 space-y-5 ${!hasTelephone ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            <h2 className="font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-orange-700" /> Détails de la commande
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Adresse */}
            <div>
              <label className={labelCls}><MapPin className="w-4 h-4 inline mr-1 text-orange-700" /> Adresse de livraison *</label>
              <textarea value={adresse} onChange={e => setAdresse(e.target.value)}
                required rows={3} placeholder="Numéro, rue, cité, commune, wilaya…"
                className={inputCls} />
            </div>

            {/* ── Mode de paiement ── */}
            <div>
              <label className={labelCls}>
                <CreditCard className="w-4 h-4 inline mr-1 text-orange-700" /> Mode de paiement *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MODES_PAIEMENT.map(m => {
                  const Icon      = m.icon
                  const isActive  = modePaiement === m.label
                  const isDisabled = m.disabled

                  return (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => !isDisabled && setModePaiement(m.label)}
                      disabled={isDisabled}
                      title={isDisabled ? m.subtitle : undefined}
                      className={`
                        relative flex flex-col items-start gap-1.5 px-3 py-3 rounded-xl border-2 text-left
                        transition-all duration-200
                        ${isDisabled
                          ? 'border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 opacity-50 cursor-not-allowed'
                          : isActive
                            ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60 shadow-sm shadow-orange-100 dark:shadow-orange-900'
                            : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-900'
                        }
                      `}
                    >
                      {/* Icône + badge lock */}
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDisabled
                            ? 'bg-stone-100 dark:bg-stone-800'
                            : isActive
                              ? 'bg-orange-100 dark:bg-orange-900'
                              : 'bg-stone-100 dark:bg-stone-800'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            isDisabled
                              ? 'text-stone-400 dark:text-stone-600'
                              : isActive
                                ? 'text-orange-700 dark:text-orange-400'
                                : 'text-stone-500 dark:text-stone-400'
                          }`} />
                        </div>
                        {isDisabled
                          ? <Lock className="w-3 h-3 text-stone-400 dark:text-stone-600 shrink-0" />
                          : isActive
                            ? <Check className="w-3.5 h-3.5 text-orange-700 shrink-0" />
                            : null
                        }
                      </div>

                      {/* Label — toujours lisible, pas de truncate */}
                      <div>
                        <p className={`text-xs font-semibold leading-tight ${
                          isDisabled
                            ? 'text-stone-400 dark:text-stone-600'
                            : isActive
                              ? 'text-orange-700 dark:text-orange-400'
                              : 'text-stone-700 dark:text-stone-300'
                        }`}>
                          {m.label}
                        </p>
                        {isDisabled && (
                          <p className="text-[10px] text-stone-400 dark:text-stone-600 mt-0.5 leading-tight">
                            Bientôt disponible
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Méthode expédition */}
            <div>
              <label className={labelCls}><Truck className="w-4 h-4 inline mr-1 text-orange-700" /> Méthode d&apos;expédition *</label>
              <div className="space-y-2">
                {METHODES_EXPEDITION.map(opt => (
                  <button key={opt.label} type="button" onClick={() => setMethodeExpedition(opt.label)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                      methodeExpedition === opt.label
                        ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60'
                        : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                    }`}>
                    <div className="flex items-center gap-3 text-left">
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        methodeExpedition === opt.label ? 'border-orange-700' : 'border-stone-300 dark:border-stone-600'
                      }`}>
                        {methodeExpedition === opt.label && <div className="w-2 h-2 rounded-full bg-orange-700" />}
                      </div>
                      <div>
                        <p className={`font-medium ${methodeExpedition === opt.label ? 'text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-300'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-stone-400">{opt.delai}</p>
                      </div>
                    </div>
                    <span className={`font-bold shrink-0 ${methodeExpedition === opt.label ? 'text-orange-700 dark:text-orange-400' : 'text-stone-500 dark:text-stone-400'}`}>
                      {opt.frais} DA
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={() => adresse ? setShowModal(true) : null}
              disabled={submitting || !hasTelephone || !adresse}
              className="w-full bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-2">
              {submitting ? 'Traitement…' : `Confirmer — ${total.toFixed(2)} DA`}
            </button>

            <Link href="/panier" className="block text-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm transition">
              ← Retour au panier
            </Link>
          </div>
        </div>

        {/* ══ RÉSUMÉ (col 2) ══ */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-5 lg:sticky lg:top-20 space-y-4">
            <h2 className="font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-700" />
              Résumé ({panier.items.length} article{panier.items.length > 1 ? 's' : ''})
            </h2>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {lignesCalc.map(({ item, prixUnit, prixBase, estReduit, sousLigne }) => {
                const typeOpt = item.product.typeOption || 'Taille'
                const img = item.variant?.images?.[0] ?? item.product.images?.[0]
                return (
                  <div key={item.id} className="flex gap-2.5 items-start">
                    <div className="w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden shrink-0">
                      {img ? <Image src={img} alt={item.product.nom} width={40} height={40} className="w-full h-full object-cover" />
                           : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-stone-400" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-700 dark:text-stone-300 line-clamp-1">{item.product.nom}</p>
                      {(item.variant || item.variantOption) && (
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {item.variant?.couleur && (
                            <span className="w-2.5 h-2.5 rounded-full border border-stone-300 shrink-0 inline-block"
                              style={{ backgroundColor: item.variant.couleur }} />
                          )}
                          {item.variant && <span className="text-[10px] text-stone-400">{item.variant.nom}</span>}
                          {item.variantOption && (
                            <>
                              <ChevronRight className="w-2.5 h-2.5 text-stone-300 shrink-0" />
                              <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                                <Ruler className="w-2.5 h-2.5" />{typeOpt} {item.variantOption.valeur}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-stone-400">×{item.quantite}</span>
                        {estReduit ? (
                          <>
                            <span className="text-xs font-semibold text-green-700 dark:text-green-400">{prixUnit.toFixed(2)} DA/u.</span>
                            <span className="text-[10px] text-stone-400 line-through">{prixBase.toFixed(2)}</span>
                            <span className="text-[10px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 px-1 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                              <TrendingDown className="w-2.5 h-2.5" />−{Math.round((1 - prixUnit / prixBase) * 100)}%
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-stone-500 dark:text-stone-400">{prixUnit.toFixed(2)} DA/u.</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200 shrink-0">
                      {sousLigne.toFixed(2)} DA
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-stone-100 dark:border-stone-800 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400">
                <span>Sous-total</span><span>{sousTotal.toFixed(2)} DA</span>
              </div>
              {totalEconomies > 0 && (
                <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                  <span className="flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5" /> Économies</span>
                  <span>−{totalEconomies.toFixed(2)} DA</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400">
                <span>Livraison ({selectedExpedition.label})</span>
                <span>{fraisLivraison} DA</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-stone-100 dark:border-stone-800">
                <span className="text-stone-800 dark:text-stone-100">Total</span>
                <span className="text-orange-700 dark:text-orange-500">{total.toFixed(2)} DA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MODAL CONFIRMATION ══ */}
      {showModal && (
        <div
          className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/50 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="
            bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl
            shadow-2xl border border-stone-100 dark:border-stone-800
            w-full max-w-md
            max-h-[calc(100dvh-5rem)] sm:max-h-[90vh]
            overflow-y-auto
            pb-[calc(1.5rem+env(safe-area-inset-bottom))]
            sm:pb-6
          ">
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-stone-700" />
            </div>

            <div className="px-6 pt-4 pb-2">
              {/* Header */}
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-orange-50 dark:bg-orange-950/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-7 h-7 text-orange-700 dark:text-orange-400" />
                </div>
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Confirmer la commande ?</h2>
                <p className="text-stone-400 text-sm mt-1">Vérifiez les détails avant de valider</p>
              </div>

              {/* Détails */}
              <div className="space-y-2 mb-4">
                <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
                  <p className="text-xs text-stone-400 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Adresse
                  </p>
                  <p className="text-sm text-stone-800 dark:text-stone-200">{adresse}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
                    <p className="text-xs text-stone-400 mb-1 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" /> Paiement
                    </p>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200 leading-snug">{modePaiement}</p>
                  </div>
                  <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
                    <p className="text-xs text-stone-400 mb-1 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Livraison
                    </p>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200 leading-snug">{methodeExpedition}</p>
                  </div>
                </div>
              </div>

              {/* Totaux */}
              <div className="border-t border-stone-100 dark:border-stone-800 pt-3 space-y-1.5 mb-5">
                <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400">
                  <span>Sous-total</span><span>{sousTotal.toFixed(2)} DA</span>
                </div>
                {totalEconomies > 0 && (
                  <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
                    <span>Économies</span><span>−{totalEconomies.toFixed(2)} DA</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-stone-500 dark:text-stone-400">
                  <span>Livraison</span><span>{fraisLivraison} DA</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-stone-100 dark:border-stone-800 pt-2">
                  <span className="text-stone-800 dark:text-stone-100">Total</span>
                  <span className="text-orange-700 dark:text-orange-500">{total.toFixed(2)} DA</span>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 border-2 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-semibold py-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 transition">
                  Annuler
                </button>
                <button onClick={handleConfirmer} disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-700 hover:bg-orange-800 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
                  {submitting ? 'En cours…' : <><CheckCircle2 className="w-5 h-5" /> Confirmer</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
