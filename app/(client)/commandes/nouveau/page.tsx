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
  Store,
} from 'lucide-react'
import { getPrixUnitaire as getPrixUnitaireLib } from '@/lib/prix'
import { FRAIS_EXPEDITION } from '@/lib/constants'
import VendeurButton from '@/components/client/VendeurButton'

/* ── Types ── */
type VariantOption = { id: string; valeur: string; stock: number }
type Variant = { id: string; nom: string; couleur: string | null; stock: number; images: string[] }

type VendeurInfo = {
  id: string
  nomBoutique: string | null
  user: {
    nom: string | null; prenom: string | null
    telephone: string | null; email: string | null; wilaya: string | null
  }
} | null

type CartItem = {
  id: string
  quantite: number
  variant: Variant | null
  variantOption: VariantOption | null
  product: {
    id: string
    nom: string
    prix: number
    prixVariables: unknown
    images: string[]
    typeOption: string | null
    vendeur: VendeurInfo
  }
}

type Cart = { id: string; items: CartItem[] }

type VendeurGroup = {
  vendeurId:   string | null
  vendeurInfo: VendeurInfo
  items:       CartItem[]
}

/* ── Helper prix ── */
function getPrixUnitaire(product: CartItem['product'], quantite: number): number {
  return getPrixUnitaireLib(product.prixVariables, quantite, product.prix)
}

/* ── Grouper les items par vendeur ── */
function groupByVendeur(items: CartItem[]): VendeurGroup[] {
  const map = new Map<string, VendeurGroup>()
  for (const item of items) {
    const key = item.product.vendeur?.id ?? '__admin__'
    if (!map.has(key)) {
      map.set(key, {
        vendeurId:   item.product.vendeur?.id ?? null,
        vendeurInfo: item.product.vendeur,
        items:       [],
      })
    }
    map.get(key)!.items.push(item)
  }
  return [...map.values()]
}

/* ── Modes de paiement ── */
const MODES_PAIEMENT = [
  { label: 'Paiement à la livraison', icon: Banknote,       disabled: false, subtitle: 'Payez en espèces à la réception' },
  { label: 'CCP',                      icon: Landmark,       disabled: true,  subtitle: 'Prochainement disponible' },
  { label: 'Dahabia',                  icon: CreditCard,     disabled: true,  subtitle: 'Prochainement disponible' },
  { label: 'Virement bancaire',        icon: ArrowLeftRight, disabled: true,  subtitle: 'Prochainement disponible' },
  { label: 'BaridiMob',               icon: Smartphone,     disabled: true,  subtitle: 'Prochainement disponible' },
]

const METHODES_EXPEDITION = [
  { label: 'Livraison standard',      frais: FRAIS_EXPEDITION['Livraison standard'],      delai: '3–5 jours' },
  { label: 'Livraison express',       frais: FRAIS_EXPEDITION['Livraison express'],        delai: '1–2 jours' },
  { label: 'Retrait en point relais', frais: FRAIS_EXPEDITION['Retrait en point relais'],  delai: '2–4 jours' },
]

/* ── Sélecteur d'expédition par vendeur ── */
function ExpeditionSelector({
  vendeurKey,
  selected,
  onChange,
}: {
  vendeurKey: string
  selected:   string
  onChange:   (key: string, methode: string) => void
}) {
  return (
    <div className="space-y-1.5 mt-3">
      {METHODES_EXPEDITION.map(opt => (
        <button key={opt.label} type="button" onClick={() => onChange(vendeurKey, opt.label)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
            selected === opt.label
              ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60'
              : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
          }`}>
          <div className="flex items-center gap-2.5 text-left">
            <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
              selected === opt.label ? 'border-orange-700' : 'border-stone-300 dark:border-stone-600'
            }`}>
              {selected === opt.label && <div className="w-2 h-2 rounded-full bg-orange-700" />}
            </div>
            <div>
              <p className={`font-medium text-xs ${selected === opt.label ? 'text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-300'}`}>
                {opt.label}
              </p>
              <p className="text-[10px] text-stone-400">{opt.delai}</p>
            </div>
          </div>
          <span className={`font-bold text-sm shrink-0 ${selected === opt.label ? 'text-orange-700 dark:text-orange-400' : 'text-stone-500 dark:text-stone-400'}`}>
            {opt.frais} DA
          </span>
        </button>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════
   PAGE PRINCIPALE
════════════════════════════════════════════ */
export default function NouvelleCommandePage() {
  const router = useRouter()
  const [panier,     setPanier]     = useState<Cart | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [showModal,  setShowModal]  = useState(false)

  const [adresse,      setAdresse]      = useState('')
  const [modePaiement, setModePaiement] = useState(MODES_PAIEMENT[0].label)

  // Méthode d'expédition par vendeur (key = vendeurId ou '__admin__')
  const [methodeParVendeur, setMethodeParVendeur] = useState<Record<string, string>>({})

  const [telephone,    setTelephone]    = useState('')
  const [hasTelephone, setHasTelephone] = useState(true)
  const [savingTel,    setSavingTel]    = useState(false)
  const [telError,     setTelError]     = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/panier').then(r => r.json()),
      fetch('/api/profil').then(r => r.json()),
    ])
      .then(([panierData, profilData]) => {
        setPanier(panierData)
        setHasTelephone(!!profilData.telephone)
        if (profilData.adresse) setAdresse(profilData.adresse)

        // Initialiser la méthode d'expédition par défaut pour chaque vendeur
        const defaultMethode = METHODES_EXPEDITION[0].label
        const groupes = groupByVendeur((panierData as Cart).items ?? [])
        const initial: Record<string, string> = {}
        for (const g of groupes) {
          initial[g.vendeurId ?? '__admin__'] = defaultMethode
        }
        setMethodeParVendeur(initial)
      })
      .catch(() => setError('Impossible de charger le panier. Veuillez réessayer.'))
      .finally(() => setLoading(false))
  }, [])

  const vendeurGroups = panier ? groupByVendeur(panier.items) : []

  // Calcul des sous-totaux par vendeur
  const qteParProduit = new Map<string, number>()
  for (const item of panier?.items ?? []) {
    qteParProduit.set(item.product.id, (qteParProduit.get(item.product.id) ?? 0) + item.quantite)
  }

  type VendeurCalc = {
    vendeurId: string | null
    vendeurInfo: VendeurInfo
    sousTotal: number
    fraisLivraison: number
    totalGroupe: number
    methode: string
    items: CartItem[]
    economies: number
  }

  const vendeurCalcs: VendeurCalc[] = vendeurGroups.map(vg => {
    const key         = vg.vendeurId ?? '__admin__'
    const methode     = methodeParVendeur[key] ?? METHODES_EXPEDITION[0].label
    const frais       = FRAIS_EXPEDITION[methode] ?? FRAIS_EXPEDITION['Livraison standard']
    const sousTotal   = vg.items.reduce((s, item) => {
      const prixU = getPrixUnitaire(item.product, qteParProduit.get(item.product.id) ?? item.quantite)
      return s + prixU * item.quantite
    }, 0)
    const economies   = vg.items.reduce((s, item) => {
      const prixU = getPrixUnitaire(item.product, qteParProduit.get(item.product.id) ?? item.quantite)
      const base  = item.product.prix
      return s + (prixU < base ? (base - prixU) * item.quantite : 0)
    }, 0)
    return { vendeurId: vg.vendeurId, vendeurInfo: vg.vendeurInfo, sousTotal, fraisLivraison: frais, totalGroupe: sousTotal + frais, methode, items: vg.items, economies }
  })

  const sousTotal       = vendeurCalcs.reduce((s, c) => s + c.sousTotal, 0)
  const totalFrais      = vendeurCalcs.reduce((s, c) => s + c.fraisLivraison, 0)
  const totalEconomies  = vendeurCalcs.reduce((s, c) => s + c.economies, 0)
  const total           = sousTotal + totalFrais

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
      const vendeurGroupes = vendeurCalcs.map(c => ({
        vendeurId:        c.vendeurId,
        methodeExpedition: c.methode,
      }))

      const res = await fetch('/api/commandes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adresse, modePaiement, vendeurGroupes }),
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

            {/* Mode de paiement */}
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
                    <button key={m.label} type="button"
                      onClick={() => !isDisabled && setModePaiement(m.label)}
                      disabled={isDisabled}
                      className={`relative flex flex-col items-start gap-1.5 px-3 py-3 rounded-xl border-2 text-left transition-all duration-200 ${
                        isDisabled
                          ? 'border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 opacity-50 cursor-not-allowed'
                          : isActive
                            ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60 shadow-sm shadow-orange-100 dark:shadow-orange-900'
                            : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-900'
                      }`}>
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDisabled ? 'bg-stone-100 dark:bg-stone-800' : isActive ? 'bg-orange-100 dark:bg-orange-900' : 'bg-stone-100 dark:bg-stone-800'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            isDisabled ? 'text-stone-400 dark:text-stone-600' : isActive ? 'text-orange-700 dark:text-orange-400' : 'text-stone-500 dark:text-stone-400'
                          }`} />
                        </div>
                        {isDisabled ? <Lock className="w-3 h-3 text-stone-400 dark:text-stone-600 shrink-0" />
                          : isActive ? <Check className="w-3.5 h-3.5 text-orange-700 shrink-0" /> : null}
                      </div>
                      <div>
                        <p className={`text-xs font-semibold leading-tight ${
                          isDisabled ? 'text-stone-400 dark:text-stone-600' : isActive ? 'text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-300'
                        }`}>{m.label}</p>
                        {isDisabled && <p className="text-[10px] text-stone-400 dark:text-stone-600 mt-0.5 leading-tight">Bientôt disponible</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ══ Livraison par vendeur ══ */}
            <div>
              <label className={labelCls}>
                <Truck className="w-4 h-4 inline mr-1 text-orange-700" /> Expédition par vendeur
                {vendeurCalcs.length > 1 && (
                  <span className="ml-2 text-[10px] font-normal text-stone-400">
                    ({vendeurCalcs.length} vendeurs · livraisons séparées)
                  </span>
                )}
              </label>
              <div className="space-y-4">
                {vendeurCalcs.map((vc, idx) => {
                  const key = vc.vendeurId ?? '__admin__'
                  return (
                    <div key={key} className="border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden">

                      {/* ── Header vendeur : VendeurButton ── */}
                      <div className="px-3 pt-3 pb-2.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/30">
                        {vendeurCalcs.length > 1 && (
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Store className="w-3 h-3" /> Commande {idx + 1} / {vendeurCalcs.length}
                          </p>
                        )}
                        {/* ← VendeurButton : bottom-sheet avec infos et appel */}
                        <VendeurButton produitId={vc.items[0].product.id} />
                      </div>

                      {/* Sélecteur d'expédition */}
                      <div className="px-3 pb-3">
                        <ExpeditionSelector
                          vendeurKey={key}
                          selected={methodeParVendeur[key] ?? METHODES_EXPEDITION[0].label}
                          onChange={(k, m) => setMethodeParVendeur(prev => ({ ...prev, [k]: m }))}
                        />
                        {/* Sous-total de ce groupe */}
                        <div className="flex justify-between items-center mt-3 px-1 text-xs text-stone-500 dark:text-stone-400">
                          <span>Articles ({vc.items.length})</span>
                          <span className="tabular-nums">{vc.sousTotal.toFixed(2)} DA</span>
                        </div>
                        <div className="flex justify-between items-center px-1 text-xs font-semibold text-stone-700 dark:text-stone-300 mt-0.5">
                          <span>Sous-total avec livraison</span>
                          <span className="tabular-nums text-orange-700 dark:text-orange-400">{vc.totalGroupe.toFixed(2)} DA</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
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

            {/* Détails par vendeur */}
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {vendeurCalcs.map(vc => {
                const key = vc.vendeurId ?? '__admin__'
                return (
                  <div key={key}>
                    <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest flex items-center gap-1 mb-2">
                      <Store className="w-3 h-3" />
                      {vc.vendeurInfo?.nomBoutique ?? 'Caba Store'}
                    </p>
                    <div className="space-y-2">
                      {vc.items.map(item => {
                        const prixUnit   = getPrixUnitaire(item.product, qteParProduit.get(item.product.id) ?? item.quantite)
                        const prixBase   = item.product.prix
                        const estReduit  = prixUnit < prixBase
                        const sousLigne  = prixUnit * item.quantite
                        const typeOpt    = item.product.typeOption || 'Taille'
                        const img        = item.variant?.images?.[0] ?? item.product.images?.[0]
                        return (
                          <div key={item.id} className="flex gap-2.5 items-start">
                            <div className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-lg overflow-hidden shrink-0">
                              {img ? <Image src={img} alt={item.product.nom} width={36} height={36} className="w-full h-full object-cover" />
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
                    {/* Frais de ce vendeur */}
                    <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex justify-between text-xs text-stone-400">
                        <span>Livraison ({vc.methode})</span>
                        <span>{vc.fraisLivraison} DA</span>
                      </div>
                    </div>
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
                <span>Livraison totale ({vendeurCalcs.length} vendeur{vendeurCalcs.length > 1 ? 's' : ''})</span>
                <span>{totalFrais} DA</span>
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
          <div className="bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-stone-100 dark:border-stone-800 w-full max-w-md max-h-[calc(100dvh-5rem)] sm:max-h-[90vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-stone-200 dark:bg-stone-700" />
            </div>

            <div className="px-6 pt-4 pb-2">
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-orange-50 dark:bg-orange-950/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-7 h-7 text-orange-700 dark:text-orange-400" />
                </div>
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">Confirmer la commande ?</h2>
                <p className="text-stone-400 text-sm mt-1">
                  {vendeurCalcs.length > 1
                    ? `${vendeurCalcs.length} commandes séparées seront créées`
                    : 'Vérifiez les détails avant de valider'}
                </p>
              </div>

              {/* Détails de livraison par vendeur */}
              <div className="space-y-2 mb-4">
                <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
                  <p className="text-xs text-stone-400 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Adresse
                  </p>
                  <p className="text-sm text-stone-800 dark:text-stone-200">{adresse}</p>
                </div>
                <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
                  <p className="text-xs text-stone-400 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" /> Paiement
                  </p>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{modePaiement}</p>
                </div>
                {vendeurCalcs.map(vc => (
                  <div key={vc.vendeurId ?? '__admin__'} className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
                    <p className="text-xs text-stone-400 mb-1 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5" /> {vc.vendeurInfo?.nomBoutique ?? 'Caba Store'}
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-orange-700" /> {vc.methode}
                      </p>
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">{vc.totalGroupe.toFixed(2)} DA</p>
                    </div>
                  </div>
                ))}
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
                  <span>Livraison</span><span>{totalFrais} DA</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-stone-100 dark:border-stone-800 pt-2">
                  <span className="text-stone-800 dark:text-stone-100">Total</span>
                  <span className="text-orange-700 dark:text-orange-500">{total.toFixed(2)} DA</span>
                </div>
              </div>

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