'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Store, Phone, ShieldCheck } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Page de finalisation d'inscription vendeur via Google.
//
// Deux modes selon le query param ?skipPhone :
//
// ── Mode NORMAL ─────────────────────────────────────────────────────────────
//   Flow : Google OAuth (CLIENT créé) → cette page → téléphone + OTP → VENDEUR
//   (cas d'un CLIENT existant qui veut devenir vendeur)
//
// ── Mode SKIP_PHONE (?skipPhone=true) ────────────────────────────────────────
//   Flow : Google (nouveau compte) → finaliser-google (tel+OTP) → CETTE PAGE
//   Le téléphone est déjà vérifié → on demande uniquement le nom de boutique
// ─────────────────────────────────────────────────────────────────────────────

function FinaliserVendeurContent() {
  const router          = useRouter()
  const searchParams    = useSearchParams()
  const skipPhone       = searchParams.get('skipPhone') === 'true'

  const { data: session, status, update } = useSession()

  // En mode normal : étapes 1 (téléphone + boutique + OTP) et 2 (code)
  // En mode skipPhone : étape 1 seulement (boutique → création directe)
  const [etape,       setEtape]       = useState<1 | 2>(1)
  const [nomBoutique, setNomBoutique] = useState('')
  const [telephone,   setTelephone]   = useState('')
  const [code,        setCode]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState<string | null>(null)
  const [testMode,    setTestMode]    = useState(false)

  // Garde : si déjà VENDEUR → dashboard
  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) { router.replace('/connexion'); return }
    if (session.user.role === 'VENDEUR') { router.replace('/vendeur') }
  }, [session, status, router])

  // ── Mode normal — étape 1 : envoi OTP ────────────────────────────────────
  const handleEtape1Normal = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/finaliser-vendeur', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ etape: 1, telephone, nomBoutique }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTestMode(!!data.testMode)
      setEtape(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // ── Mode normal — étape 2 : vérification OTP ─────────────────────────────
  const handleEtape2Normal = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/finaliser-vendeur', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ etape: 2, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccess(data.message)
      await update()
      setTimeout(() => { router.push('/vendeur'); router.refresh() }, 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // ── Mode skipPhone — étape 1 : création directe (pas d'OTP) ──────────────
  const handleEtape1Skip = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/finaliser-vendeur', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ etape: 1, nomBoutique, skipPhone: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccess(data.message)
      await update()
      setTimeout(() => { router.push('/vendeur'); router.refresh() }, 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const canSubmitNormal =
    nomBoutique.trim().length >= 2 &&
    /^(05|06|07)\d{8}$/.test(telephone.replace(/\s/g, ''))

  // ── Stepper (mode normal uniquement) ─────────────────────────────────────
  const Stepper = () => (
    <div className="flex items-center gap-3 mb-10">
      {([
        { n: 1, label: 'Boutique & Tél.' },
        { n: 2, label: 'Confirmation' },
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row transition-colors duration-300">

      {/* ── Panneau gauche ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-black dark:bg-gray-900 items-center justify-center p-12 border-r border-gray-800">
        <div className="absolute z-10 mask-[radial-gradient(ellipse_at_center,transparent_-50%,black_10%)]">
          <Image
            src="/logo_noir.png"
            alt=""
            width={750}
            height={750}
            className="object-contain invert opacity-30 scale-150"
            priority
          />
        </div>
        <div className="relative z-10 text-center text-white space-y-6 max-w-xs">
          <div className="w-12 h-px bg-gray-600 mx-auto" />
          <p className="text-white font-light text-sm tracking-wider drop-shadow-md">
            Finalisez votre compte vendeur
          </p>
          <div className="space-y-4 text-left mt-8">
            {[
              { icon: Store,       text: 'Votre boutique en ligne' },
              { icon: Phone,       text: skipPhone ? 'Téléphone déjà vérifié ✓' : 'Vérification par SMS' },
              { icon: ShieldCheck, text: 'Validation par notre équipe' },
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
              {skipPhone ? 'Dernière étape' : 'Presque terminé'}
            </p>
            <h2 className="text-3xl font-extralight text-black dark:text-white tracking-wide">
              Compte Vendeur
            </h2>
            <div className="w-8 h-px bg-black dark:bg-white mt-4" />
          </div>

          {/* Infos session */}
          {session?.user && (
            <div className="flex items-center gap-3 mb-8 p-3 border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              {session.user.image ? (
                <Image src={session.user.image} alt="" width={32} height={32}
                  className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 uppercase font-medium">
                  {session.user.name?.[0] ?? '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {session.user.email}
                </p>
              </div>
              {/* Badge téléphone déjà vérifié (mode skipPhone) */}
              {skipPhone && session.user.telephone && (
                <div className="ml-auto flex items-center gap-1 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-2 py-1 rounded shrink-0">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span className="text-[10px] text-green-700 dark:text-green-400 font-medium">
                    {session.user.telephone}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Succès ──────────────────────────────────────────────────── */}
          {success ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 bg-black dark:bg-white rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-white dark:text-black" />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Boutique créée
              </p>
              <p className="text-sm font-light text-black dark:text-white">{success}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 px-4 py-3 tracking-wide">
                Votre compte sera activé après validation par notre équipe.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 tracking-wide mt-4">
                Redirection en cours...
              </p>
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════
                  MODE SKIP_PHONE — uniquement le nom de boutique
              ══════════════════════════════════════════════════════════════ */}
              {skipPhone ? (
                <div className="space-y-7">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                      Nom de la boutique *
                    </label>
                    <input
                      type="text"
                      value={nomBoutique}
                      onChange={e => setNomBoutique(e.target.value)}
                      placeholder="Ma Super Boutique"
                      className="w-full border-b border-gray-300 dark:border-gray-600 focus:border-black dark:focus:border-white outline-none py-2.5 text-sm text-gray-800 dark:text-gray-100 bg-transparent transition-colors duration-300 placeholder-gray-300 dark:placeholder-gray-700"
                    />
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-600 tracking-wide">
                      Ce nom sera affiché sur votre boutique publique.
                    </p>
                  </div>

                  {error && (
                    <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 tracking-wide">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleEtape1Skip}
                    disabled={loading || nomBoutique.trim().length < 2}
                    className="w-full bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 text-white dark:text-black text-xs uppercase tracking-[0.3em] py-4 transition-colors duration-300 disabled:opacity-40"
                  >
                    {loading ? 'Création en cours...' : 'Créer ma boutique'}
                  </button>
                </div>
              ) : (
              /* ═══════════════════════════════════════════════════════════
                  MODE NORMAL — stepper 2 étapes
              ══════════════════════════════════════════════════════════════ */
              <>
                <Stepper />

                {/* ── ÉTAPE 1 ─────────────────────────────────────────── */}
                {etape === 1 && (
                  <div className="space-y-7">

                    <div>
                      <label className="block text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                        Nom de la boutique *
                      </label>
                      <input
                        type="text"
                        value={nomBoutique}
                        onChange={e => setNomBoutique(e.target.value)}
                        placeholder="Ma Super Boutique"
                        className="w-full border-b border-gray-300 dark:border-gray-600 focus:border-black dark:focus:border-white outline-none py-2.5 text-sm text-gray-800 dark:text-gray-100 bg-transparent transition-colors duration-300 placeholder-gray-300 dark:placeholder-gray-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                        Numéro de téléphone *
                      </label>
                      <input
                        type="tel"
                        value={telephone}
                        onChange={e => setTelephone(e.target.value)}
                        placeholder="05 XX XX XX XX"
                        className="w-full border-b border-gray-300 dark:border-gray-600 focus:border-black dark:focus:border-white outline-none py-2.5 text-sm text-gray-800 dark:text-gray-100 bg-transparent transition-colors duration-300 placeholder-gray-300 dark:placeholder-gray-700"
                      />
                      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-600 tracking-wide">
                        Un code de confirmation vous sera envoyé par SMS.
                      </p>
                    </div>

                    {error && (
                      <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 tracking-wide">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={handleEtape1Normal}
                      disabled={loading || !canSubmitNormal}
                      className="w-full bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 text-white dark:text-black text-xs uppercase tracking-[0.3em] py-4 transition-colors duration-300 disabled:opacity-40"
                    >
                      {loading ? 'Envoi en cours...' : 'Recevoir le code'}
                    </button>

                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 tracking-wide">
                      Vous souhaitez créer un compte client ?{' '}
                      <Link href="/" className="text-black dark:text-white underline underline-offset-4">
                        Continuer sans boutique
                      </Link>
                    </p>
                  </div>
                )}

                {/* ── ÉTAPE 2 — OTP ───────────────────────────────────── */}
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

                    {error && (
                      <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 tracking-wide">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={handleEtape2Normal}
                      disabled={loading || code.length !== 6}
                      className="w-full bg-black dark:bg-white hover:bg-gray-900 dark:hover:bg-gray-100 text-white dark:text-black text-xs uppercase tracking-[0.3em] py-4 transition-colors duration-300 disabled:opacity-40"
                    >
                      {loading ? 'Vérification...' : 'Activer mon compte vendeur'}
                    </button>

                    <button
                      onClick={() => { setEtape(1); setCode(''); setError(null) }}
                      className="w-full text-xs text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white uppercase tracking-[0.2em] transition-colors py-2"
                    >
                      ← Modifier mes informations
                    </button>
                  </div>
                )}
              </>
              )}
            </>
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

export default function FinaliserVendeurPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Chargement...</p>
      </div>
    }>
      <FinaliserVendeurContent />
    </Suspense>
  )
}