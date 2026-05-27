/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import { useState, Suspense, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import CabaLogo from '@/components/CabaLogo'

const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''

const IS_DEV = process.env.NODE_ENV !== 'production'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

const DEV_ACCOUNTS = [
  { role: 'admin',   label: 'Admin'   },
  { role: 'vendeur', label: 'Vendeur' },
  { role: 'client',  label: 'Client'  },
] as const

function GuestLink() {
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
        <span className="text-[10px] text-stone-300 dark:text-stone-700 uppercase tracking-[0.25em]">ou</span>
        <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-orange-700 dark:hover:text-orange-500 transition-colors tracking-wide underline underline-offset-4"
      >
        Parcourir en tant qu&apos;invité
      </Link>
    </div>
  )
}

function ConnexionContent() {
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
            setError('Ce compte utilise la connexion Google. Connectez-vous avec le bouton Google.')
          } else {
            setError('Identifiant ou mot de passe incorrect.')
          }
        } else {
          setError('Identifiant ou mot de passe incorrect.')
        }
        return
      }

      if (result?.ok) {
        const res     = await fetch('/api/auth/session')
        const session = await res.json()

        if (session?.user?.role === 'ADMIN')        router.push('/admin')
        else if (session?.user?.role === 'VENDEUR') router.push('/vendeur')
        else                                         router.push('/')

        router.refresh()
      }
    } catch {
      setError('Erreur serveur, veuillez réessayer.')
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
          setError('Impossible de récupérer le token Google.')
          return
        }

        const res  = await fetch('/api/auth/google-native', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ idToken: googleResult.idToken }),
        })
        const data = await res.json()

        if (!res.ok || !data.ok) {
          setError(data.error || 'Erreur connexion Google.')
          return
        }

        if (data.exists) {
          const signInResult = await signIn('credentials-google', {
            userId:   data.userId,
            redirect: false,
          })

          if (signInResult?.ok) {
            const sessionRes = await fetch('/api/auth/session')
            const session    = await sessionRes.json()

            if (session?.user?.role === 'ADMIN')        router.push('/admin')
            else if (session?.user?.role === 'VENDEUR') router.push('/vendeur')
            else                                         router.push('/')

            router.refresh()
          } else {
            setError('Erreur de session. Veuillez réessayer.')
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
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-stone-900 dark:bg-stone-950 items-center justify-center p-12 border-r border-stone-800">
        {/* Logo watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <CabaLogo className="w-120 h-120 text-white" />
        </div>
        {/* Contenu centré */}
        <div className="relative z-10 text-center">
          <CabaLogo className="w-20 h-20 text-orange-500 mx-auto mb-6" />
          <div className="w-10 h-px bg-stone-700 mx-auto mb-5" />
          <p className="text-stone-400 font-light text-sm tracking-wider">
            L&apos;excellence à portée de main
          </p>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          {/* Header */}
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-2">Bienvenue</p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Connexion</h2>
            <div className="w-8 h-px bg-orange-700 dark:bg-orange-500 mt-4" />
          </div>

          {/* ── Bannière succès inscription client ── */}
          {inscription === 'client' && (
            <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-4 py-3 mb-6 rounded-xl space-y-1">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Compte créé avec succès !
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 tracking-wide">
                Connectez-vous pour accéder à votre espace.
              </p>
            </div>
          )}

          {/* ── Bannière succès inscription vendeur ── */}
          {inscription === 'vendeur' && (
            <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 px-4 py-3 mb-6 rounded-xl space-y-1.5">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Boutique créée avec succès !
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 tracking-wide">
                Votre compte vendeur sera activé après validation par notre équipe.
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 tracking-wide">
                Connectez-vous dès maintenant pour accéder à votre espace.
              </p>
            </div>
          )}

          {/* ── Bannière succès reset mot de passe ── */}
          {reset === 'success' && (
            <div className="border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs px-4 py-3 mb-6 rounded-xl tracking-wide">
              Mot de passe mis à jour avec succès.
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
                Dev — Connexion rapide
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
            Continuer avec Google
          </button>

          {/* ── Séparateur ── */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
            <span className="text-xs text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em]">ou</span>
            <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
          </div>

          {/* ── Formulaire email/mdp ── */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-2">
                Email ou Téléphone
              </label>
              <input
                type="text"
                name="identifiant"
                value={form.identifiant}
                onChange={handleChange}
                required
                className="w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors duration-300"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
                  Mot de Passe
                </label>
                <Link
                  href="/recuperer-mot-de-passe"
                  className="text-xs text-stone-400 dark:text-stone-500 hover:text-orange-700 dark:hover:text-orange-500 transition-colors tracking-wide"
                >
                  Oublié ?
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
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connexion...</>
                : 'Se Connecter'
              }
            </button>
          </form>

          {/* ── Lien inscription ── */}
          <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-8 tracking-wide">
            Pas encore de compte ?{' '}
            <Link
              href="/inscription"
              className="text-orange-700 dark:text-orange-500 hover:text-orange-800 dark:hover:text-orange-400 underline underline-offset-4 transition-colors font-medium"
            >
              S&apos;inscrire
            </Link>
          </p>

          <GuestLink />
        </div>

        {/* ── Logo mobile (bas de page) ── */}
        <div className="lg:hidden mt-12 flex flex-col items-center gap-3 pb-8">
          <div className="w-16 h-px bg-stone-200 dark:bg-stone-800" />
          <CabaLogo className="w-12 h-12 text-orange-700 dark:text-orange-500 opacity-60" />
          <p className="text-xs text-stone-300 dark:text-stone-700 uppercase tracking-[0.3em]">Caba Store</p>
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
