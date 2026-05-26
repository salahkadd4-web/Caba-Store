'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Ban, Banknote, CheckCircle2, ClipboardList,
  CreditCard, Loader2, Package, Paperclip, Phone,
  Play, Search, ShoppingCart, X, XCircle,
} from 'lucide-react'

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface Doc {
  id: string; type: string; label: string; description: string | null
  fichier: string | null; statut: string; adminNote: string | null
}
interface Vendeur {
  id: string; nomBoutique: string | null; statut: string
  adminNote: string | null; createdAt: string
  totalCommandes: number; chiffreAffaire: number
  user: { nom: string; prenom: string; email: string | null; telephone: string | null }
  documents: Doc[]
  _count: { products: number; categories: number }
}
interface Paiement {
  id: string; montant: number; methode: string
  reference: string | null; dateReglement: string; note: string | null
}
interface AbonnementDetail {
  id: string; niveau: string; statut: string
  dateFin: string; periodicite: string | null; joursRestants: number
  paiements: Paiement[]
}

// ── Config statuts vendeur ─────────────────────────────────────────────────────
const statutConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  EN_ATTENTE:      { label: 'En attente',      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',   icon: Loader2 },
  APPROUVE:        { label: 'Approuvé',        color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',       icon: CheckCircle2 },
  SUSPENDU:        { label: 'Suspendu',        color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',               icon: Ban },
  PIECES_REQUISES: { label: 'Pièces requises', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',   icon: ClipboardList },
}

// ── Config niveaux abonnement ──────────────────────────────────────────────────
const NIVEAU_LABELS: Record<string, { label: string; color: string }> = {
  NIVEAU_1: { label: 'Niveau 1 — 2500 DA', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  NIVEAU_2: { label: 'Niveau 2 — 2000 DA', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  NIVEAU_3: { label: 'Niveau 3 — 1500 DA', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
}
const STATUT_ABO_LABELS: Record<string, { label: string; color: string }> = {
  GRATUIT:  { label: 'Gratuit (1 an)',   color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
  ACTIF:    { label: 'Actif',            color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' },
  EXPIRE:   { label: 'Expiré',           color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  SUSPENDU: { label: 'Suspendu',         color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
}

// ── Types de documents demandables ────────────────────────────────────────────
const DOC_TYPES = [
  { type: 'carte_nationale',    label: "Carte nationale d'identité",                  description: 'Recto et verso de votre CNI'           },
  { type: 'registre_commerce',  label: 'Registre de commerce',                        description: 'Document officiel du RC'               },
  { type: 'carte_entrepreneur', label: 'Carte auto-entrepreneur / micro-importateur', description: "Carte d'activité micro-importateur"    },
  { type: 'carte_fiscale',      label: 'Carte fiscale / NIF',                         description: "Numéro d'identification fiscale"        },
  { type: 'justif_domicile',    label: 'Justificatif de domicile',                    description: 'Facture récente (électricité, eau, APC...)' },
  { type: 'autre',              label: 'Autre document',                              description: 'Précisez dans la description'          },
]

// ── Hook debounce ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function AdminVendeursPage() {
  // ── État liste ──────────────────────────────────────────────────────────────
  const [vendeurs,     setVendeurs]     = useState<Vendeur[]>([])
  const [loading,      setLoading]      = useState(true)
  const [searching,    setSearching]    = useState(false)
  const [filterStatut, setFilterStatut] = useState('')
  const [search,       setSearch]       = useState('')
  const debouncedSearch                 = useDebounce(search, 350)
  const abortRef                        = useRef<AbortController | null>(null)

  // ── État panel vendeur ──────────────────────────────────────────────────────
  const [selected,     setSelected]     = useState<Vendeur | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [showDocModal, setShowDocModal] = useState(false)
  const [adminNote,    setAdminNote]    = useState('')
  const [newDocs,      setNewDocs]      = useState<{ type: string; label: string; description: string }[]>([])
  const [docAction,    setDocAction]    = useState<{ docId: string; action: 'accepter' | 'refuser'; note: string } | null>(null)
  const [toastMsg,     setToastMsg]     = useState<string | null>(null)

  // ── Onglets du panel ────────────────────────────────────────────────────────
  const [onglet, setOnglet] = useState<'infos' | 'abonnement'>('infos')

  // ── État abonnement ─────────────────────────────────────────────────────────
  const [abonnement,  setAbonnement]  = useState<AbonnementDetail | null>(null)
  const [loadingAbo,  setLoadingAbo]  = useState(false)
  const [aboForm,     setAboForm]     = useState({
    niveau: 'NIVEAU_3', periodicite: 'mensuel',
    methode: 'virement', reference: '', note: '',
  })
  const [savingAbo, setSavingAbo] = useState(false)
  const [aboMsg,    setAboMsg]    = useState<string | null>(null)

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const docStatutColor: Record<string, string> = {
    EN_ATTENTE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    ACCEPTE:    'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    REFUSE:     'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }

  // ── Fetch liste vendeurs ─────────────────────────────────────────────────────
  const fetchVendeurs = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    debouncedSearch ? setSearching(true) : setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatut)    params.set('statut', filterStatut)
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await fetch(`/api/admin/vendeurs?${params}`, { signal: abortRef.current.signal })
      if (res.ok) setVendeurs(await res.json())
    } catch (e: any) {
      if (e.name !== 'AbortError') console.error(e)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }, [filterStatut, debouncedSearch])

  useEffect(() => { fetchVendeurs() }, [fetchVendeurs])

  // ── Fetch détail vendeur ─────────────────────────────────────────────────────
  const fetchDetail = async (id: string) => {
    const res = await fetch(`/api/admin/vendeurs/${id}`)
    if (res.ok) {
      const data = await res.json()
      setSelected(data)
      setOnglet('infos')
      setAbonnement(null)
    }
  }

  // ── Fetch abonnement ─────────────────────────────────────────────────────────
  const fetchAbonnement = useCallback(async (vendeurId: string) => {
    setLoadingAbo(true)
    const res = await fetch(`/api/admin/vendeurs/${vendeurId}/abonnement`)
    if (res.ok) {
      const data = await res.json()
      const now  = new Date()
      setAbonnement({
        ...data,
        joursRestants: Math.max(0, Math.ceil(
          (new Date(data.dateFin).getTime() - now.getTime()) / 86400000
        )),
      })
    } else {
      setAbonnement(null)
    }
    setLoadingAbo(false)
  }, [])

  useEffect(() => {
    if (selected && onglet === 'abonnement') fetchAbonnement(selected.id)
  }, [selected, onglet, fetchAbonnement])

  // ── Actions vendeur ──────────────────────────────────────────────────────────
  const doAction = async (id: string, action: string, extra: object = {}) => {
    setSaving(true)
    const res = await fetch(`/api/admin/vendeurs/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action, adminNote, ...extra }),
    })
    const data = await res.json()
    if (res.ok) {
      showToast(data.message)
      await fetchVendeurs()
      if (selected?.id === id) await fetchDetail(id)
      setShowDocModal(false)
      setAdminNote('')
    } else {
      showToast(data.error || 'Erreur')
    }
    setSaving(false)
  }

  const handleDocAction = async () => {
    if (!docAction || !selected) return
    setSaving(true)
    const res = await fetch(`/api/admin/vendeurs/${selected.id}/documents/${docAction.docId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: docAction.action, adminNote: docAction.note }),
    })
    const data = await res.json()
    if (res.ok) {
      showToast(data.message)
      await fetchDetail(selected.id)
      await fetchVendeurs()
    } else {
      showToast(data.error || 'Erreur')
    }
    setDocAction(null)
    setSaving(false)
  }

  // ── Confirmer paiement abonnement ────────────────────────────────────────────
  const handleConfirmerPaiement = async () => {
    if (!selected) return
    setSavingAbo(true)
    const res = await fetch(`/api/admin/vendeurs/${selected.id}/abonnement`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(aboForm),
    })
    const data = await res.json()
    setAboMsg(data.message ?? data.error)
    if (res.ok) fetchAbonnement(selected.id)
    setSavingAbo(false)
    setTimeout(() => setAboMsg(null), 4000)
  }

  const toggleNewDoc = (doc: typeof DOC_TYPES[0]) => {
    setNewDocs((prev) => {
      const exists = prev.find((d) => d.type === doc.type)
      if (exists) return prev.filter((d) => d.type !== doc.type)
      return [...prev, { type: doc.type, label: doc.label, description: doc.description }]
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-[100] bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}

      <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        Gestion des Vendeurs
      </h1>

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {searching ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : <Search className="w-4 h-4" />}
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Boutique, nom, email, téléphone..."
            className="w-full pl-9 pr-8 border border-gray-200 dark:border-gray-700 rounded-xl py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(statutConfig).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Object.entries(statutConfig).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setFilterStatut(k === filterStatut ? '' : k)}
            className={`bg-white dark:bg-gray-900 rounded-xl p-3 border text-left transition-all ${
              filterStatut === k ? 'border-purple-400 dark:border-purple-600' : 'border-gray-100 dark:border-gray-800'
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {(() => { const Icon = v.icon; return <Icon className="w-3 h-3 inline mr-1" /> })()}
              {v.label}
            </p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {vendeurs.filter((vd) => vd.statut === k).length}
            </p>
          </button>
        ))}
      </div>

      {/* ── Liste vendeurs ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : vendeurs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {debouncedSearch ? `Aucun résultat pour "${debouncedSearch}"` : 'Aucun vendeur trouvé'}
        </div>
      ) : (
        <div className="space-y-3">
          {vendeurs.map((v) => {
            const sc = statutConfig[v.statut] || { label: v.statut, color: '', icon: null as unknown as React.ElementType }
            return (
              <div
                key={v.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer"
                onClick={() => fetchDetail(v.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        {v.nomBoutique || `${v.user.prenom} ${v.user.nom}`}
                      </p>
                      {v.nomBoutique && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">({v.user.prenom} {v.user.nom})</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{v.user.email || v.user.telephone}</p>
                    {v.user.telephone && v.user.email && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        <Phone className="w-4 h-4 inline mr-1" />{v.user.telephone}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                      <span><Package className="w-4 h-4 inline mr-1" />{v._count.products} produits</span>
                      <span><ShoppingCart className="w-4 h-4 inline mr-1" />{v.totalCommandes} cmd</span>
                      <span><Banknote className="w-4 h-4 inline mr-1" />{v.chiffreAffaire.toLocaleString('fr-DZ')} DA</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${sc.color}`}>
                    {(() => { const Icon = sc.icon; return Icon ? <Icon className="w-3 h-3 inline mr-1" /> : null })()}
                    {sc.label}
                  </span>
                </div>
                {v.documents.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.documents.map((d) => (
                      <span key={d.id} className={`text-xs px-2 py-0.5 rounded-full ${docStatutColor[d.statut] || ''}`}>
                        {d.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Panel de détail ──────────────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">

            {/* En-tête panel */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between p-5">
                <div>
                  <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                    {selected.nomBoutique || `${selected.user.prenom} ${selected.user.nom}`}
                  </h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutConfig[selected.statut]?.color}`}>
                    {(() => { const Icon = statutConfig[selected.statut]?.icon; return Icon ? <Icon className="w-3 h-3 inline mr-1" /> : null })()}
                    {statutConfig[selected.statut]?.label}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Onglets ──────────────────────────────────────────────────── */}
              <div className="flex border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setOnglet('infos')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
                    onglet === 'infos'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Infos & Actions
                </button>
                <button
                  onClick={() => setOnglet('abonnement')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition flex items-center justify-center gap-1.5 ${
                    onglet === 'abonnement'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Abonnement
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">

              {/* ══════════════════════════════════════════════════════════════ */}
              {/*  ONGLET INFOS                                                  */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {onglet === 'infos' && (
                <>
                  {/* Grille infos */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Nom',        `${selected.user.prenom} ${selected.user.nom}`],
                      ['Email',      selected.user.email || '—'],
                      ['Téléphone',  selected.user.telephone || '—'],
                      ['Inscription', new Date(selected.createdAt).toLocaleDateString('fr-DZ')],
                      ['Produits',   String(selected._count?.products ?? 0)],
                      ['Commandes',  String((selected as any).totalCommandes ?? 0)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{k}</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* CA */}
                  <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Chiffre d'affaires</p>
                    <p className="text-xl font-bold">{(selected as any).chiffreAffaire?.toLocaleString('fr-DZ') ?? 0} DA</p>
                  </div>

                  {/* Note interne */}
                  {selected.adminNote && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-3 text-sm text-yellow-700 dark:text-yellow-300">
                      <span className="font-semibold">Note interne : </span>{selected.adminNote}
                    </div>
                  )}

                  {/* Documents */}
                  {selected.documents.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Pièces justificatives</h3>
                      <div className="space-y-3">
                        {selected.documents.map((doc) => (
                          <div key={doc.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{doc.label}</p>
                                {doc.description && <p className="text-xs text-gray-400 dark:text-gray-500">{doc.description}</p>}
                              </div>
                              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${docStatutColor[doc.statut] || ''}`}>
                                {doc.statut}
                              </span>
                            </div>
                            {doc.adminNote && <p className="text-xs text-red-500 dark:text-red-400 mb-2">Note : {doc.adminNote}</p>}
                            {doc.fichier ? (
                              <div className="flex items-center gap-3">
                                <a href={`/api/admin/documents/view?docId=${doc.id}`} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                                  <Paperclip className="w-4 h-4 inline mr-1" />Voir le fichier
                                </a>
                                {doc.statut === 'EN_ATTENTE' && (
                                  <div className="flex gap-2 ml-auto">
                                    <button onClick={() => setDocAction({ docId: doc.id, action: 'accepter', note: '' })}
                                      className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-3 py-1 rounded-lg hover:bg-green-100 transition">
                                      <CheckCircle2 className="w-4 h-4 inline mr-1" />Accepter
                                    </button>
                                    <button onClick={() => setDocAction({ docId: doc.id, action: 'refuser', note: '' })}
                                      className="text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-3 py-1 rounded-lg hover:bg-red-100 transition">
                                      <XCircle className="w-4 h-4 inline mr-1" />Refuser
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 dark:text-gray-500 italic">En attente du fichier du vendeur...</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Note admin (saisie) */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Note interne (optionnelle)</label>
                    <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                      placeholder="Motif, commentaire..." />
                  </div>

                  {/* Boutons d'action */}
                  <div className="grid grid-cols-2 gap-3">
                    {(selected.statut === 'EN_ATTENTE' || selected.statut === 'PIECES_REQUISES') && (
                      <button onClick={() => doAction(selected.id, 'approuver')} disabled={saving}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm py-3 rounded-xl font-medium transition-all">
                        <CheckCircle2 className="w-4 h-4 inline mr-1" />Approuver
                      </button>
                    )}
                    {selected.statut === 'APPROUVE' && (
                      <button onClick={() => doAction(selected.id, 'suspendre')} disabled={saving}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm py-3 rounded-xl font-medium transition-all">
                        <Ban className="w-4 h-4 inline mr-1" />Suspendre
                      </button>
                    )}
                    {selected.statut === 'SUSPENDU' && (
                      <button onClick={() => doAction(selected.id, 'reactiver')} disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm py-3 rounded-xl font-medium transition-all">
                        <Play className="w-4 h-4 inline mr-1" />Réactiver
                      </button>
                    )}
                    {selected.statut !== 'SUSPENDU' && (
                      <button onClick={() => { setNewDocs([]); setShowDocModal(true) }}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-sm py-3 rounded-xl font-medium transition-all">
                        <ClipboardList className="w-4 h-4 inline mr-1" />Demander des pièces
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/*  ONGLET ABONNEMENT                                             */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {onglet === 'abonnement' && (
                <div className="space-y-5">
                  {loadingAbo ? (
                    <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>
                  ) : !abonnement ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Aucun abonnement — vendeur pas encore approuvé.
                    </p>
                  ) : (
                    <>
                      {/* Statut actuel */}
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Statut abonnement</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_ABO_LABELS[abonnement.statut]?.color ?? ''}`}>
                            {STATUT_ABO_LABELS[abonnement.statut]?.label ?? abonnement.statut}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Niveau actuel</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${NIVEAU_LABELS[abonnement.niveau]?.color ?? ''}`}>
                            {NIVEAU_LABELS[abonnement.niveau]?.label ?? abonnement.niveau}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Expire le</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">
                            {new Date(abonnement.dateFin).toLocaleDateString('fr-DZ')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Jours restants</span>
                          <span className={`font-bold ${
                            abonnement.statut === 'EXPIRE' ? 'text-red-500'
                            : abonnement.joursRestants <= 7 ? 'text-orange-500'
                            : 'text-teal-600 dark:text-teal-400'
                          }`}>
                            {abonnement.statut === 'EXPIRE' ? 'Expiré' : `${abonnement.joursRestants} jours`}
                          </span>
                        </div>
                      </div>

                      {/* Formulaire renouvellement */}
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                        <p className="font-semibold text-sm text-gray-800 dark:text-white">
                          Confirmer un paiement / renouveler
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Niveau</label>
                            <select
                              value={aboForm.niveau}
                              onChange={e => setAboForm(f => ({ ...f, niveau: e.target.value }))}
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                            >
                              <option value="NIVEAU_1">Niveau 1 — 2500 DA/mois</option>
                              <option value="NIVEAU_2">Niveau 2 — 2000 DA/mois</option>
                              <option value="NIVEAU_3">Niveau 3 — 1500 DA/mois</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Périodicité</label>
                            <select
                              value={aboForm.periodicite}
                              onChange={e => setAboForm(f => ({ ...f, periodicite: e.target.value }))}
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                            >
                              <option value="mensuel">Mensuel</option>
                              <option value="annuel">Annuel (−17%)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Méthode de paiement</label>
                            <select
                              value={aboForm.methode}
                              onChange={e => setAboForm(f => ({ ...f, methode: e.target.value }))}
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                            >
                              <option value="virement">Virement bancaire</option>
                              <option value="ccp">CCP</option>
                              <option value="cash">Espèces</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Référence / reçu</label>
                            <input
                              value={aboForm.reference}
                              onChange={e => setAboForm(f => ({ ...f, reference: e.target.value }))}
                              placeholder="N° virement…"
                              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Note interne (optionnel)</label>
                          <input
                            value={aboForm.note}
                            onChange={e => setAboForm(f => ({ ...f, note: e.target.value }))}
                            placeholder="Remarque interne…"
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                          />
                        </div>

                        {aboMsg && (
                          <p className="text-sm text-center font-medium text-teal-600 dark:text-teal-400">{aboMsg}</p>
                        )}

                        <button
                          onClick={handleConfirmerPaiement}
                          disabled={savingAbo}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition"
                        >
                          {savingAbo ? 'Enregistrement…' : 'Confirmer le paiement & renouveler'}
                        </button>
                      </div>

                      {/* Historique paiements */}
                      {abonnement.paiements.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm text-gray-800 dark:text-white mb-2">
                            Historique des paiements
                          </p>
                          <div className="space-y-2">
                            {abonnement.paiements.map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 text-sm">
                                <div>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {p.montant.toLocaleString('fr-DZ')} DA
                                  </span>
                                  <span className="text-gray-400 ml-2 text-xs capitalize">{p.methode}</span>
                                  {p.reference && (
                                    <span className="text-gray-400 ml-1 text-xs">· {p.reference}</span>
                                  )}
                                  {p.note && (
                                    <p className="text-gray-400 text-xs mt-0.5">{p.note}</p>
                                  )}
                                </div>
                                <span className="text-gray-400 text-xs shrink-0">
                                  {new Date(p.dateReglement).toLocaleDateString('fr-DZ')}
                                </span>
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

      {/* ── Modal action document ─────────────────────────────────────────────── */}
      {docAction && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-5">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">
              {docAction.action === 'accepter'
                ? <><CheckCircle2 className="w-5 h-5 inline mr-1" />Accepter le document</>
                : <><XCircle className="w-5 h-5 inline mr-1" />Refuser le document</>}
            </h3>
            {docAction.action === 'refuser' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Motif du refus *</label>
                <textarea value={docAction.note} onChange={(e) => setDocAction({ ...docAction, note: e.target.value })} rows={3}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  placeholder="Expliquez pourquoi le document est refusé..." />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDocAction(null)} className="flex-1 border border-gray-200 dark:border-gray-700 text-sm py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Annuler
              </button>
              <button onClick={handleDocAction} disabled={saving || (docAction.action === 'refuser' && !docAction.note.trim())}
                className={`flex-1 text-white text-sm py-2.5 rounded-xl font-medium disabled:opacity-50 transition-all ${
                  docAction.action === 'accepter' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {saving ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal demande de pièces ───────────────────────────────────────────── */}
      {showDocModal && selected && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                <ClipboardList className="w-4 h-4 inline mr-1" />Demander des pièces jointes
              </h3>
              <button onClick={() => setShowDocModal(false)} className="text-gray-400 text-xl">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sélectionnez les documents à demander. Le compte sera bloqué jusqu'à validation.
              </p>
              <div className="space-y-2">
                {DOC_TYPES.map((doc) => {
                  const checked = newDocs.some((d) => d.type === doc.type)
                  return (
                    <button key={doc.type} onClick={() => toggleNewDoc(doc)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        checked
                          ? 'border-purple-400 bg-purple-50 dark:bg-purple-950 dark:border-purple-600'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                      }`}>
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        checked ? 'bg-purple-600 border-purple-600' : 'border-gray-400'
                      }`}>
                        {checked && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{doc.label}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{doc.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Note pour le vendeur (optionnelle)</label>
                <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  placeholder="Instructions supplémentaires..." />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setShowDocModal(false)} className="flex-1 border border-gray-200 dark:border-gray-700 text-sm py-2.5 rounded-xl text-gray-600 dark:text-gray-300">
                Annuler
              </button>
              <button onClick={() => doAction(selected.id, 'demander_pieces', { documents: newDocs })}
                disabled={saving || newDocs.length === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl font-medium">
                {saving ? 'Envoi...' : `Demander (${newDocs.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}