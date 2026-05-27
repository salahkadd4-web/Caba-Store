'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, X } from 'lucide-react'

type Etape = 'demande' | 'verification' | 'nouveau'

const pwdRules = [
  { id: 'length',  label: 'Au moins 8 caractères',         test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'Au moins une lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Au moins une lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'Au moins un chiffre',           test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Au moins un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      {pwdRules.map((rule) => {
        const ok = rule.test(password)
        return (
          <div key={rule.id} className="flex items-center gap-2">
            <span className={`text-xs transition-colors ${ok ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-600'}`}>
              {ok ? <Check className="w-4 h-4" /> : '○'}
            </span>
            <span className={`text-xs transition-colors ${ok ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'}`}>
              {rule.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function RecupererMotDePassePage() {
  const router = useRouter()
  const [etape, setEtape] = useState<Etape>('demande')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [identifiant, setIdentifiant] = useState('')
  const [code, setCode] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState('')

  // AJAX — vérification identifiant
  const [checkingId, setCheckingId] = useState(false)
  const [idStatus, setIdStatus] = useState<'idle' | 'found' | 'notfound'>('idle')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Vérification AJAX avec debounce 600ms
  useEffect(() => {
    if (!identifiant.trim()) {
      setIdStatus('idle')
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setCheckingId(true)
      try {
        const res = await fetch('/api/auth/verifier-identifiant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiant: identifiant.trim() }),
        })
        const data = await res.json()
        setIdStatus(data.exists ? 'found' : 'notfound')
      } catch {
        setIdStatus('idle')
      } finally {
        setCheckingId(false)
      }
    }, 600)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [identifiant])

  // Étape 1 — Demande du code
  const handleDemande = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/demande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiant }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Code envoyé ! Vérifiez votre email ou téléphone.')
      setEtape('verification')
    } catch { setError('Erreur serveur') } finally { setLoading(false) }
  }

  // Étape 2 — Vérification du code
  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/verifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiant, code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('')
      setEtape('nouveau')
    } catch { setError('Erreur serveur') } finally { setLoading(false) }
  }

  // Étape 3 — Nouveau mot de passe
  const handleNouveau = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!pwdRules.every(r => r.test(nouveauMotDePasse))) {
      setError('Le mot de passe ne respecte pas toutes les conditions')
      return
    }
    if (nouveauMotDePasse !== confirmerMotDePasse) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/nouveau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiant, code, nouveauMotDePasse }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/connexion?reset=success')
    } catch { setError('Erreur serveur') } finally { setLoading(false) }
  }

  const inputClass = "w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-orange-700 dark:focus:border-orange-500 transition"
  const labelClass = "block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center px-4 transition-colors">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-md w-full max-w-md p-8">

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['demande', 'verification', 'nouveau'] as Etape[]).map((e, i) => {
            const etapeIndex = ['demande', 'verification', 'nouveau'].indexOf(etape)
            return (
              <div key={e} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                  etape === e         ? 'bg-orange-700 text-white' :
                  etapeIndex > i      ? 'bg-green-500 text-white' :
                  'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                }`}>
                  {etapeIndex > i ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-0.5 ${etapeIndex > i ? 'bg-green-500' : 'bg-stone-200 dark:bg-stone-700'}`} />}
              </div>
            )
          })}
        </div>

        <h1 className="text-2xl font-bold text-center text-stone-800 dark:text-stone-100 mb-1">
          {etape === 'demande'      && 'Mot de passe oublié'}
          {etape === 'verification' && 'Vérification'}
          {etape === 'nouveau'      && 'Nouveau mot de passe'}
        </h1>
        <p className="text-center text-sm text-stone-500 dark:text-stone-400 mb-6">
          {etape === 'demande'      && 'Entrez votre email ou téléphone'}
          {etape === 'verification' && 'Entrez le code reçu'}
          {etape === 'nouveau'      && 'Choisissez un nouveau mot de passe sécurisé'}
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm px-4 py-3 rounded-xl mb-4">
            {success}
          </div>
        )}

        {/* ── Étape 1 ─────────────────────────────────── */}
        {etape === 'demande' && (
          <form onSubmit={handleDemande} className="space-y-4">
            <div>
              <label className={labelClass}>Email ou téléphone</label>
              <div className="relative">
                <input
                  type="text"
                  value={identifiant}
                  onChange={(e) => { setIdentifiant(e.target.value); setIdStatus('idle') }}
                  required
                  className={`${inputClass} pr-10 ${
                    idStatus === 'found'    ? 'border-green-400 dark:border-green-600 focus:ring-green-400' :
                    idStatus === 'notfound' ? 'border-red-400 dark:border-red-600 focus:ring-red-400' : ''
                  }`}
                  placeholder="votre@email.com ou 05XX XX XX XX"
                />
                {/* Indicateur AJAX */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingId && (
                    <svg className="animate-spin w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  )}
                  {!checkingId && idStatus === 'found' && (
                    <span className="text-green-500 text-lg"><Check className="w-4 h-4" /></span>
                  )}
                  {!checkingId && idStatus === 'notfound' && (
                    <span className="text-red-500 text-lg"><X className="w-4 h-4" /></span>
                  )}
                </div>
              </div>

              {/* Message sous le champ */}
              {idStatus === 'found' && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1"><Check className="w-4 h-4 inline mr-1" />{' '}Compte trouvé</p>
              )}
              {idStatus === 'notfound' && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1"><X className="w-4 h-4 inline mr-1" />{' '}Aucun compte associé à cet identifiant</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || idStatus !== 'found'}
              className="w-full bg-orange-700 hover:bg-orange-800 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le code'}
            </button>

            {idStatus === 'notfound' && (
              <p className="text-center text-xs text-stone-400 dark:text-stone-500">
                Pas encore de compte ?{' '}
                <Link href="/inscription" className="text-orange-700 dark:text-orange-500 hover:underline">S&apos;inscrire</Link>
              </p>
            )}
          </form>
        )}

        {/* ── Étape 2 ─────────────────────────────────── */}
        {etape === 'verification' && (
          <form onSubmit={handleVerification} className="space-y-4">
            <div>
              <label className={labelClass}>Code de vérification</label>
              <input
                type="text" value={code}
                onChange={(e) => setCode(e.target.value)}
                required maxLength={6}
                className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl px-3 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-700 dark:focus:border-orange-500 transition"
                placeholder="000000"
              />
            </div>
            <button type="submit" disabled={loading || code.length < 6}
              className="w-full bg-orange-700 hover:bg-orange-800 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
              {loading ? 'Vérification...' : 'Vérifier le code'}
            </button>
            <button type="button" onClick={() => { setEtape('demande'); setError(''); setCode('') }}
              className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-500 transition">
              ← Retour
            </button>
          </form>
        )}

        {/* ── Étape 3 ─────────────────────────────────── */}
        {etape === 'nouveau' && (
          <form onSubmit={handleNouveau} className="space-y-4">
            <div>
              <label className={labelClass}>Nouveau mot de passe</label>
              <input
                type="password" value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                required className={inputClass} placeholder="Minimum 8 caractères"
              />
              <PasswordStrength password={nouveauMotDePasse} />
            </div>
            <div>
              <label className={labelClass}>Confirmer le mot de passe</label>
              <input
                type="password" value={confirmerMotDePasse}
                onChange={(e) => setConfirmerMotDePasse(e.target.value)}
                required className={inputClass} placeholder="Répétez le mot de passe"
              />
              {confirmerMotDePasse && nouveauMotDePasse !== confirmerMotDePasse && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
              )}
              {confirmerMotDePasse && nouveauMotDePasse === confirmerMotDePasse && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1"><Check className="w-4 h-4 inline mr-1" />{' '}Les mots de passe correspondent</p>
              )}
            </div>
            <button type="submit" disabled={loading || !pwdRules.every(r => r.test(nouveauMotDePasse))}
              className="w-full bg-orange-700 hover:bg-orange-800 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-6">
          <Link href="/connexion" className="text-orange-700 dark:text-orange-500 hover:underline font-medium">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
