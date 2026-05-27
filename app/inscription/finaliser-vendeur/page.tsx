'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Store, Phone, ShieldCheck } from 'lucide-react'
import CabaLogo from '@/components/CabaLogo'

function FinaliserVendeurContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const skipPhone    = searchParams.get('skipPhone') === 'true'

  const { data: session, status, update } = useSession()

  const [etape,       setEtape]       = useState<1 | 2>(1)
  const [nomBoutique, setNomBoutique] = useState('')
  const [telephone,   setTelephone]   = useState('')
  const [code,        setCode]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState<string | null>(null)
  const [testMode,    setTestMode]    = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) { router.replace('/connexion'); return }
    if (session.user.role === 'VENDEUR') { router.replace('/vendeur') }
  }, [session, status, router])

  const handleEtape1Normal = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/finaliser-vendeur', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etape: 1, telephone, nomBoutique }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTestMode(!!data.testMode)
      setEtape(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally { setLoading(false) }
  }

  const handleEtape2Normal = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/finaliser-vendeur', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etape: 2, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(data.message)
      await update()
      setTimeout(() => { router.push('/vendeur'); router.refresh() }, 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally { setLoading(false) }
  }

  const handleEtape1Skip = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/finaliser-vendeur', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etape: 1, nomBoutique, skipPhone: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(data.message)
      await update()
      setTimeout(() => { router.push('/vendeur'); router.refresh() }, 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally { setLoading(false) }
  }

  const canSubmitNormal =
    nomBoutique.trim().length >= 2 &&
    /^(05|06|07)\d{8}$/.test(telephone.replace(/\s/g, ''))

  // ── Styles ────────────────────────────────────────────────────────────────
  const labelCls  = 'block text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-2'
  const baseInput = 'w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-2.5 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors duration-300 placeholder-stone-300 dark:placeholder-stone-700'
  const btnPrimary = 'w-full bg-orange-700 hover:bg-orange-800 text-white text-xs uppercase tracking-[0.3em] py-4 rounded-xl transition-colors duration-300 disabled:opacity-40 flex items-center justify-center gap-2'

  const Stepper = () => (
    <div className="flex items-center gap-3 mb-10">
      {([
        { n: 1, label: 'Boutique & Tél.' },
        { n: 2, label: 'Confirmation' },
      ] as const).map(({ n, label }) => (
        <div key={n} className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors duration-300 ${
            etape === n
              ? 'bg-orange-700 text-white'
              : n < etape
              ? 'border-2 border-orange-700 text-orange-700'
              : 'border border-stone-300 dark:border-stone-700 text-stone-400 dark:text-stone-600'
          }`}>
            {n < etape ? <Check className="w-3.5 h-3.5" /> : n}
          </div>
          <span className={`text-xs uppercase tracking-[0.2em] hidden sm:block transition-colors duration-300 ${
            etape === n ? 'text-orange-700 dark:text-orange-500 font-medium' : 'text-stone-400 dark:text-stone-600'
          }`}>
            {label}
          </span>
          {n < 2 && <div className={`w-8 h-px ${etape > 1 ? 'bg-orange-300 dark:bg-orange-800' : 'bg-stone-200 dark:bg-stone-800'}`} />}
        </div>
      ))}
    </div>
  )

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col lg:flex-row transition-colors duration-300">

      {/* ── Panneau gauche ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-stone-900 dark:bg-stone-950 items-center justify-center p-12 border-r border-stone-800">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <CabaLogo className="w-120 h-120 text-white" />
        </div>
        <div className="relative z-10 text-center text-white space-y-6 max-w-xs">
          <CabaLogo className="w-16 h-16 text-orange-500 mx-auto" />
          <div className="w-10 h-px bg-stone-700 mx-auto" />
          <p className="text-stone-400 font-light text-sm tracking-wider">
            Finalisez votre compte vendeur
          </p>
          <div className="space-y-4 text-left mt-8">
            {[
              { icon: Store,       text: 'Votre boutique en ligne' },
              { icon: Phone,       text: skipPhone ? 'Téléphone déjà vérifié ✓' : 'Vérification par SMS' },
              { icon: ShieldCheck, text: 'Validation par notre équipe' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-stone-400">
                <Icon className="w-4 h-4 shrink-0 text-orange-500/60" />
                <span className="text-xs tracking-wide">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-2">
              {skipPhone ? 'Dernière étape' : 'Presque terminé'}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Compte Vendeur
            </h2>
            <div className="w-8 h-px bg-orange-700 dark:bg-orange-500 mt-4" />
          </div>

          {/* Infos session */}
          {session?.user && (
            <div className="flex items-center gap-3 mb-8 p-3 border border-stone-100 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-900">
              {session.user.image ? (
                <Image src={session.user.image} alt="" width={32} height={32}
                  className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-xs text-orange-700 dark:text-orange-400 uppercase font-semibold">
                  {session.user.name?.[0] ?? '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-stone-800 dark:text-stone-100 truncate">{session.user.name}</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{session.user.email}</p>
              </div>
              {skipPhone && session.user.telephone && (
                <div className="ml-auto flex items-center gap-1 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-2 py-1 rounded-lg shrink-0">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span className="text-[10px] text-green-700 dark:text-green-400 font-medium">
                    {session.user.telephone}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Succès ── */}
          {success ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 bg-orange-700 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-white" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500">
                Boutique créée
              </p>
              <p className="text-sm font-light text-stone-800 dark:text-stone-100">{success}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 tracking-wide">
                Votre compte sera activé après validation par notre équipe.
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-600 tracking-wide mt-4">
                Redirection en cours...
              </p>
            </div>
          ) : (
            <>
              {/* ══ MODE SKIP_PHONE ══ */}
              {skipPhone ? (
                <div className="space-y-7">
                  <div>
                    <label className={labelCls}>Nom de la boutique *</label>
                    <input type="text" value={nomBoutique} onChange={e => setNomBoutique(e.target.value)}
                      placeholder="Ma Super Boutique" className={baseInput} />
                    <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-600 tracking-wide">
                      Ce nom sera affiché sur votre boutique publique.
                    </p>
                  </div>

                  {error && (
                    <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-xl tracking-wide">{error}</div>
                  )}

                  <button onClick={handleEtape1Skip} disabled={loading || nomBoutique.trim().length < 2}
                    className={btnPrimary}>
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création...</>
                      : 'Créer ma boutique'
                    }
                  </button>
                </div>
              ) : (
              /* ══ MODE NORMAL — stepper 2 étapes ══ */
              <>
                <Stepper />

                {/* ÉTAPE 1 */}
                {etape === 1 && (
                  <div className="space-y-7">
                    <div>
                      <label className={labelCls}>Nom de la boutique *</label>
                      <input type="text" value={nomBoutique} onChange={e => setNomBoutique(e.target.value)}
                        placeholder="Ma Super Boutique" className={baseInput} />
                    </div>
                    <div>
                      <label className={labelCls}>Numéro de téléphone *</label>
                      <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                        placeholder="05 XX XX XX XX" className={baseInput} />
                      <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-600 tracking-wide">
                        Un code de confirmation vous sera envoyé par SMS.
                      </p>
                    </div>

                    {error && (
                      <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-xl tracking-wide">{error}</div>
                    )}

                    <button onClick={handleEtape1Normal} disabled={loading || !canSubmitNormal}
                      className={btnPrimary}>
                      {loading
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
                        : 'Recevoir le code'
                      }
                    </button>

                    <p className="text-center text-xs text-stone-400 dark:text-stone-500 tracking-wide">
                      Vous souhaitez créer un compte client ?{' '}
                      <Link href="/" className="text-orange-700 dark:text-orange-500 underline underline-offset-4 font-medium">
                        Continuer sans boutique
                      </Link>
                    </p>
                  </div>
                )}

                {/* ÉTAPE 2 — OTP */}
                {etape === 2 && (
                  <div className="space-y-7">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-1">Code envoyé au</p>
                      <p className="text-sm text-stone-900 dark:text-stone-100 font-medium">{telephone}</p>
                      {testMode && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-lg tracking-wide">
                          Mode test — entrez <span className="font-mono font-bold">000000</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-4">
                        Code de confirmation *
                      </label>
                      <input type="text" inputMode="numeric" value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6} placeholder="• • • • • •"
                        className="w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-center text-2xl font-mono tracking-[0.5em] text-stone-800 dark:text-stone-100 bg-transparent transition-colors duration-300 placeholder-stone-300 dark:placeholder-stone-700" />
                      <div className="flex gap-1.5 mt-2 justify-center">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className={`h-0.5 flex-1 transition-colors duration-200 ${
                            i < code.length ? 'bg-orange-700 dark:bg-orange-500' : 'bg-stone-200 dark:bg-stone-800'
                          }`} />
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-xl tracking-wide">{error}</div>
                    )}

                    <button onClick={handleEtape2Normal} disabled={loading || code.length !== 6}
                      className={btnPrimary}>
                      {loading
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Vérification...</>
                        : 'Activer mon compte vendeur'
                      }
                    </button>

                    <button onClick={() => { setEtape(1); setCode(''); setError(null) }}
                      className="w-full text-xs text-stone-400 dark:text-stone-600 hover:text-orange-700 dark:hover:text-orange-500 uppercase tracking-[0.2em] transition-colors py-2">
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
          <div className="w-16 h-px bg-stone-200 dark:bg-stone-800" />
          <CabaLogo className="w-12 h-12 text-orange-700 dark:text-orange-500 opacity-60" />
          <p className="text-xs text-stone-300 dark:text-stone-700 uppercase tracking-[0.3em]">Caba Store</p>
        </div>
      </div>
    </div>
  )
}

export default function FinaliserVendeurPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin" />
      </div>
    }>
      <FinaliserVendeurContent />
    </Suspense>
  )
}
