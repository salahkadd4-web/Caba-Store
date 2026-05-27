'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Calendar, Eye, Heart, Mail, Phone, Search, Trash2, X } from 'lucide-react'
import {
  cardSm, heading, inputCls, btnSecondary, btnDanger, btnDangerSolid,
  tableWrapper, tableHead, tableTh, tableTd, tableRow,
  modalOverlay, modalBox,
} from '@/lib/dashboard-ui'

export type Client = {
  id: string
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  avatar: string | null
  createdAt: string
  _count: { orders: number; favorites: number }
  orders?: unknown[]
}

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

function Spinner({ cls = 'w-4 h-4' }: { cls?: string }) {
  return (
    <svg className={`animate-spin ${cls}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function ClientsClient({ initialData }: { initialData: Client[] }) {
  const [clients,        setClients]        = useState<Client[]>(initialData)
  const [searching,      setSearching]      = useState(false)
  const [search,         setSearch]         = useState('')
  const [deleteId,       setDeleteId]       = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loadingDetail,  setLoadingDetail]  = useState(false)

  const debouncedSearch = useDebounce(search, 350)
  const abortRef = useRef<AbortController | null>(null)

  // Fetch uniquement quand la recherche change (pas au montage — initialData couvre ça)
  useEffect(() => {
    if (debouncedSearch === '') { setClients(initialData); return }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setSearching(true)

    const params = new URLSearchParams({ search: debouncedSearch })
    fetch(`/api/admin/clients?${params}`, { signal: abortRef.current.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setClients(data))
      .catch(e => { if (e instanceof Error && e.name !== 'AbortError') console.error(e) })
      .finally(() => setSearching(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/clients')
    if (res.ok) setClients(await res.json())
  }, [])

  const openDetail = async (client: Client) => {
    setSelectedClient(client)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`)
      if (res.ok) setSelectedClient(await res.json())
    } finally { setLoadingDetail(false) }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    setSelectedClient(null)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={heading}>Clients</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="max-w-md">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
            {searching ? <Spinner /> : <Search className="w-4 h-4" />}
          </span>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, prénom, email, téléphone…"
            className={`${inputCls} pl-10 pr-9`}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {debouncedSearch && (
          <p className="mt-1.5 text-xs text-stone-400">{clients.length} résultat{clients.length !== 1 ? 's' : ''} pour «&nbsp;{debouncedSearch}&nbsp;»</p>
        )}
      </div>

      {/* Tableau desktop */}
      <div className={`${tableWrapper} hidden lg:block`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className={tableTh}>Client</th>
                <th className={tableTh}>Contact</th>
                <th className={tableTh}>Commandes</th>
                <th className={tableTh}>Favoris</th>
                <th className={tableTh}>Inscrit le</th>
                <th className={tableTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-stone-400">{debouncedSearch ? `Aucun résultat pour "${debouncedSearch}"` : 'Aucun client'}</td></tr>
              ) : clients.map((client) => (
                <tr key={client.id} className={tableRow}>
                  <td className={tableTd}>
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                        {client.avatar
                          ? <Image src={client.avatar} alt="" fill sizes="36px" className="rounded-full object-cover" />
                          : <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">{client.prenom[0]}{client.nom[0]}</span>
                        }
                      </div>
                      <div>
                        <p className="font-medium text-stone-800 dark:text-stone-100">{client.prenom} {client.nom}</p>
                        <p className="text-xs text-stone-400 font-mono">#{client.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className={tableTd}>
                    <p className="text-stone-700 dark:text-stone-200 text-sm">{client.email || '—'}</p>
                    {client.telephone
                      ? <a href={`tel:${client.telephone}`} className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />{client.telephone}
                        </a>
                      : <p className="text-xs text-stone-400">—</p>
                    }
                  </td>
                  <td className={tableTd}>
                    <span className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {client._count.orders} cmd
                    </span>
                  </td>
                  <td className={tableTd}>
                    <span className="bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                      <Heart className="w-3 h-3" />{client._count.favorites}
                    </span>
                  </td>
                  <td className={tableTd}>
                    <p className="text-stone-500 dark:text-stone-400 text-xs">
                      {new Date(client.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </td>
                  <td className={tableTd}>
                    <div className="flex gap-2">
                      <button onClick={() => openDetail(client)} className="bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Détails
                      </button>
                      <button onClick={() => setDeleteId(client.id)} className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 p-1.5 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards mobile */}
      <div className="lg:hidden space-y-3">
        {clients.map((client) => (
          <div key={client.id} className={`${cardSm} p-4 flex items-center gap-3`}>
            <div className="relative w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
              {client.avatar
                ? <Image src={client.avatar} alt="" fill sizes="40px" className="rounded-full object-cover" />
                : <span className="text-purple-600 font-bold text-sm">{client.prenom[0]}{client.nom[0]}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-800 dark:text-stone-100 truncate">{client.prenom} {client.nom}</p>
              <p className="text-xs text-stone-400 truncate">{client.email}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{client._count.orders} cmd</span>
                <span className="text-xs bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400 px-2 py-0.5 rounded-full">{client._count.favorites} ♥</span>
              </div>
            </div>
            <button onClick={() => openDetail(client)} className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              <Eye className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Modal détails */}
      {selectedClient && (
        <div className={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setSelectedClient(null) }}>
          <div className={`${modalBox} max-w-lg max-h-[90vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800 shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                  {selectedClient.avatar
                    ? <Image src={selectedClient.avatar} alt="" fill sizes="56px" className="rounded-full object-cover" />
                    : <span className="text-purple-600 dark:text-purple-400 font-bold text-xl">{selectedClient.prenom[0]}{selectedClient.nom[0]}</span>
                  }
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">{selectedClient.prenom} {selectedClient.nom}</h2>
                  <p className="text-xs font-mono text-stone-400">#{selectedClient.id.slice(-6).toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner cls="w-6 h-6 text-purple-600" />
                </div>
              ) : (
                <div className="p-6 space-y-3">
                  <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4">
                    <p className="text-xs text-stone-400 font-medium mb-1 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</p>
                    <p className="text-sm text-stone-800 dark:text-stone-100">{selectedClient.email || '—'}</p>
                  </div>
                  <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4">
                    <p className="text-xs text-stone-400 font-medium mb-1 flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Téléphone</p>
                    {selectedClient.telephone
                      ? <a href={`tel:${selectedClient.telephone}`} className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium">{selectedClient.telephone}</a>
                      : <p className="text-sm text-stone-800 dark:text-stone-100">—</p>
                    }
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedClient._count?.orders ?? 0}</p>
                      <p className="text-xs text-blue-500 mt-1">Commandes</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-red-500 dark:text-red-400">{selectedClient._count?.favorites ?? 0}</p>
                      <p className="text-xs text-red-400 mt-1">Favoris</p>
                    </div>
                  </div>
                  <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4">
                    <p className="text-xs text-stone-400 font-medium mb-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Inscrit le</p>
                    <p className="text-sm text-stone-800 dark:text-stone-100">
                      {new Date(selectedClient.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => setDeleteId(selectedClient.id)} className={`w-full ${btnDanger} flex items-center justify-center gap-2`}>
                    <Trash2 className="w-4 h-4" /> Supprimer ce client
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className={modalOverlay}>
          <div className={`${modalBox} max-w-sm p-6 text-center`}>
            <div className="w-14 h-14 bg-red-50 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">Supprimer ce client ?</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">Toutes ses commandes, favoris et messages seront supprimés.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className={`flex-1 ${btnSecondary}`}>Annuler</button>
              <button onClick={() => handleDelete(deleteId)} className={`flex-1 ${btnDangerSolid}`}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
