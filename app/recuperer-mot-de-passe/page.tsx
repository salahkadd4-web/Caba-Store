'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Lock, Mail, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import {
  AuthActions, AuthAlert, AuthField, AuthScreen, OtpInput, PasswordField, RuleChips, Spinner,
  authLink, authPrimaryBtn,
} from '@/components/auth/AuthUI'

type Etape = 'demande' | 'verification' | 'nouveau'

const pwdRules = [
  { id: 'length',  test: (p: string) => p.length >= 8 },
  { id: 'upper',   test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const

export default function RecupererMotDePassePage() {
  const router = useRouter()
  const { t } = useI18n()
  const r = t.auth.reset
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
      setSuccess(r.codeSent)
      setEtape('verification')
    } catch { setError(t.common.serverError) } finally { setLoading(false) }
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
    } catch { setError(t.common.serverError) } finally { setLoading(false) }
  }

  // Étape 3 — Nouveau mot de passe
  const handleNouveau = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!pwdRules.every(r => r.test(nouveauMotDePasse))) {
      setError(r.passwordInvalid)
      return
    }
    if (nouveauMotDePasse !== confirmerMotDePasse) {
      setError(r.passwordsDontMatch)
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
    } catch { setError(t.common.serverError) } finally { setLoading(false) }
  }

  const numeroEtape = { demande: 1, verification: 2, nouveau: 3 }[etape]
  const titre    = { demande: r.titleRequest, verification: r.titleVerify, nouveau: r.titleNew }[etape]
  const sousTitre = { demande: r.subRequest, verification: r.subVerify, nouveau: r.subNew }[etape]
  const retour = etape === 'verification'
    ? () => { setEtape('demande'); setError(''); setCode('') }
    : etape === 'nouveau'
      ? () => { setEtape('verification'); setError('') }
      : undefined
  const reglesMdp = pwdRules.map(rule => ({ ok: rule.test(nouveauMotDePasse), label: t.password.rules[rule.id] }))
  const statutId = checkingId
    ? <Spinner />
    : idStatus === 'found'    ? <Check className="w-5 h-5 text-emerald-600" aria-hidden="true" />
    : idStatus === 'notfound' ? <X className="w-5 h-5 text-red-500" aria-hidden="true" />
    : null

  return (
    <AuthScreen
      title={titre}
      subtitle={sousTitre}
      step={{ current: numeroEtape, total: 3 }}
      backHref="/connexion"
      onBack={retour}
      below={<Link href="/connexion" className={authLink}>{r.backToLogin}</Link>}
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      {success && <AuthAlert tone="success">{success}</AuthAlert>}

      {/* ── Étape 1 : identifiant ── */}
      {etape === 'demande' && (
        <form onSubmit={handleDemande} className="space-y-4">
          <AuthField
            id="identifiant"
            label={r.identifier}
            icon={Mail}
            inputMode="email"
            autoComplete="username"
            value={identifiant}
            onChange={e => { setIdentifiant(e.target.value); setIdStatus('idle') }}
            placeholder={r.identifierPlaceholder}
            dir="ltr"
            required
            tone={idStatus === 'found' ? 'ok' : idStatus === 'notfound' ? 'error' : 'default'}
            end={statutId}
            hint={
              idStatus === 'found' ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{r.accountFound}</p>
              : idStatus === 'notfound' ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {r.accountNotFound}.{' '}<Link href="/inscription" className={authLink}>{r.register}</Link>
                </p>
              ) : null
            }
          />
          <AuthActions>
            <button type="submit" disabled={loading || idStatus !== 'found'} className={authPrimaryBtn}>
              {loading ? <><Spinner light /> {r.sendingCode}</> : r.sendCode}
            </button>
            <p className="md:hidden text-center text-sm"><Link href="/connexion" className={authLink}>{r.backToLogin}</Link></p>
          </AuthActions>
        </form>
      )}

      {/* ── Étape 2 : code ── */}
      {etape === 'verification' && (
        <form onSubmit={handleVerification} className="space-y-4">
          <OtpInput value={code} onChange={setCode} label={r.verificationCode} />
          <AuthActions>
            <button type="submit" disabled={loading || code.length < 6} className={authPrimaryBtn}>
              {loading ? <><Spinner light /> {t.auth.verifying}</> : r.verifyCode}
            </button>
            <button type="button" onClick={() => { setEtape('demande'); setError(''); setCode('') }}
              className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-orange-700 py-2">
              {t.common.backWithArrow}
            </button>
          </AuthActions>
        </form>
      )}

      {/* ── Étape 3 : nouveau mot de passe ── */}
      {etape === 'nouveau' && (
        <form onSubmit={handleNouveau} className="space-y-4">
          <PasswordField
            id="nouveauMotDePasse"
            label={r.newPassword}
            icon={Lock}
            autoComplete="new-password"
            value={nouveauMotDePasse}
            onChange={e => setNouveauMotDePasse(e.target.value)}
            placeholder={r.newPasswordPlaceholder}
            required
            hint={nouveauMotDePasse ? <div className="pt-1"><RuleChips rules={reglesMdp} /></div> : null}
          />
          <PasswordField
            id="confirmerMotDePasse"
            label={r.confirmPassword}
            icon={Lock}
            autoComplete="new-password"
            value={confirmerMotDePasse}
            onChange={e => setConfirmerMotDePasse(e.target.value)}
            placeholder={r.repeatPassword}
            required
            tone={confirmerMotDePasse ? (nouveauMotDePasse === confirmerMotDePasse ? 'ok' : 'error') : 'default'}
            hint={
              confirmerMotDePasse ? (
                nouveauMotDePasse === confirmerMotDePasse
                  ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{r.passwordsMatch}</p>
                  : <p className="text-sm text-red-600 dark:text-red-400">{r.passwordsDontMatch}</p>
              ) : null
            }
          />
          <AuthActions>
            <button type="submit" disabled={loading || !pwdRules.every(rule => rule.test(nouveauMotDePasse))} className={authPrimaryBtn}>
              {loading ? <><Spinner light /> {r.updating}</> : r.update}
            </button>
          </AuthActions>
        </form>
      )}
    </AuthScreen>
  )
}
