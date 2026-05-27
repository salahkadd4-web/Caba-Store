'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Check, Phone, ShieldCheck, Store, User } from 'lucide-react'
import CabaLogo from '@/components/CabaLogo'

function FinaliserGoogleContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const tempToken    = searchParams.get('token') ?? ''

  const [etape,    setEtape]    = useState<1 | 2>(1)
  const [role,     setRole]     = useState<'CLIENT' | 'VENDEUR'>('CLIENT')
  const [telephone,setTelephone]= useState('')
  const [code,     setCode]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [testMode, setTestMode] = useState(false)

  useEffect(() => {
    if (!tempToken || !/^[a-f0-9]{64}$/.test(tempToken)) {
      router.replace('/connexion')
    }
  }, [tempToken, router])

  const phoneValid = /^(05|06|07)\d{8}$/.test(telephone.replace(/\s/g, ''))

  const handleEtape1 = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/google-finaliser', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etape: 1, tempToken, telephone, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTestMode(!!data.testMode)
      setEtape(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally { setLoading(false) }
  }

  const handleEtape2 = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/google-finaliser', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etape: 2, tempToken, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const signInResult = await signIn('credentials-google', { userId: data.userId, redirect: false })
      if (!signInResult?.ok) throw new Error('Impossible de créer la session. Veuillez vous reconnecter.')

      if (data.role === 'VENDEUR') {
        router.push('/inscription/finaliser-vendeur?skipPhone=true')
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally { setLoading(false) }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const labelCls   = 'block text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-2'
  const baseInput  = 'w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors duration-300 placeholder-stone-300 dark:placeholder-stone-700'

  const Stepper = () => (
    <div className="flex items-center gap-3 mb-10">
      {([
        { n: 1, label: 'Téléphone & Rôle' },
        { n: 2, label: 'Confirmation SMS' },
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
            Finalisez votre inscription
          </p>
          <div className="space-y-4 text-left mt-8">
            {[
              { icon: Phone,       text: 'Vérification par SMS' },
              { icon: ShieldCheck, text: 'Numéro confirmé, compte sécurisé' },
              { icon: Store,       text: 'Ouvrez votre boutique en ligne' },
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
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-2">Presque terminé</p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Votre Compte</h2>
            <div className="w-8 h-px bg-orange-700 dark:bg-orange-500 mt-4" />
          </div>

          {error && (
            <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 mb-6 rounded-xl tracking-wide">
              {error}
            </div>
          )}

          <Stepper />

          {/* ── ÉTAPE 1 — Téléphone + Rôle ── */}
          {etape === 1 && (
            <div className="space-y-8">

              {/* Choix rôle */}
              <div>
                <p className={`${labelCls} mb-4`}>Je souhaite…</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'CLIENT',  icon: User,  label: 'Acheter', sub: 'Compte client' },
                    { value: 'VENDEUR', icon: Store, label: 'Vendre',  sub: 'Compte vendeur' },
                  ] as const).map(({ value, icon: Icon, label, sub }) => (
                    <button key={value} type="button" onClick={() => setRole(value)}
                      className={`flex flex-col items-center gap-2 py-5 px-3 border-2 rounded-xl transition-colors duration-200 ${
                        role === value
                          ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                          : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500'
                      }`}>
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium tracking-wide">{label}</span>
                      <span className={`text-[10px] uppercase tracking-[0.15em] ${
                        role === value ? 'text-orange-500 dark:text-orange-600' : 'text-stone-400 dark:text-stone-600'
                      }`}>{sub}</span>
                    </button>
                  ))}
                </div>
                {role === 'VENDEUR' && (
                  <p className="mt-3 text-xs text-stone-400 dark:text-stone-500 border border-stone-100 dark:border-stone-800 rounded-lg px-3 py-2 tracking-wide">
                    Votre boutique sera activée après validation par notre équipe.
                  </p>
                )}
              </div>

              {/* Téléphone */}
              <div>
                <label className={labelCls}>Numéro de téléphone *</label>
                <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                  placeholder="05 XX XX XX XX" className={baseInput} />
                <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-600 tracking-wide">
                  Un code de confirmation vous sera envoyé par SMS.
                </p>
              </div>

              <button onClick={handleEtape1} disabled={loading || !phoneValid}
                className="w-full bg-orange-700 hover:bg-orange-800 text-white text-xs uppercase tracking-[0.3em] py-4 rounded-xl transition-colors duration-300 disabled:opacity-40 flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
                  : 'Recevoir le code SMS'
                }
              </button>

              <p className="text-center text-xs text-stone-400 dark:text-stone-500 tracking-wide">
                Vous avez déjà un compte ?{' '}
                <Link href="/connexion" className="text-orange-700 dark:text-orange-500 underline underline-offset-4 font-medium">
                  Se connecter
                </Link>
              </p>
            </div>
          )}

          {/* ── ÉTAPE 2 — OTP ── */}
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

              <button onClick={handleEtape2} disabled={loading || code.length !== 6}
                className="w-full bg-orange-700 hover:bg-orange-800 text-white text-xs uppercase tracking-[0.3em] py-4 rounded-xl transition-colors duration-300 disabled:opacity-40 flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création...</>
                  : 'Confirmer & Créer mon compte'
                }
              </button>

              <button onClick={() => { setEtape(1); setCode(''); setError(null) }}
                className="w-full text-xs text-stone-400 dark:text-stone-600 hover:text-orange-700 dark:hover:text-orange-500 uppercase tracking-[0.2em] transition-colors py-2">
                ← Modifier mes informations
              </button>
            </div>
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

export default function FinaliserGooglePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin" />
      </div>
    }>
      <FinaliserGoogleContent />
    </Suspense>
  )
}
