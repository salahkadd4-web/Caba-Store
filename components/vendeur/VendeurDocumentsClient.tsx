'use client'

import { useState } from 'react'
import { CheckCircle2, ClipboardList, Loader2, Paperclip, Upload, XCircle } from 'lucide-react'

interface Doc {
  id: string
  type: string
  label: string
  description: string | null
  fichier: string | null
  statut: string
  adminNote: string | null
}

interface VendeurProfile {
  id: string
  adminNote: string | null
  documents: Doc[]
}

export default function VendeurDocumentsClient({ vendeur }: { vendeur: VendeurProfile }) {
  const [docs, setDocs]           = useState<Doc[]>(vendeur.documents)
  const [uploading, setUploading] = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const handleFileChange = async (docId: string, file: File) => {
    setUploading(docId)
    setError(null)
    setSuccess(null)

    try {
      // ── Étape 1 : upload local sécurisé ──────────────────
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/vendeur/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}))
        throw new Error(data.error || 'Échec de l\'envoi du fichier')
      }

      const { filename } = await uploadRes.json()

      // ── Étape 2 : associer le fichier au document ─────────
      const res = await fetch(`/api/vendeur/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors de la soumission')
      }

      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, fichier: filename, statut: 'EN_ATTENTE', adminNote: null }
            : d
        )
      )
      setSuccess('Document soumis avec succès. En attente de validation.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setUploading(null)
    }
  }

  const statutColor = (s: string) => {
    if (s === 'ACCEPTE')    return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
    if (s === 'REFUSE')     return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
    if (s === 'EN_ATTENTE') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
    return 'bg-gray-100 text-gray-600'
  }

  const statutLabel = (s: string) => {
    if (s === 'ACCEPTE')    return <><CheckCircle2 className="w-5 h-5" />{' '}Accepté</>
    if (s === 'REFUSE')     return <><XCircle className="w-5 h-5" />{' '}Refusé</>
    if (s === 'EN_ATTENTE') return <><Loader2 className="w-4 h-4 animate-spin" />{' '}En attente</>
    return s
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <ClipboardList className="w-14 h-14" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Pièces justificatives requises
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            L'admin vous demande de fournir les documents suivants pour activer votre compte.
          </p>
          {vendeur.adminNote && (
            <div className="mt-3 text-xs bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 rounded-xl p-3 text-left">
              <span className="font-semibold">Note de l'équipe :</span> {vendeur.adminNote}
            </div>
          )}
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-xl text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {doc.label}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {doc.description}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ml-2 ${statutColor(doc.statut)}`}>
                  {statutLabel(doc.statut)}
                </span>
              </div>

              {doc.adminNote && doc.statut === 'REFUSE' && (
                <div className="mb-3 text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg p-2">
                  <span className="font-semibold">Motif du refus :</span> {doc.adminNote}
                </div>
              )}

              {/* Indicateur fichier soumis (pas de lien public — l'admin voit dans son dashboard) */}
              {doc.fichier && (
                <div className="mb-2">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Paperclip className="w-4 h-4 inline mr-1" />{' '}Fichier soumis — en cours de révision par l'équipe
                  </span>
                </div>
              )}

              {doc.statut !== 'ACCEPTE' && (
                <label className={`
                  flex items-center gap-2 cursor-pointer
                  ${uploading === doc.id ? 'opacity-50 pointer-events-none' : ''}
                `}>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileChange(doc.id, file)
                    }}
                  />
                  <span className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all
                    bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300
                    hover:bg-emerald-100 dark:hover:bg-emerald-900
                    border border-emerald-200 dark:border-emerald-800
                  `}>
                    {uploading === doc.id ? (
                      <>
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Envoi en cours...
                      </>
                    ) : (
                      <><Upload className="w-4 h-4 inline mr-1" />{' '}{doc.fichier ? 'Remplacer le fichier' : 'Choisir un fichier'}</>
                    )}
                  </span>
                </label>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          Votre compte sera activé automatiquement dès que tous les documents seront acceptés.
        </p>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            ← Retour à la boutique
          </a>
        </div>
      </div>
    </div>
  )
}