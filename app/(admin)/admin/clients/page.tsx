"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Calendar,
  Eye,
  Heart,
  Mail,
  Phone,
  Search,
  Trash2,
  X,
} from "lucide-react";

type Client = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  avatar: string | null;
  createdAt: string;
  _count: { orders: number; favorites: number };
  orders?: unknown[];
};

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const debouncedSearch = useDebounce(search, 350);
  const abortRef = useRef<AbortController | null>(null);

  const fetchClients = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    if (debouncedSearch) {
      setSearching(true);
    } else {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/clients?${params}`, {
        signal: abortRef.current.signal,
      });
      if (res.ok) setClients(await res.json());
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openDetail = async (client: Client) => {
    setSelectedClient(client);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`);
      if (res.ok) setSelectedClient(await res.json());
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
    setDeleteId(null);
    setSelectedClient(null);
    fetchClients();
  };

  if (loading && !searching) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-12">
        Chargement...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Clients ({clients.length})
        </h1>
      </div>

      {/* ── Recherche AJAX ───────────────────────────────────── */}
      <div className="mb-6">
        <div className="relative w-full max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {searching ? (
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <Search className="w-4 h-4" />
            )}
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, prénom, email, téléphone..."
            className="w-full pl-9 pr-8 border border-gray-300 dark:border-gray-700 rounded-lg py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {debouncedSearch && (
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            {clients.length} résultat{clients.length !== 1 ? "s" : ""} pour
            «&nbsp;{debouncedSearch}&nbsp;»
          </p>
        )}
      </div>

      {/* ── Tableau ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
              <tr>
                <th className="text-left px-6 py-4">Client</th>
                <th className="text-left px-6 py-4">Contact</th>
                <th className="text-left px-6 py-4">Commandes</th>
                <th className="text-left px-6 py-4">Favoris</th>
                <th className="text-left px-6 py-4">Inscrit le</th>
                <th className="text-left px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-gray-400 dark:text-gray-500"
                  >
                    {debouncedSearch
                      ? `Aucun résultat pour "${debouncedSearch}"`
                      : "Aucun client"}
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    {/* Identité */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                          {client.avatar ? (
                            <Image
                              src={client.avatar}
                              alt=""
                              fill
                              sizes="36px"
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">
                              {client.prenom[0]}
                              {client.nom[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-100">
                            {client.prenom} {client.nom}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            #{client.id.slice(-6).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <p className="text-gray-700 dark:text-gray-200">
                        {client.email || "—"}
                      </p>
                      {client.telephone ? (
                        <a
                          href={`tel:${client.telephone}`}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          <Phone className="w-4 h-4 inline mr-1" />{" "}
                          {client.telephone}
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          —
                        </p>
                      )}
                    </td>

                    {/* Commandes */}
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-semibold px-2 py-1 rounded-full">
                        {client._count.orders} commande
                        {client._count.orders > 1 ? "s" : ""}
                      </span>
                    </td>

                    {/* Favoris */}
                    <td className="px-6 py-4">
                      <span className="bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400 text-xs font-semibold px-2 py-1 rounded-full">
                        <Heart className="w-4 h-4 inline mr-1" />{" "}
                        {client._count.favorites}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                      {new Date(client.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetail(client)}
                          className="bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900 px-3 py-1 rounded-lg text-xs font-medium transition"
                        >
                          <Eye className="w-4 h-4 inline mr-1" /> Détails
                        </button>
                        <button
                          onClick={() => setDeleteId(client.id)}
                          className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 px-3 py-1 rounded-lg text-xs font-medium transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Détails Client ─────────────────────────────── */}
      {selectedClient && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedClient(null);
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                  {selectedClient.avatar ? (
                    <Image
                      src={selectedClient.avatar}
                      alt=""
                      fill
                      sizes="56px"
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-purple-600 dark:text-purple-400 font-bold text-xl">
                      {selectedClient.prenom[0]}
                      {selectedClient.nom[0]}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    {selectedClient.prenom} {selectedClient.nom}
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    #{selectedClient.id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body scrollable */}
            <div className="overflow-y-auto flex-1">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <svg
                    className="animate-spin w-6 h-6 text-purple-600 dark:text-purple-400"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </div>
              ) : (
                <div className="p-6 space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                      <Mail className="w-4 h-4 inline mr-1" /> Email
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-100">
                      {selectedClient.email || "—"}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                      <Phone className="w-4 h-4 inline mr-1" /> Téléphone
                    </p>
                    {selectedClient.telephone ? (
                      <a
                        href={`tel:${selectedClient.telephone}`}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium"
                      >
                        {selectedClient.telephone}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-800 dark:text-gray-100">
                        —
                      </p>
                    )}
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {selectedClient._count?.orders ?? 0}
                      </p>
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                        Commandes
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-red-500 dark:text-red-400">
                        {selectedClient._count?.favorites ?? 0}
                      </p>
                      <p className="text-xs text-red-400 dark:text-red-500 mt-1">
                        Favoris
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" /> Inscrit le
                    </p>
                    <p className="text-sm text-gray-800 dark:text-gray-100">
                      {new Date(selectedClient.createdAt).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    </p>
                  </div>

                  {/* Retours gérés via Flowmerce */}
                  <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-0.5">
                        Retours
                      </p>
                      <p className="text-xs text-orange-500 dark:text-orange-400">
                        Les retours de ce client sont gérés via Flowmerce.
                      </p>
                    </div>
                    <a
                      href={
                        process.env.NEXT_PUBLIC_FLOWMERCE_DASHBOARD_URL ??
                        "https://flowmerce.com"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      Voir →
                    </a>
                  </div>

                  <button
                    onClick={() => setDeleteId(selectedClient.id)}
                    className="w-full bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 font-semibold py-2.5 rounded-xl text-sm transition"
                  >
                    <Trash2 className="w-4 h-4 inline mr-1" /> Supprimer ce
                    client
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmation Suppression ───────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center border border-gray-100 dark:border-gray-800">
            <Trash2 className="w-4 h-4" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Supprimer ce client ?
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Toutes ses commandes, favoris et messages seront supprimés.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
