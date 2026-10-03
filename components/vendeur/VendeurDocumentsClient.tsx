'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { CheckCircle2, ClipboardList, Loader2, Paperclip, Upload, XCircle } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { usePhotoPicker } from '@/components/PhotoPicker'

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
  const { t } = useI18n()
  const d = t.seller.documents
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
        throw new Error(data.error || d.uploadFailed)
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
        throw new Error(data.error || d.submitError)
      }

      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, fichier: filename, statut: 'EN_ATTENTE', adminNote: null }
            : d
        )
      )
      setSuccess(d.submitted)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.genericError)
    } finally {
      setUploading(null)
    }
  }

  const docTargetRef = useRef<string | null>(null)
  const { open, picker } = usePhotoPicker({
    accept: 'image/jpeg,image/png,image/webp,application/pdf',
    allowsDocuments: true,
    onFiles: files => {
      const docId = docTargetRef.current
      if (files[0] && docId) handleFileChange(docId, files[0])
    },
  })

  const statutColor = (s: string) => {
    if (s === 'ACCEPTE')    return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
    if (s === 'REFUSE')     return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
    if (s === 'EN_ATTENTE') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
    return 'bg-gray-100 text-gray-600'
  }

  const statutLabel = (s: string) => {
    if (s === 'ACCEPTE')    return <><CheckCircle2 className="w-5 h-5" />{' '}{d.accepted}</>
    if (s === 'REFUSE')     return <><XCircle className="w-5 h-5" />{' '}{d.refused}</>
    if (s === 'EN_ATTENTE') return <><Loader2 className="w-4 h-4 animate-spin" />{' '}{d.pending}</>
    return s
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-xl w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <ClipboardList className="w-14 h-14" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {d.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {d.subtitle}
          </p>
          {vendeur.adminNote && (
            <div className="mt-3 text-xs bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 rounded-xl p-3 text-start">
              <span className="font-semibold">{d.teamNote}</span> {vendeur.adminNote}
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
                    {t.admin.sellers.docTypes[doc.type]?.label ?? doc.label}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t.admin.sellers.docTypes[doc.type]?.description ?? doc.description}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ms-2 ${statutColor(doc.statut)}`}>
                  {statutLabel(doc.statut)}
                </span>
              </div>

              {doc.adminNote && doc.statut === 'REFUSE' && (
                <div className="mb-3 text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg p-2">
                  <span className="font-semibold">{d.refusalReason}</span> {doc.adminNote}
                </div>
              )}

              {/* Indicateur fichier soumis (pas de lien public — l'admin voit dans son dashboard) */}
              {doc.fichier && (
                <div className="mb-2">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Paperclip className="w-4 h-4 inline me-1" />{' '}{d.fileSubmitted}
                  </span>
                </div>
              )}

              {doc.statut !== 'ACCEPTE' && (
                <button
                  type="button"
                  onClick={() => { docTargetRef.current = doc.id; open() }}
                  disabled={uploading === doc.id}
                  className="flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
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
                        {d.sending}
                      </>
                    ) : (
                      <><Upload className="w-4 h-4 inline me-1" />{' '}{doc.fichier ? d.replaceFile : d.chooseFile}</>
                    )}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
        {picker}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          {d.autoActivation}
        </p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            {t.seller.status.backToShopArrow}
          </Link>
        </div>
      </div>
    </div>
  )
}