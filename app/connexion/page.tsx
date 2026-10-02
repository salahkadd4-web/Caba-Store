/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { useState, Suspense, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import CabaLogo from '@/components/CabaLogo'
import GoogleIcon from '@/components/client/GoogleIcon'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useI18n } from '@/components/I18nProvider'

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
    <div className="mt-6 text-center">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
        <span className="text-[10px] text-stone-300 dark:text-stone-700 uppercase tracking-[0.25em]">{t.auth.or}</span>
        <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-orange-700 dark:hover:text-orange-500 transition-colors tracking-wide underline underline-offset-4"
      >
        {t.auth.signin.guest}
      </Link>
    </div>
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
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col lg:flex-row transition-colors duration-300">

      {/* ── Panneau gauche (desktop) ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-stone-900 dark:bg-stone-950 items-center justify-center p-12 border-e border-stone-800">
        {/* Logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <CabaLogo className="w-120 h-120 text-white" />
        </div>
        {/* Contenu centré */}
        <div className="relative z-10 text-center">
          <CabaLogo className="w-20 h-20 text-orange-500 mx-auto mb-6" />
          <div className="w-10 h-px bg-stone-700 mx-auto mb-5" />
          <p className="text-stone-400 font-light text-sm tracking-wider">
            {a.tagline}
          </p>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          <div className="flex justify-end mb-6 -mt-2">
            <LanguageSwitcher className="border border-stone-200 dark:border-stone-700" />
          </div>

          {/* Header */}
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-2">{s.welcome}</p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">{s.title}</h2>
            <div className="w-8 h-px bg-orange-700 dark:bg-orange-500 mt-4" />
          </div>

          {/* ── Bannière succès inscription client ── */}
          {inscription === 'client' && (
            <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-4 py-3 mb-6 rounded-xl space-y-1">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {s.clientCreated}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 tracking-wide">
                {s.clientCreatedDesc}
              </p>
            </div>
          )}

          {/* ── Bannière succès inscription vendeur ── */}
          {inscription === 'vendeur' && (
            <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-4 py-3 mb-6 rounded-xl space-y-1.5">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {s.shopCreated}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 tracking-wide">
                {s.shopCreatedDesc1}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 tracking-wide">
                {s.shopCreatedDesc2}
              </p>
            </div>
          )}

          {/* ── Bannière succès reset mot de passe ── */}
          {reset === 'success' && (
            <div className="border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs px-4 py-3 mb-6 rounded-xl tracking-wide">
              {s.passwordReset}
            </div>
          )}

          {/* ── Erreur ── */}
          {error && (
            <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 mb-6 rounded-xl tracking-wide">
              {error}
            </div>
          )}

          {/* ── Dev quick-login ── */}
          {IS_DEV && (
            <div className="border border-dashed border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 p-3 mb-6 rounded-xl">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400 mb-2 text-center">
                {s.devQuickLogin}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEV_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => quickLogin(acc)}
                    disabled={loading || loadingGoogle}
                    className="text-xs uppercase tracking-wider py-2 border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Bouton Google ── */}
          <button
            onClick={handleGoogle}
            disabled={loadingGoogle || loading}
            className="w-full flex items-center justify-center gap-3 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs uppercase tracking-[0.15em] py-3.5 rounded-xl transition-colors duration-300 disabled:opacity-50 mb-6"
          >
            {loadingGoogle
              ? <span className="w-4 h-4 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
              : <GoogleIcon />
            }
            {a.continueWithGoogle}
          </button>

          {/* ── Séparateur ── */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
            <span className="text-xs text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em]">{a.or}</span>
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
          </div>

          {/* ── Formulaire email/mdp ── */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-2">
                {s.identifier}
              </label>
              <input
                type="text"
                name="identifiant"
                value={form.identifiant}
                onChange={handleChange}
                required
                className="w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors duration-300"
                placeholder={s.identifierPlaceholder}
                dir="ltr"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  {s.password}
                </label>
                <Link
                  href="/recuperer-mot-de-passe"
                  className="text-xs text-stone-400 dark:text-stone-500 hover:text-orange-700 dark:hover:text-orange-500 transition-colors tracking-wide"
                >
                  {s.forgot}
                </Link>
              </div>
              <input
                type="password"
                name="motDePasse"
                value={form.motDePasse}
                onChange={handleChange}
                required
                className="w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors duration-300"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading || loadingGoogle}
              className="w-full bg-orange-700 hover:bg-orange-800 text-white text-xs uppercase tracking-[0.3em] py-4 rounded-xl transition-colors duration-300 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {s.loggingIn}</>
                : s.submit
              }
            </button>
          </form>

          {/* ── Lien inscription ── */}
          <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-8 tracking-wide">
            {s.noAccount}{' '}
            <Link
              href="/inscription"
              className="text-orange-700 dark:text-orange-500 hover:text-orange-800 dark:hover:text-orange-400 underline underline-offset-4 transition-colors font-medium"
            >
              {s.register}
            </Link>
          </p>

          <GuestLink />
        </div>

        {/* ── Logo mobile (bas de page) ── */}
        <div className="lg:hidden mt-12 flex flex-col items-center gap-3 pb-8">
          <div className="w-16 h-px bg-stone-200 dark:bg-stone-800" />
          <CabaLogo className="w-12 h-12 text-orange-700 dark:text-orange-500 opacity-60" />
          <p className="text-xs text-stone-300 dark:text-stone-700 uppercase tracking-[0.3em]">{t.common.appName}</p>
        </div>
      </div>
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin" />
      </div>
    }>
      <ConnexionContent />
    </Suspense>
  )
}