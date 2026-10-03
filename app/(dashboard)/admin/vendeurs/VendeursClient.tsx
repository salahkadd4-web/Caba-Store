'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import SellerInvoiceActions from '@/components/billing/SellerInvoiceActions'
import { useScrollLock } from '@/lib/hooks/useScrollLock'
import {
  Ban, Banknote, CheckCircle2, ClipboardList,
  CreditCard, Loader2, Package, Paperclip, Phone,
  Play, Search, ShoppingCart, X, XCircle,
} from 'lucide-react'
import {
  heading, inputCls, selectCls, btnSecondary,
  cardSm, kpiCard, modalOverlay, modalBox, toastCls,
} from '@/lib/dashboard-ui'
import { useI18n } from '@/components/I18nProvider'
import { tr } from '@/lib/i18n'
import { wilayaName } from '@/lib/algeria'

interface Doc { id: string; type: string; label: string; description: string | null; fichier: string | null; statut: string; adminNote: string | null }
export interface Vendeur {
  id: string; nomBoutique: string | null; statut: string; adminNote: string | null; createdAt: string
  totalCommandes: number; chiffreAffaire: number
  user: { nom: string; prenom: string; email: string | null; telephone: string | null; wilaya?: string | null; commune?: string | null }
  documents: Doc[]
  _count: { products: number; categories: number }
}
interface Paiement { id: string; montant: number; methode: string; reference: string | null; dateReglement: string; note: string | null }
interface BillingDetail {
  rate: number
  subscriptionAmount: number
  grossSales: number
  salesFee: number
  totalDue: number
  soldItemsCount: number
  deliveredOrdersCount: number
  periodStart: string | null
  periodEnd: string | null
}
interface InvoiceDetail extends BillingDetail {
  version: 'seller_invoice_v1'
  invoiceNumber: string
  sellerId: string
  level: string
  periodicite: string | null
  paymentId: string
  paidAt: string
  methode: string
  reference: string | null
  adminNote: string | null
  amount: number
  paymentDate: string
}
interface AbonnementDetail {
  id: string; niveau: string; statut: string; dateFin: string; periodicite: string | null; joursRestants: number; paiements: Paiement[]; billing: BillingDetail; invoices: InvoiceDetail[]
}

// Libellés : t.admin.sellers.status / subStatus, t.billing.levels
const statutConfig: Record<string, { color: string; icon: React.ElementType }> = {
  EN_ATTENTE:      { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',   icon: Loader2      },
  APPROUVE:        { color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',       icon: CheckCircle2 },
  SUSPENDU:        { color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',               icon: Ban          },
  PIECES_REQUISES: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',   icon: ClipboardList },
}
const NIVEAU_LABELS: Record<string, { price: number; color: string }> = {
  NIVEAU_1: { price: 5000, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  NIVEAU_2: { price: 4000, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'         },
  NIVEAU_3: { price: 3000, color: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'     },
}
const STATUT_ABO_LABELS: Record<string, { color: string }> = {
  GRATUIT:  { color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'     },
  ACTIF:    { color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'         },
  EXPIRE:   { color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'             },
  SUSPENDU: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
}
// Libellés enregistrés en base (français, lisibles par le vendeur) ; affichage traduit via t.admin.sellers.docTypes
const DOC_TYPES = [
  { type: 'carte_nationale',    label: "Carte nationale d'identité",                  description: 'Recto et verso de votre CNI'        },
  { type: 'registre_commerce',  label: 'Registre de commerce',                        description: 'Document officiel du RC'            },
  { type: 'carte_entrepreneur', label: 'Carte auto-entrepreneur / micro-importateur', description: "Carte d'activité micro-importateur" },
  { type: 'carte_fiscale',      label: 'Carte fiscale / NIF',                         description: "Numéro d'identification fiscale"     },
  { type: 'justif_domicile',    label: 'Justificatif de domicile',                    description: 'Facture récente (eau, APC…)'        },
  { type: 'autre',              label: 'Autre document',                              description: 'Précisez dans la description'       },
]

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t) }, [value, delay])
  return d
}

const inputField  = `w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition`
const selectField = `w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-400 transition`

export default function VendeursClient({ initialData }: { initialData: Vendeur[] }) {
  const { t, fmt, locale } = useI18n()
  const s_ = t.admin.sellers
  const d = (v: Date | string) => new Date(v).toLocaleDateString(fmt.intl)
  const levelLabel = (k: string) => t.billing.levels[k]?.label ?? k
  const levelWithPrice = (k: string) => NIVEAU_LABELS[k] ? s_.levelPrice(levelLabel(k), fmt.price(NIVEAU_LABELS[k].price)) : k
  const docLabel = (doc: { type: string; label: string }) => s_.docTypes[doc.type]?.label ?? doc.label
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [vendeurs,     setVendeurs]     = useState<Vendeur[]>(initialData)
  const [searching,    setSearching]    = useState(false)
  const [filterStatut, setFilterStatut] = useState('')
  const [search,       setSearch]       = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const abortRef = useRef<AbortController | null>(null)

  const [selected,     setSelected]     = useState<Vendeur | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)
  const [adminNote,    setAdminNote]    = useState('')
  const [newDocs,      setNewDocs]      = useState<{ type: string; label: string; description: string }[]>([])
  const [docAction,    setDocAction]    = useState<{ docId: string; action: 'accepter' | 'refuser'; note: string } | null>(null)
  const [toastMsg,     setToastMsg]     = useState<string | null>(null)
  const [onglet,       setOnglet]       = useState<'infos' | 'abonnement'>('infos')
  const [abonnement,   setAbonnement]   = useState<AbonnementDetail | null>(null)
  const [loadingAbo,   setLoadingAbo]   = useState(false)
  const [aboForm,      setAboForm]      = useState({ niveau: 'NIVEAU_3', periodicite: 'mensuel', methode: 'virement', reference: '', note: '' })
  const [savingAbo,    setSavingAbo]    = useState(false)
  const [aboMsg,       setAboMsg]       = useState<string | null>(null)

  useScrollLock(!!selected || showDocModal)

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000) }
  const docStatutColor: Record<string, string> = {
    EN_ATTENTE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    ACCEPTE:    'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    REFUSE:     'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }

  // Fetch uniquement quand search/filtre change (pas au montage)
  useEffect(() => {
    if (!debouncedSearch && !filterStatut) { setVendeurs(initialData); return }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setSearching(true)

    const params = new URLSearchParams()
    if (filterStatut)    params.set('statut', filterStatut)
    if (debouncedSearch) params.set('search', debouncedSearch)
    fetch(`/api/admin/vendeurs?${params}`, { signal: abortRef.current.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setVendeurs(data))
      .catch(e => { if (e instanceof Error && e.name !== 'AbortError') console.error(e) })
      .finally(() => setSearching(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatut, debouncedSearch])

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/vendeurs')
    if (res.ok) setVendeurs(await res.json())
  }, [])

  const clearSelectionQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('id')
    params.delete('tab')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const fetchDetail = useCallback(async (id: string, tab: 'infos' | 'abonnement' = 'infos') => {
    const res = await fetch(`/api/admin/vendeurs/${id}`)
    if (res.ok) { setSelected(await res.json()); setOnglet(tab); setAbonnement(null) }
  }, [])

  const fetchAbonnement = useCallback(async (vendeurId: string) => {
    setLoadingAbo(true)
    const res = await fetch(`/api/admin/vendeurs/${vendeurId}/abonnement`)
    if (res.ok) {
      const data = await res.json()
      setAbonnement({ ...data, joursRestants: Math.max(0, Math.ceil((new Date(data.dateFin).getTime() - Date.now()) / 86400000)) })
    } else { setAbonnement(null) }
    setLoadingAbo(false)
  }, [])

  useEffect(() => { if (selected && onglet === 'abonnement') fetchAbonnement(selected.id) }, [selected, onglet, fetchAbonnement])

  useEffect(() => {
    const selectedId = searchParams.get('id')
    if (!selectedId) return

    const requestedTab = searchParams.get('tab') === 'abonnement' ? 'abonnement' : 'infos'

    if (selected?.id === selectedId) {
      if (onglet !== requestedTab) setOnglet(requestedTab)
      return
    }

    fetchDetail(selectedId, requestedTab)
  }, [fetchDetail, onglet, searchParams, selected])

  const doAction = async (id: string, action: string, extra: object = {}) => {
    setSaving(true)
    const res  = await fetch(`/api/admin/vendeurs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, adminNote, ...extra }) })
    const data = await res.json()
    if (res.ok) { showToast(data.message); await refresh(); if (selected?.id === id) await fetchDetail(id); setShowDocModal(false); setAdminNote('') }
    else showToast(data.error || s_.error)
    setSaving(false)
  }

  const handleDocAction = async () => {
    if (!docAction || !selected) return
    setSaving(true)
    const res  = await fetch(`/api/admin/vendeurs/${selected.id}/documents/${docAction.docId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: docAction.action, adminNote: docAction.note }) })
    const data = await res.json()
    if (res.ok) { showToast(data.message); await fetchDetail(selected.id); await refresh() }
    else showToast(data.error || s_.error)
    setDocAction(null); setSaving(false)
  }

  const handleConfirmerPaiement = async () => {
    if (!selected) return
    setSavingAbo(true)
    const res  = await fetch(`/api/admin/vendeurs/${selected.id}/abonnement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aboForm) })
    const data = await res.json()
    setAboMsg(data.message ?? data.error)
    if (res.ok) fetchAbonnement(selected.id)
    setSavingAbo(false); setTimeout(() => setAboMsg(null), 4000)
  }

  const toggleNewDoc = (doc: typeof DOC_TYPES[0]) => {
    setNewDocs(prev => prev.find(d => d.type === doc.type) ? prev.filter(d => d.type !== doc.type) : [...prev, { type: doc.type, label: doc.label, description: doc.description }])
  }

  return (
    <div className="space-y-5">
      {toastMsg && <div className={toastCls}>{toastMsg}</div>}

      <h1 className={heading}>{s_.title}</h1>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
            {searching
              ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <Search className="w-4 h-4" />}
          </span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={s_.searchPlaceholder} className={`${inputCls} ps-10 pe-9`} />
          {search && <button onClick={() => setSearch('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>}
        </div>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className={`${selectCls} min-w-44`}>
          <option value="">{s_.allStatuses}</option>
          {Object.keys(statutConfig).map(k => <option key={k} value={k}>{tr(s_.status, k)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(statutConfig).map(([k, v]) => {
          const Icon = v.icon
          return (
            <button key={k} onClick={() => setFilterStatut(k === filterStatut ? '' : k)}
              className={`${kpiCard} text-start ${filterStatut === k ? 'border-orange-400 dark:border-orange-600 ring-1 ring-orange-300 dark:ring-orange-700' : ''}`}>
              <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mb-1">
                <Icon className="w-3 h-3" />{tr(s_.status, k)}
              </p>
              <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">
                {vendeurs.filter(vd => vd.statut === k).length}
              </p>
            </button>
          )
        })}
      </div>

      {vendeurs.length === 0 ? (
        <div className="text-center py-12 text-stone-400">{debouncedSearch ? s_.noResultFor(debouncedSearch) : s_.none}</div>
      ) : (
        <div className="space-y-2.5">
          {vendeurs.map(v => {
            const sc = statutConfig[v.statut] || { color: '', icon: null as unknown as React.ElementType }
            return (
              <div key={v.id} className={`${cardSm} p-4 hover:border-orange-300 dark:hover:border-orange-700 transition cursor-pointer`} onClick={() => fetchDetail(v.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{v.nomBoutique || `${v.user.prenom} ${v.user.nom}`}</p>
                      {v.nomBoutique && <span className="text-xs text-stone-400">({v.user.prenom} {v.user.nom})</span>}
                    </div>
                    <p className="text-xs text-stone-400">{v.user.email || v.user.telephone}</p>
                    {v.user.telephone && v.user.email && (
                      <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /><span dir="ltr">{v.user.telephone}</span></p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-stone-400">
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" />{s_.productsCount(v._count.products)}</span>
                      <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{s_.ordersShort(v.totalCommandes)}</span>
                      <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />{fmt.price(v.chiffreAffaire)}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${sc.color}`}>
                    {(() => { const Icon = sc.icon; return Icon ? <Icon className="w-3 h-3" /> : null })()}
                    {tr(s_.status, v.statut)}
                  </span>
                </div>
                {v.documents.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {v.documents.map(doc => <span key={doc.id} className={`text-xs px-2 py-0.5 rounded-full ${docStatutColor[doc.statut] || ''}`}>{docLabel(doc)}</span>)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Panel détail vendeur */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => { if (e.target === e.currentTarget) { setSelected(null); clearSelectionQuery() } }}>
          <div className="bg-[#FAF7F2] dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto border border-stone-200 dark:border-stone-800">
            <div className="sticky top-0 bg-[#FAF7F2] dark:bg-stone-900 z-10 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between p-5">
                <div>
                  <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">{selected.nomBoutique || `${selected.user.prenom} ${selected.user.nom}`}</h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit mt-1 ${statutConfig[selected.statut]?.color}`}>
                    {(() => { const Icon = statutConfig[selected.statut]?.icon; return Icon ? <Icon className="w-3 h-3" /> : null })()}
                    {tr(s_.status, selected.statut)}
                  </span>
                </div>
                <button onClick={() => { setSelected(null); clearSelectionQuery() }} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex border-t border-stone-200 dark:border-stone-800">
                {(['infos', 'abonnement'] as const).map(tab => (
                  <button key={tab} onClick={() => setOnglet(tab)}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition flex items-center justify-center gap-1.5 ${onglet === tab ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'}`}>
                    {tab === 'abonnement' && <CreditCard className="w-3.5 h-3.5" />}
                    {tab === 'infos' ? s_.tabInfo : s_.tabSubscription}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {onglet === 'infos' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      [s_.name,         `${selected.user.prenom} ${selected.user.nom}`],
                      [s_.email,        selected.user.email || '—'],
                      [s_.phone,        selected.user.telephone || '—'],
                      [s_.registration, d(selected.createdAt)],
                      [t.address.wilaya,  wilayaName(selected.user.wilaya, locale) || '—'],
                      [t.address.commune, selected.user.commune || '—'],
                      [s_.products,     String(selected._count?.products ?? 0)],
                      [s_.orders,       String(selected.totalCommandes ?? 0)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
                        <p className="text-xs text-stone-400 mb-0.5">{k}</p>
                        <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-stone-900 dark:bg-stone-800 text-white rounded-xl p-4">
                    <p className="text-xs text-stone-400 mb-1">{s_.revenue}</p>
                    <p className="text-xl font-bold">{fmt.price(selected.chiffreAffaire ?? 0)}</p>
                  </div>
                  {selected.adminNote && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-3 text-sm text-yellow-700 dark:text-yellow-300">
                      <span className="font-semibold">{s_.internalNote}</span>{selected.adminNote}
                    </div>
                  )}
                  {selected.documents.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-2.5">{s_.documents}</h3>
                      <div className="space-y-2.5">
                        {selected.documents.map(doc => (
                          <div key={doc.id} className="border border-stone-200 dark:border-stone-700 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{docLabel(doc)}</p>
                                {doc.description && <p className="text-xs text-stone-400">{s_.docTypes[doc.type]?.description ?? doc.description}</p>}
                              </div>
                              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${docStatutColor[doc.statut] || ''}`}>{tr(s_.docStatus, doc.statut)}</span>
                            </div>
                            {doc.adminNote && <p className="text-xs text-red-500 dark:text-red-400 mb-2">{s_.note} {doc.adminNote}</p>}
                            {doc.fichier ? (
                              <div className="flex items-center gap-3">
                                <a href={`/api/admin/documents/view?docId=${doc.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
                                  <Paperclip className="w-3.5 h-3.5" />{s_.viewFile}
                                </a>
                                {doc.statut === 'EN_ATTENTE' && (
                                  <div className="flex gap-2 ms-auto">
                                    <button onClick={() => setDocAction({ docId: doc.id, action: 'accepter', note: '' })} className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-3 py-1 rounded-lg hover:bg-green-100 transition flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{s_.accept}</button>
                                    <button onClick={() => setDocAction({ docId: doc.id, action: 'refuser', note: '' })} className="text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-3 py-1 rounded-lg hover:bg-red-100 transition flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{s_.refuse}</button>
                                  </div>
                                )}
                              </div>
                            ) : <p className="text-xs text-stone-400 italic">{s_.waitingFile}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">{s_.internalNoteOptional}</label>
                    <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} placeholder={s_.internalNotePlaceholder}
                      className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(selected.statut === 'EN_ATTENTE' || selected.statut === 'PIECES_REQUISES') && (
                      <button onClick={() => doAction(selected.id, 'approuver')} disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />{s_.approve}
                      </button>
                    )}
                    {selected.statut === 'APPROUVE' && (
                      <button onClick={() => doAction(selected.id, 'suspendre')} disabled={saving} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-1.5">
                        <Ban className="w-4 h-4" />{s_.suspend}
                      </button>
                    )}
                    {selected.statut === 'SUSPENDU' && (
                      <button onClick={() => doAction(selected.id, 'reactiver')} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-1.5">
                        <Play className="w-4 h-4 rtl-flip" />{s_.reactivate}
                      </button>
                    )}
                    {selected.statut !== 'SUSPENDU' && (
                      <button onClick={() => { setNewDocs([]); setShowDocModal(true) }} className="bg-orange-500 hover:bg-orange-600 text-white text-sm py-2.5 rounded-xl font-medium transition flex items-center justify-center gap-1.5">
                        <ClipboardList className="w-4 h-4" />{s_.requestDocs}
                      </button>
                    )}
                  </div>
                </>
              )}

              {onglet === 'abonnement' && (
                <div className="space-y-4">
                  {loadingAbo ? (
                    <p className="text-sm text-stone-400 text-center py-8">{t.common.loading}</p>
                  ) : !abonnement ? (
                    <p className="text-sm text-stone-400 text-center py-8">{s_.noSubscription}</p>
                  ) : (
                    <>
                      <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4 space-y-2.5 text-sm">
                        {[
                          { label: s_.subStatusLabel, value: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_ABO_LABELS[abonnement.statut]?.color ?? ''}`}>{tr(s_.subStatus, abonnement.statut)}</span> },
                          { label: s_.currentLevel,   value: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${NIVEAU_LABELS[abonnement.niveau]?.color ?? ''}`}>{levelWithPrice(abonnement.niveau)}</span> },
                          { label: s_.expiresOn,      value: <span className="font-semibold text-stone-800 dark:text-stone-100">{d(abonnement.dateFin)}</span> },
                          { label: s_.daysLeft,       value: <span className={`font-bold ${abonnement.statut === 'EXPIRE' ? 'text-red-500' : abonnement.joursRestants <= 7 ? 'text-orange-500' : 'text-teal-600 dark:text-teal-400'}`}>{abonnement.statut === 'EXPIRE' ? s_.expired : s_.daysCount(abonnement.joursRestants)}</span> },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center">
                            <span className="text-stone-500">{label}</span>
                            {value}
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4">
                          <p className="text-xs text-stone-500 mb-1">{s_.subscription}</p>
                          <p className="text-lg font-semibold text-stone-900 dark:text-white">{fmt.price(abonnement.billing.subscriptionAmount)}</p>
                        </div>
                        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4">
                          <p className="text-xs text-stone-500 mb-1">{s_.salesFees}</p>
                          <p className="text-lg font-semibold text-stone-900 dark:text-white">{fmt.price(abonnement.billing.salesFee)}</p>
                          <p className="text-[11px] text-stone-400 mt-1">{s_.feeOn(fmt.price(abonnement.billing.grossSales))}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">{s_.totalDue}</p>
                          <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">{fmt.price(abonnement.billing.totalDue)}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-4 bg-stone-50 dark:bg-stone-800/50 text-sm space-y-2">
                        <div className="flex justify-between gap-3">
                          <span className="text-stone-500">{s_.deliveredSalesPeriod}</span>
                          <span className="font-medium text-stone-800 dark:text-stone-100">{fmt.price(abonnement.billing.grossSales)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-stone-500">{s_.deliveredOrders}</span>
                          <span className="font-medium text-stone-800 dark:text-stone-100">{abonnement.billing.deliveredOrdersCount}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-stone-500">{s_.soldLines}</span>
                          <span className="font-medium text-stone-800 dark:text-stone-100">{abonnement.billing.soldItemsCount}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-stone-500">{s_.billedPeriod}</span>
                          <span className="font-medium text-stone-800 dark:text-stone-100 text-end">
                            {abonnement.billing.periodStart && abonnement.billing.periodEnd
                              ? `${d(abonnement.billing.periodStart)} - ${d(abonnement.billing.periodEnd)}`
                              : t.billing.undefinedPeriod}
                          </span>
                        </div>
                      </div>
                      <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 space-y-3">
                        <p className="font-semibold text-sm text-stone-800 dark:text-stone-100">{s_.confirmPayment}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-stone-500 mb-1 block">{s_.level}</label>
                            <select value={aboForm.niveau} onChange={e => setAboForm(f => ({...f, niveau: e.target.value}))} className={selectField}>
                              {(['NIVEAU_1', 'NIVEAU_2', 'NIVEAU_3'] as const).map(k => (
                                <option key={k} value={k}>{s_.levelPricePerMonth(levelLabel(k), fmt.price(NIVEAU_LABELS[k].price))}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-stone-500 mb-1 block">{s_.periodicity}</label>
                            <select value={aboForm.periodicite} onChange={e => setAboForm(f => ({...f, periodicite: e.target.value}))} className={selectField}>
                              <option value="mensuel">{s_.monthly}</option>
                              <option value="annuel">{s_.yearly}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-stone-500 mb-1 block">{s_.method}</label>
                            <select value={aboForm.methode} onChange={e => setAboForm(f => ({...f, methode: e.target.value}))} className={selectField}>
                              <option value="virement">{s_.bankTransfer}</option>
                              <option value="ccp">{s_.ccp}</option>
                              <option value="cash">{s_.cash}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-stone-500 mb-1 block">{s_.reference}</label>
                            <input value={aboForm.reference} onChange={e => setAboForm(f => ({...f, reference: e.target.value}))} placeholder={s_.referencePlaceholder} className={inputField} />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-stone-500 mb-1 block">{s_.internalNoteShort}</label>
                          <input value={aboForm.note} onChange={e => setAboForm(f => ({...f, note: e.target.value}))} placeholder={s_.notePlaceholder} className={inputField} />
                        </div>
                        {aboMsg && <p className="text-sm text-center font-medium text-teal-600 dark:text-teal-400">{aboMsg}</p>}
                        <button onClick={handleConfirmerPaiement} disabled={savingAbo}
                          className="w-full bg-orange-700 hover:bg-orange-800 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition active:scale-95">
                          {savingAbo ? t.common.saving : s_.confirmAndRenew}
                        </button>
                      </div>
                      {abonnement.paiements.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm text-stone-800 dark:text-stone-100 mb-2">{s_.history}</p>
                          <div className="space-y-2">
                            {abonnement.invoices.map((invoice, index) => (
                              <div key={invoice.paymentId} className="bg-stone-50 dark:bg-stone-800 rounded-xl px-3 py-3 text-sm space-y-3">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="space-y-2 min-w-0">
                                    <div>
                                      <p className="font-medium text-stone-900 dark:text-white">{invoice.invoiceNumber}</p>
                                      <p className="text-stone-400 text-xs mt-0.5">{d(invoice.paymentDate)} · {tr(t.billing.methods, invoice.methode)}</p>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <div>
                                        <p className="text-[11px] text-stone-400 uppercase tracking-wide">{s_.period}</p>
                                        <p className="text-stone-700 dark:text-stone-200">
                                          {invoice.periodStart && invoice.periodEnd
                                            ? `${d(invoice.periodStart)} - ${d(invoice.periodEnd)}`
                                            : t.billing.undefinedPeriod}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] text-stone-400 uppercase tracking-wide">{s_.total}</p>
                                        <p className="text-stone-700 dark:text-stone-200 font-medium">{fmt.price(invoice.totalDue)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] text-stone-400 uppercase tracking-wide">{s_.subscription}</p>
                                        <p className="text-stone-700 dark:text-stone-200">{fmt.price(invoice.subscriptionAmount)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[11px] text-stone-400 uppercase tracking-wide">{s_.salesFees}</p>
                                        <p className="text-stone-700 dark:text-stone-200">{fmt.price(invoice.salesFee)}</p>
                                      </div>
                                    </div>
                                    {(invoice.reference || invoice.adminNote || abonnement.paiements[index]?.note) && (
                                      <p className="text-stone-400 text-xs mt-0.5">
                                        {invoice.reference ? t.billing.ref(invoice.reference) : ''}
                                        {invoice.reference && (invoice.adminNote || abonnement.paiements[index]?.note) ? ' · ' : ''}
                                        {invoice.adminNote || abonnement.paiements[index]?.note}
                                      </p>
                                    )}
                                  </div>

                                  <SellerInvoiceActions invoice={{
                                    invoiceNumber: invoice.invoiceNumber,
                                    sellerName: selected.nomBoutique || `${selected.user.prenom} ${selected.user.nom}`,
                                    levelLabel: levelWithPrice(invoice.level),
                                    periodiciteLabel: invoice.periodicite ? tr(t.billing.periodicity, invoice.periodicite) : t.billing.offered,
                                    paymentDateLabel: d(invoice.paymentDate),
                                    periodLabel: invoice.periodStart && invoice.periodEnd
                                      ? `${d(invoice.periodStart)} - ${d(invoice.periodEnd)}`
                                      : t.billing.undefinedPeriod,
                                    paymentMethodLabel: tr(t.billing.methods, invoice.methode),
                                    reference: invoice.reference,
                                    adminNote: invoice.adminNote,
                                    grossSalesLabel: fmt.price(invoice.grossSales),
                                    salesFeeLabel: fmt.price(invoice.salesFee),
                                    subscriptionAmountLabel: fmt.price(invoice.subscriptionAmount),
                                    totalDueLabel: fmt.price(invoice.totalDue),
                                    deliveredOrdersCount: invoice.deliveredOrdersCount,
                                    soldItemsCount: invoice.soldItemsCount,
                                  }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal action document */}
      {docAction && (
        <div className={`${modalOverlay} z-60`}>
          <div className={`${modalBox} max-w-md p-5`}>
            <h3 className="text-base font-bold text-stone-800 dark:text-stone-100 mb-3 flex items-center gap-2">
              {docAction.action === 'accepter' ? <><CheckCircle2 className="w-4 h-4 text-green-600" />{s_.acceptDoc}</> : <><XCircle className="w-4 h-4 text-red-600" />{s_.refuseDoc}</>}
            </h3>
            {docAction.action === 'refuser' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-stone-500 mb-1.5">{s_.refusalReason}</label>
                <textarea value={docAction.note} onChange={e => setDocAction({...docAction, note: e.target.value})} rows={3} placeholder={s_.refusalPlaceholder}
                  className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDocAction(null)} className={`flex-1 ${btnSecondary}`}>{t.common.cancel}</button>
              <button onClick={handleDocAction} disabled={saving || (docAction.action === 'refuser' && !docAction.note.trim())}
                className={`flex-1 text-white text-sm py-2.5 rounded-xl font-medium disabled:opacity-50 transition ${docAction.action === 'accepter' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {saving ? '…' : t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal demande pièces */}
      {showDocModal && selected && (
        <div className={`${modalOverlay} z-60`}>
          <div className={`${modalBox} max-w-lg max-h-[90vh] overflow-y-auto`}>
            <div className="sticky top-0 bg-[#FAF7F2] dark:bg-stone-900 flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800">
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-orange-600" />{s_.requestDocsTitle}</h3>
              <button onClick={() => setShowDocModal(false)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-stone-500">{s_.requestDocsHint}</p>
              <div className="space-y-2">
                {DOC_TYPES.map(doc => {
                  const checked = newDocs.some(d => d.type === doc.type)
                  return (
                    <button key={doc.type} onClick={() => toggleNewDoc(doc)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-start transition ${checked ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/40 dark:border-orange-600' : 'border-stone-200 dark:border-stone-700 hover:border-orange-300 dark:hover:border-orange-700'}`}>
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-orange-600 border-orange-600' : 'border-stone-400'}`}>
                        {checked && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{docLabel(doc)}</p>
                        <p className="text-xs text-stone-400">{s_.docTypes[doc.type]?.description ?? doc.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">{s_.noteForSeller}</label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} placeholder={s_.noteForSellerPlaceholder}
                  className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-stone-200 dark:border-stone-800">
              <button onClick={() => setShowDocModal(false)} className={`flex-1 ${btnSecondary}`}>{t.common.cancel}</button>
              <button onClick={() => doAction(selected.id, 'demander_pieces', { documents: newDocs })} disabled={saving || newDocs.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl font-medium active:scale-95">
                {saving ? t.common.sending : s_.requestCount(newDocs.length)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
