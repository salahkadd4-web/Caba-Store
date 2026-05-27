'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import CabaLogo from '@/components/CabaLogo'
import GoogleIcon from '@/components/client/GoogleIcon'

const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''

// ─── Composants stables (hors du composant parent pour éviter les remontages) ─

function Stepper({ etape }: { etape: number }) {
  return (
    <div className="flex items-center gap-3 mb-10">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors duration-300 ${
              etape === s
                ? 'bg-orange-700 text-white'
                : s < etape
                  ? 'border-2 border-orange-700 text-orange-700'
                  : 'border border-stone-300 dark:border-stone-700 text-stone-400 dark:text-stone-600'
            }`}
          >
            {s < etape ? <Check className="w-3.5 h-3.5" /> : s}
          </div>
          <span
            className={`text-xs uppercase tracking-[0.2em] hidden sm:block transition-colors duration-300 ${
              etape === s ? 'text-orange-700 dark:text-orange-500 font-medium' : 'text-stone-400 dark:text-stone-600'
            }`}
          >
            {s === 1 ? 'Informations' : 'Confirmation'}
          </span>
          {s < 2 && (
            <div className={`w-8 h-px ${etape > 1 ? 'bg-orange-300 dark:bg-orange-800' : 'bg-stone-200 dark:bg-stone-800'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function InscriptionPage() {
  const router = useRouter()

  const [etape, setEtape]                     = useState<1 | 2>(1)
  const [role, setRole]                       = useState<'CLIENT' | 'VENDEUR'>('CLIENT')
  const [identifiantType, setIdentifiantType] = useState<'email' | 'telephone'>('email')
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    motDePasse: '', nomBoutique: '',
  })
  const [code, setCode]                   = useState('')
  const [loading, setLoading]             = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [showPwd, setShowPwd]             = useState(false)

  const [checkingId, setCheckingId] = useState(false)
  const [idStatus, setIdStatus]     = useState<'idle' | 'available' | 'taken'>('idle')
  const debounceRef                 = useRef<NodeJS.Timeout | null>(null)

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

  useEffect(() => {
    const identifiant = identifiantType === 'email' ? form.email : form.telephone
    if (!identifiant.trim() || (identifiantType === 'email' && !identifiant.includes('@'))) {
      setIdStatus('idle'); return
    }
    setIdStatus('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setCheckingId(true)
      try {
        const res  = await fetch('/api/auth/verifier-identifiant', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiant: identifiant.trim() }),
        })
        const data = await res.json()
        setIdStatus(data.exists ? 'taken' : 'available')
      } catch { setIdStatus('idle') }
      finally  { setCheckingId(false) }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form.email, form.telephone, identifiantType])

  const handleChange = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const canSubmitEtape1 =
    form.nom && form.prenom && form.motDePasse &&
    (identifiantType === 'email' ? form.email : form.telephone) &&
    (role === 'VENDEUR' ? form.nomBoutique : true) &&
    idStatus === 'available'

  const handleEtape1 = async () => {
    setLoading(true); setError(null)
    try {
      const body: Record<string, string> = {
        etape: '1', nom: form.nom, prenom: form.prenom,
        motDePasse: form.motDePasse, role,
      }
      if (identifiantType === 'email')     body.email     = form.email
      if (identifiantType === 'telephone') body.telephone = form.telephone
      if (role === 'VENDEUR')              body.nomBoutique = form.nomBoutique

      const res  = await fetch('/api/auth/inscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEtape(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally { setLoading(false) }
  }

  const handleEtape2 = async () => {
    setLoading(true); setError(null)
    try {
      const body: Record<string, string> = { etape: '2', code, role }
      if (identifiantType === 'email')     body.email     = form.email
      if (identifiantType === 'telephone') body.telephone = form.telephone

      const res  = await fetch('/api/auth/inscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(role === 'VENDEUR' ? '/connexion?inscription=vendeur' : '/connexion?inscription=client')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally { setLoading(false) }
  }

  // ── Styles partagés ────────────────────────────────────────────────────────
  const inputCls = (status?: 'available' | 'taken' | 'idle') =>
    `w-full border-b outline-none py-2.5 pr-7 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors duration-300 placeholder-stone-300 dark:placeholder-stone-700 ${
      status === 'available' ? 'border-green-500 dark:border-green-400' :
      status === 'taken'     ? 'border-red-400 dark:border-red-500' :
      'border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500'
    }`

  const baseInput = 'w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-2.5 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors duration-300 placeholder-stone-300 dark:placeholder-stone-700'
  const labelCls  = 'block text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-2'

  const handleGoogle = async () => {
    setLoadingGoogle(true); setError(null)
    try {
      const callbackUrl = role === 'VENDEUR' ? '/inscription/finaliser-vendeur' : '/'
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { SocialLogin } = await import('@capgo/capacitor-social-login')
        const result = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } })
        const googleResult = result.result
        if (!googleResult || !('idToken' in googleResult) || !googleResult.idToken) {
          setError('Impossible de récupérer le token Google.'); return
        }
        const res  = await fetch('/api/auth/google-native', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: googleResult.idToken }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) { setError(data.error || 'Erreur connexion Google.'); return }
        const signInResult = await signIn('credentials-google', { userId: data.userId, redirect: false })
        if (signInResult?.ok) { router.push(callbackUrl); router.refresh() }
        else setError('Erreur de session. Veuillez réessayer.')
      } else {
        await signIn('google', { callbackUrl })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la connexion Google.')
    } finally { setLoadingGoogle(false) }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col lg:flex-row transition-colors duration-300">

      {/* ── Panneau gauche (desktop) ── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-stone-900 dark:bg-stone-950 items-center justify-center p-12 border-r border-stone-800">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <CabaLogo className="w-120 h-120 text-white" />
        </div>
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

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-2">Nouveau compte</p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Inscription</h2>
            <div className="w-8 h-px bg-orange-700 dark:bg-orange-500 mt-4" />
          </div>

          <Stepper etape={etape} />

          {/* ── ÉTAPE 1 ── */}
          {etape === 1 && (
            <div className="space-y-7">

              {/* Choix rôle */}
              <div>
                <p className={labelCls}>Je m&apos;inscris en tant que</p>
                <div className="flex gap-0 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                  {(['CLIENT', 'VENDEUR'] as const).map((r) => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`flex-1 py-3.5 text-xs uppercase tracking-[0.2em] transition-colors duration-200 ${
                        role === r
                          ? 'bg-orange-700 text-white'
                          : 'bg-white dark:bg-stone-950 text-stone-400 dark:text-stone-600 hover:text-stone-800 dark:hover:text-stone-200'
                      }`}>
                      {r === 'CLIENT' ? 'Client' : 'Vendeur'}
                    </button>
                  ))}
                </div>
                {role === 'VENDEUR' && (
                  <p className="mt-3 text-xs text-stone-400 dark:text-stone-500 tracking-wide border-l-2 border-orange-300 dark:border-orange-800 pl-3">
                    Votre compte sera bloqué jusqu&apos;à validation par notre équipe.
                  </p>
                )}
              </div>

              {/* Bouton Google */}
              <button onClick={handleGoogle} disabled={loadingGoogle || loading}
                className="w-full flex items-center justify-center gap-3 border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-200 text-xs uppercase tracking-[0.15em] py-3.5 rounded-xl transition-colors duration-300 disabled:opacity-50">
                {loadingGoogle
                  ? <span className="w-4 h-4 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
                  : <GoogleIcon />
                }
                {role === 'VENDEUR' ? 'Continuer avec Google — Vendeur' : 'Continuer avec Google'}
              </button>

              {/* Séparateur */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
                <span className="text-xs text-stone-400 dark:text-stone-600 uppercase tracking-[0.2em]">ou</span>
                <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
              </div>

              {/* Nom / Prénom */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Nom *</label>
                  <input type="text" value={form.nom} onChange={handleChange('nom')} placeholder="Dupont"
                    className={baseInput} />
                </div>
                <div>
                  <label className={labelCls}>Prénom *</label>
                  <input type="text" value={form.prenom} onChange={handleChange('prenom')} placeholder="Ahmed"
                    className={baseInput} />
                </div>
              </div>

              {/* Nom boutique (vendeur) */}
              {role === 'VENDEUR' && (
                <div>
                  <label className={labelCls}>Nom de la boutique *</label>
                  <input type="text" value={form.nomBoutique} onChange={handleChange('nomBoutique')} placeholder="Ma Super Boutique"
                    className={baseInput} />
                </div>
              )}

              {/* Identifiant */}
              <div>
                <div className="flex items-center gap-4 mb-3">
                  {(['email', 'telephone'] as const).map((t) => (
                    <button key={t} onClick={() => { setIdentifiantType(t); setIdStatus('idle') }}
                      className={`text-xs uppercase tracking-[0.2em] pb-1 transition-colors duration-200 ${
                        identifiantType === t
                          ? 'text-orange-700 dark:text-orange-500 border-b-2 border-orange-700 dark:border-orange-500'
                          : 'text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-400'
                      }`}>
                      {t === 'email' ? 'Email' : 'Téléphone'}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  {identifiantType === 'email' ? (
                    <input type="email" value={form.email}
                      onChange={e => { handleChange('email')(e); setIdStatus('idle') }}
                      placeholder="exemple@email.com"
                      className={inputCls(idStatus === 'idle' ? undefined : idStatus)} />
                  ) : (
                    <input type="tel" value={form.telephone}
                      onChange={e => { handleChange('telephone')(e); setIdStatus('idle') }}
                      placeholder="05 XX XX XX XX"
                      className={inputCls(idStatus === 'idle' ? undefined : idStatus)} />
                  )}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    {checkingId && <svg className="animate-spin w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                    {!checkingId && idStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                    {!checkingId && idStatus === 'taken'     && <X className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
                {idStatus === 'available' && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" />{identifiantType === 'email' ? 'Email' : 'Numéro'} disponible
                  </p>
                )}
                {idStatus === 'taken' && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">
                    ✗ {identifiantType === 'email' ? 'Cet email est déjà associé à un compte' : 'Ce numéro est déjà utilisé'} —{' '}
                    <Link href="/connexion" className="underline underline-offset-2">Se connecter ?</Link>
                  </p>
                )}
              </div>

              {/* Mot de passe */}
              <div>
                <label className={labelCls}>Mot de passe *</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.motDePasse}
                    onChange={handleChange('motDePasse')} placeholder="8+ car., maj., chiffre, symbole"
                    className={`${baseInput} pr-8`} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-stone-400 dark:text-stone-600 hover:text-orange-700 dark:hover:text-orange-500 transition-colors uppercase tracking-widest">
                    {showPwd ? 'Cacher' : 'Voir'}
                  </button>
                </div>
                {form.motDePasse.length > 0 && (() => {
                  const pwd = form.motDePasse
                  const conditions = [
                    { ok: pwd.length >= 8,          label: '8 caractères minimum' },
                    { ok: /[A-Z]/.test(pwd),         label: 'Une lettre majuscule' },
                    { ok: /[0-9]/.test(pwd),          label: 'Un chiffre' },
                    { ok: /[^A-Za-z0-9]/.test(pwd),  label: 'Un symbole (!@#$%...)' },
                  ]
                  return (
                    <div className="mt-3 space-y-1.5">
                      {conditions.map(({ ok, label }) => (
                        <p key={label} className={`text-xs flex items-center gap-2 transition-colors duration-200 ${ok ? 'text-green-700 dark:text-green-400' : 'text-stone-400 dark:text-stone-600'}`}>
                          <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full transition-all duration-200 ${ok ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400' : 'border border-stone-300 dark:border-stone-700'}`}>
                            {ok && <Check className="w-2.5 h-2.5" />}
                          </span>
                          {label}
                        </p>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {error && (
                <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-xl tracking-wide">{error}</div>
              )}

              <button onClick={handleEtape1} disabled={loading || !canSubmitEtape1}
                className="w-full bg-orange-700 hover:bg-orange-800 text-white text-xs uppercase tracking-[0.3em] py-4 rounded-xl transition-colors duration-300 disabled:opacity-40 mt-2 flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
                  : 'Recevoir le code'
                }
              </button>

              <p className="text-center text-xs text-stone-400 dark:text-stone-500 tracking-wide">
                Déjà un compte ?{' '}
                <Link href="/connexion" className="text-orange-700 dark:text-orange-500 hover:text-orange-800 underline underline-offset-4 transition-colors font-medium">Se connecter</Link>
              </p>
            </div>
          )}

          {/* ── ÉTAPE 2 — Code de confirmation ── */}
          {etape === 2 && (
            <div className="space-y-7">
              <div>
                <p className={`${labelCls} mb-1`}>Code envoyé à</p>
                <p className="text-sm text-stone-900 dark:text-stone-100 font-medium">
                  {identifiantType === 'email' ? form.email : form.telephone}
                </p>
              </div>
              <div>
                <label className={`${labelCls} mb-4`}>Code de confirmation *</label>
                <input type="text" inputMode="numeric" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6} placeholder="• • • • • •"
                  className="w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-center text-2xl font-mono tracking-[0.5em] text-stone-800 dark:text-stone-100 bg-transparent transition-colors duration-300 placeholder-stone-300 dark:placeholder-stone-700" />
                <div className="flex gap-1.5 mt-2 justify-center">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`h-0.5 flex-1 transition-colors duration-200 ${i < code.length ? 'bg-orange-700 dark:bg-orange-500' : 'bg-stone-200 dark:bg-stone-800'}`} />
                  ))}
                </div>
              </div>
              {error && (
                <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-xl tracking-wide">{error}</div>
              )}
              <button onClick={handleEtape2} disabled={loading || code.length !== 6}
                className="w-full bg-orange-700 hover:bg-orange-800 text-white text-xs uppercase tracking-[0.3em] py-4 rounded-xl transition-colors duration-300 disabled:opacity-40 flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Vérification...</>
                  : 'Confirmer mon compte'
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
