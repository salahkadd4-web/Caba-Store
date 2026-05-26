'use client'

// app/(client)/inscription/finaliser-google/page.tsx
//
// Étape de finalisation pour les NOUVEAUX utilisateurs qui se connectent via Google.
// Flow :
//   1. Saisie du téléphone + choix du rôle (CLIENT / VENDEUR)
//   2. Vérification OTP par SMS
//   3. Création du compte → signIn('credentials-google') → redirection

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Phone, ShieldCheck, Store, User } from 'lucide-react'

function FinaliserGoogleContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tempToken    = searchParams.get('token') ?? ''

  const [etape,      setEtape]      = useState<1 | 2>(1)
  const [role,       setRole]       = useState<'CLIENT' | 'VENDEUR'>('CLIENT')
  const [telephone,  setTelephone]  = useState('')
  const [code,       setCode]       = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [testMode,   setTestMode]   = useState(false)

  // Sécurité : si pas de token → rediriger vers connexion
  useEffect(() => {
    if (!tempToken || !/^[a-f0-9]{64}$/.test(tempToken)) {
      router.replace('/connexion')
    }
  }, [tempToken, router])

  const phoneValid = /^(05|06|07)\d{8}$/.test(telephone.replace(/\s/g, ''))

  // ── Étape 1 : envoi OTP ───────────────────────────────────────────────────
  const handleEtape1 = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/google-finaliser', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ etape: 1, tempToken, telephone, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTestMode(!!data.testMode)
      setEtape(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setLoading(false)
    }
  }

  // ── Étape 2 : vérification OTP + création compte + session ───────────────
  const handleEtape2 = async () => {
    setLoading(true); setError(null)
    try {
      // 1. Vérifier l'OTP et créer le compte
      const res  = await fetch('/api/auth/google-finaliser', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ etape: 2, tempToken, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // 2. Créer la session NextAuth
      const signInResult = await signIn('credentials-google', {
        userId:   data.userId,
        redirect: false,
      })

      if (!signInResult?.ok) {
        throw new Error('Impossible de créer la session. Veuillez vous reconnecter.')
      }

      // 3. Redirection selon le rôle souhaité
      if (data.role === 'VENDEUR') {
        // Phone already verified → skip phone step in finaliser-vendeur
        router.push('/inscription/finaliser-vendeur?skipPhone=true')
      } else {
        router.push('/')
      }
      router.refresh()

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setLoading(false)
    }
  }

  // ── Stepper ───────────────────────────────────────────────────────────────
  const Stepper = () => (
    <div className="flex items-center gap-3 mb-10">
      {([
        { n: 1, label: 'Téléphone & Rôle' },
        { n: 2, label: 'Confirmation SMS' },
      ] as const).map(({ n, label }) => (
        <div key={n} className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-6 h-6 text-xs font-light transition-colors duration-300 ${
            etape === n
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : n < etape
              ? 'border border-black dark:border-white text-black dark:text-white'
              : 'border border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600'
          }`}>
            {n < etape ? <Check className="w-4 h-4" /> : n}
          </div>
          <span className={`text-xs uppercase tracking-[0.2em] hidden sm:block transition-colors duration-300 ${
            etape === n ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-600'
          }`}>
            {label}
          </span>
          {n < 2 && <div className="w-8 h-px bg-gray-200 dark:bg-gray-800" />}
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row transition-colors duration-300">

      {/* ── Panneau gauche (desktop) ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-black dark:bg-gray-900 items-center justify-center p-12 border-r border-gray-800">
        <div className="absolute z-10 mask-[radial-gradient(ellipse_at_center,transparent_-50%,black_10%)]">
          <Image src="/logo_noir.png" alt="" width={750} height={750}
            className="object-contain invert opacity-30 scale-150" priority />
        </div>
        <div className="relative z-10 text-center text-white space-y-6 max-w-xs">
          <div className="w-12 h-px bg-gray-600 mx-auto" />
          <p className="text-white font-light text-sm tracking-wider drop-shadow-md">
            Finalisez votre inscription
          </p>
          <div className="space-y-4 text-left mt-8">
            {[
              { icon: Phone,       text: 'Vérification par SMS' },
              { icon: ShieldCheck, text: 'Numéro confirmé, compte sécurisé' },
              { icon: Store,       text: 'Ouvrez votre boutique en ligne' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-gray-400">
                <Icon className="w-4 h-4 shrink-0 text-gray-500" />
                <span className="text-xs tracking-wide">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panneau droit (formulaire) ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          {/* En-tête */}
          <div className="mb-8">
            <p className="text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] text-xs mb-2">
              Presque terminé
            </p>
            <h2 className="text-3xl font-extralight text-black dark:text-white tracking-wide">
              Votre Compte
            </h2>
            <div className="w-8 h-px bg-black dark:bg-white mt-4" />
          </div>

          {error && (
            <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 mb-6 tracking-wide">
              {error}
            </div>
          )}

          <Stepper />

          {/* ── ÉTAPE 1 — Téléphone + Rôle ─────────────────────────────── */}
          {etape === 1 && (
            <div className="space-y-8">

              {/* Choix du rôle */}
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4">
                  Je souhaite…
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'CLIENT',  icon: User,  label: 'Acheter',       sub: 'Compte client' },
                    { value: 'VENDEUR', icon: Store, label: 'Vendre',        sub: 'Compte vendeur' },
                  ] as const).map(({ value, icon: Icon, label, sub }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      className={`flex flex-col items-center gap-2 py-5 px-3 border transition-colors duration-200 ${
                        role === value
                          ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium tracking-wide">{label}</span>
                      <span className={`text-[10px] uppercase tracking-[0.15em] ${
                        role === value ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-600'
                      }`}>{sub}</span>
                    </button>
                  ))}
                </div>
                {role === 'VENDEUR' && (
                  <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-800 px-3 py-2 tracking-wide">
                    Votre boutique sera activée après validation par notre équipe.
                  </p>
                )}
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                  Numéro de téléphone *
                </label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={e => setTelephone(e.target.value)}
                  placeholder="05 XX XX XX XX"
                  className="w-full border-b border-gray-300 dark:border-gray-600 focus:border-black dark:focus:border-white outline-none py-3 text-sm text-gray-800 dark:text-gray-100 bg-transparent transition-colors duration-300 placeholder-gray-300 dark:placeholder-gray-700"
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-600 tracking-wide">
                  Un code de confirmation vous sera envoyé par SMS.
                </p>
              </div>

              <button
                onClick={handleEtape1}
                disabled={loading || !phoneValid}
                className="w-full bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 text-white dark:text-black text-xs uppercase tracking-[0.3em] py-4 transition-colors duration-300 disabled:opacity-40"
              >
                {loading ? 'Envoi en cours...' : 'Recevoir le code SMS'}
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500 tracking-wide">
                Vous avez déjà un compte ?{' '}
                <Link href="/connexion"
                  className="text-black dark:text-white underline underline-offset-4">
                  Se connecter
                </Link>
              </p>
            </div>
          )}

          {/* ── ÉTAPE 2 — OTP ───────────────────────────────────────────── */}
          {etape === 2 && (
            <div className="space-y-7">

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1">
                  Code envoyé au
                </p>
                <p className="text-sm text-black dark:text-white font-light">{telephone}</p>
                {testMode && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-3 py-2 tracking-wide">
                    Mode test — entrez <span className="font-mono font-bold">000000</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4">
                  Code de confirmation *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  placeholder="• • • • • •"
                  className="w-full border-b border-gray-300 dark:border-gray-600 focus:border-black dark:focus:border-white outline-none py-3 text-center text-2xl font-mono tracking-[0.5em] text-gray-800 dark:text-gray-100 bg-transparent transition-colors duration-300 placeholder-gray-300 dark:placeholder-gray-700"
                />
                <div className="flex gap-1.5 mt-2 justify-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`h-0.5 flex-1 transition-colors duration-200 ${
                      i < code.length ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'
                    }`} />
                  ))}
                </div>
              </div>

              <button
                onClick={handleEtape2}
                disabled={loading || code.length !== 6}
                className="w-full bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 text-white dark:text-black text-xs uppercase tracking-[0.3em] py-4 transition-colors duration-300 disabled:opacity-40"
              >
                {loading ? 'Création du compte...' : 'Confirmer & Créer mon compte'}
              </button>

              <button
                onClick={() => { setEtape(1); setCode(''); setError(null) }}
                className="w-full text-xs text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white uppercase tracking-[0.2em] transition-colors py-2"
              >
                ← Modifier mes informations
              </button>
            </div>
          )}

        </div>

        {/* Logo mobile */}
        <div className="lg:hidden mt-12 flex flex-col items-center gap-3 pb-8">
          <div className="w-16 h-px bg-gray-200 dark:bg-gray-800" />
          <Image src="/logo_noir.png" alt="Caba Store" width={80} height={80}
            className="object-contain dark:invert opacity-30" />
          <p className="text-xs text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em]">Caba Store</p>
        </div>
      </div>
    </div>
  )
}

export default function FinaliserGooglePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    }>
      <FinaliserGoogleContent />
    </Suspense>
  )
}