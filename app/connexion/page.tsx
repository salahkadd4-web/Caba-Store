/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { useState, Suspense, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, Lock, Mail } from 'lucide-react'
import GoogleIcon from '@/components/client/GoogleIcon'
import { useI18n } from '@/components/I18nProvider'
import {
  AuthActions, AuthAlert, AuthDivider, AuthField, AuthScreen, PasswordField, Spinner,
  authLink, authPrimaryBtn, authSecondaryBtn,
} from '@/components/auth/AuthUI'

const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''

const IS_DEV = process.env.NODE_ENV !== 'production'

const DEV_ACCOUNTS = [
  { role: 'admin',   label: 'Admin'   },
  { role: 'vendeur', label: 'Vendeur' },
  { role: 'client',  label: 'Client'  },
] as const

function GuestLink() {
  const { t } = useI18n()
  const [isNative, setIsNative] = useState(false)

  useEffect(() => {
    import('@capacitor/core')
      .then(({ Capacitor }) => setIsNative(Capacitor.isNativePlatform()))
      .catch(() => {})
  }, [])

  if (!isNative) return null

  return (
    <p className="text-center">
      <Link href="/" className="text-sm text-stone-500 dark:text-stone-400 underline underline-offset-4 hover:text-orange-700">
        {t.auth.signin.guest}
      </Link>
    </p>
  )
}

function ConnexionContent() {
  const { t } = useI18n()
  const a = t.auth
  const s = t.auth.signin
  const router       = useRouter()
  const searchParams = useSearchParams()
  const inscription  = searchParams.get('inscription')
  const reset        = searchParams.get('reset')

  const [loading,       setLoading]       = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error,         setError]         = useState('')
  const [form,          setForm]          = useState({ identifiant: '', motDePasse: '' })

  useEffect(() => {
    const initGoogle = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return
        const { SocialLogin } = await import('@capgo/capacitor-social-login')
        await SocialLogin.initialize({ google: { webClientId: GOOGLE_WEB_CLIENT_ID } })
      } catch (e) {
        console.error('SocialLogin init error:', e)
      }
    }
    initGoogle()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const identifiantNormalized = form.identifiant.trim().replace(/\s/g, '').toLowerCase()

      const result = await signIn('credentials', {
        identifiant: identifiantNormalized,
        motDePasse:  form.motDePasse,
        redirect:    false,
      })

      if (result?.error) {
        if (result.error === 'CredentialsSignin') {
          const checkRes = await fetch('/api/auth/verifier-identifiant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifiant: identifiantNormalized }),
          })
          const checkData = await checkRes.json()
          if (checkData.isGoogleAccount) {
            setError(s.googleAccount)
          } else {
            setError(s.badCredentials)
          }
        } else if (result.error === 'Configuration') {
          setError(s.configError)
        } else {
          setError(s.errorPrefix(result.error))  // ← montre le vrai message pour déboguer
        }
        return
      }

      if (result?.ok) {
        // Rechargement complet pour lire le cookie de session fraîchement posé
        // et éviter tout problème de cache côté client.
        const res     = await fetch('/api/auth/session', { cache: 'no-store' })
        const session = await res.json()

        if (session?.user?.role === 'ADMIN')        window.location.href = '/admin'
        else if (session?.user?.role === 'VENDEUR') window.location.href = '/vendeur'
        else                                         window.location.href = '/'
      }
    } catch {
      setError(a.serverRetry)
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (acc: typeof DEV_ACCOUNTS[number]) => {
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/dev-login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: acc.role }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        setError(`[DEV] Connexion ${acc.label} indisponible.`)
        return
      }

      if (data.role === 'ADMIN')        router.push('/admin')
      else if (data.role === 'VENDEUR') router.push('/vendeur')
      else                               router.push('/')
      router.refresh()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur'
      setError(`[DEV] ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoadingGoogle(true)
    setError('')
    try {
      const { Capacitor } = await import('@capacitor/core')

      if (Capacitor.isNativePlatform()) {
        // @ts-ignore
        const { SocialLogin } = await import('@capgo/capacitor-social-login')

        const result = await SocialLogin.login({
          provider: 'google',
          options:  { scopes: ['email', 'profile'] },
        })

        const googleResult = result.result
        if (!googleResult || !('idToken' in googleResult) || !googleResult.idToken) {
          setError(a.googleTokenError)
          return
        }

        const res  = await fetch('/api/auth/google-native', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ idToken: googleResult.idToken }),
        })
        const data = await res.json()

        if (!res.ok || !data.ok) {
          setError(data.error || a.googleError)
          return
        }

        if (data.exists) {
          const signInResult = await signIn('credentials-google', {
            userId:   data.userId,
            redirect: false,
          })

          if (signInResult?.ok) {
            const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' })
            const session    = await sessionRes.json()

            if (session?.user?.role === 'ADMIN')        window.location.href = '/admin'
            else if (session?.user?.role === 'VENDEUR') window.location.href = '/vendeur'
            else                                         window.location.href = '/'
          } else {
            setError(a.sessionError)
          }
        } else {
          router.push(`/inscription/finaliser-google?token=${data.tempToken}`)
        }
      } else {
        await signIn('google', { callbackUrl: '/' })
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as { message?: string; code?: string }
        setError(errorObj.message || errorObj.code || JSON.stringify(err))
      } else {
        setError(String(err))
      }
    } finally {
      setLoadingGoogle(false)
    }
  }

  return (
    <AuthScreen
      title={s.title}
      subtitle={s.subtitle}
      backIcon="close"
      below={
        <p>
          {s.noAccount}{' '}
          <Link href="/inscription" className={authLink}>{s.register}</Link>
        </p>
      }
    >
      {/* ── Bannières ── */}
      {inscription === 'client' && (
        <AuthAlert tone="success">
          <p className="font-medium flex items-center gap-1.5"><Check className="w-4 h-4" />{s.clientCreated}</p>
          <p>{s.clientCreatedDesc}</p>
        </AuthAlert>
      )}
      {inscription === 'vendeur' && (
        <AuthAlert tone="success">
          <p className="font-medium flex items-center gap-1.5"><Check className="w-4 h-4" />{s.shopCreated}</p>
          <p>{s.shopCreatedDesc1}</p>
          <p>{s.shopCreatedDesc2}</p>
        </AuthAlert>
      )}
      {reset === 'success' && <AuthAlert tone="info">{s.passwordReset}</AuthAlert>}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      {/* ── Connexion rapide (développement uniquement) ── */}
      {IS_DEV && (
        <div className="border border-dashed border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl">
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-2 text-center">{s.devQuickLogin}</p>
          <div className="grid grid-cols-3 gap-2">
            {DEV_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => quickLogin(acc)}
                disabled={loading || loadingGoogle}
                className="text-xs py-2 border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl transition-colors disabled:opacity-50"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Formulaire ── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="identifiant"
          name="identifiant"
          type="text"
          inputMode="email"
          autoComplete="username"
          label={s.identifier}
          icon={Mail}
          value={form.identifiant}
          onChange={handleChange}
          placeholder={s.identifierPlaceholder}
          dir="ltr"
          required
        />
        <PasswordField
          id="motDePasse"
          name="motDePasse"
          autoComplete="current-password"
          label={s.password}
          labelAside={<Link href="/recuperer-mot-de-passe" className={`text-sm ${authLink}`}>{s.forgot}</Link>}
          icon={Lock}
          value={form.motDePasse}
          onChange={handleChange}
          placeholder="••••••••"
          required
        />

        <AuthActions>
          <button type="submit" disabled={loading || loadingGoogle} className={authPrimaryBtn}>
            {loading ? <><Spinner light /> {s.loggingIn}</> : s.submit}
          </button>
          <div className="hidden md:block"><AuthDivider /></div>
          <button type="button" onClick={handleGoogle} disabled={loadingGoogle || loading} className={authSecondaryBtn}>
            {loadingGoogle ? <Spinner /> : <GoogleIcon />}
            {a.continueWithGoogle}
          </button>
          {/* Lien d'inscription : dans la barre du bas sur téléphone, sous la carte sur ordinateur */}
          <p className="md:hidden text-center text-sm text-stone-500 dark:text-stone-400">
            {s.noAccount}{' '}
            <Link href="/inscription" className={authLink}>{s.register}</Link>
          </p>
          <GuestLink />
        </AuthActions>
      </form>
    </AuthScreen>
  )
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white md:bg-[#f3f0ec] dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin" />
      </div>
    }>
      <ConnexionContent />
    </Suspense>
  )
}