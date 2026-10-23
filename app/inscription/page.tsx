'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Check, Lock, Mail, ShoppingBag, Smartphone, Store, X } from 'lucide-react'
import GoogleIcon from '@/components/client/GoogleIcon'
import WilayaCommuneSelect from '@/components/WilayaCommuneSelect'
import { useI18n } from '@/components/I18nProvider'
import {
  AuthActions, AuthAlert, AuthDivider, AuthField, AuthScreen, OtpInput, PasswordField, RoleChoice,
  RuleChips, Segmented, Spinner, authLabelCls, authLink, authPrimaryBtn, authSecondaryBtn, authSelectCls,
} from '@/components/auth/AuthUI'

const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''

export default function InscriptionPage() {
  const router = useRouter()
  const { t } = useI18n()
  const a = t.auth
  const s = t.auth.signup

  const [etape, setEtape]                     = useState<1 | 2>(1)
  const [role, setRole]                       = useState<'CLIENT' | 'VENDEUR'>('CLIENT')
  const [identifiantType, setIdentifiantType] = useState<'email' | 'telephone'>('email')
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    motDePasse: '', nomBoutique: '',
  })
  // Localisation de la boutique (vendeurs) : sert au classement des produits
  const [lieu, setLieu] = useState({ wilaya: '', commune: '' })
  const [code, setCode]                   = useState('')
  const [loading, setLoading]             = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError]                 = useState<string | null>(null)

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
    (role === 'VENDEUR' ? form.nomBoutique && lieu.wilaya && lieu.commune : true) &&
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
      if (role === 'VENDEUR') {
        body.nomBoutique = form.nomBoutique
        body.wilaya      = lieu.wilaya
        body.commune     = lieu.commune
      }

      const res  = await fetch('/api/auth/inscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEtape(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : a.unknownError)
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
      setError(e instanceof Error ? e.message : a.unknownError)
    } finally { setLoading(false) }
  }

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
          setError(a.googleTokenError); return
        }
        const res  = await fetch('/api/auth/google-native', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: googleResult.idToken }),
        })
        const data = await res.json()
        if (!res.ok || !data.ok) { setError(data.error || a.googleError); return }
        const signInResult = await signIn('credentials-google', { userId: data.userId, redirect: false })
        if (signInResult?.ok) { router.push(callbackUrl); router.refresh() }
        else setError(a.sessionError)
      } else {
        await signIn('google', { callbackUrl })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : a.googleLoginError)
    } finally { setLoadingGoogle(false) }
  }

  const identifiant = identifiantType === 'email' ? form.email : form.telephone
  const pwd = form.motDePasse
  const reglesMdp = [
    { ok: pwd.length >= 8,          label: s.rules.length },
    { ok: /[A-Z]/.test(pwd),        label: s.rules.upper },
    { ok: /[0-9]/.test(pwd),        label: s.rules.number },
    { ok: /[^A-Za-z0-9]/.test(pwd), label: s.rules.symbol },
  ]
  const statutId = checkingId
    ? <Spinner />
    : idStatus === 'available' ? <Check className="w-5 h-5 text-emerald-600" aria-hidden="true" />
    : idStatus === 'taken'     ? <X className="w-5 h-5 text-red-500" aria-hidden="true" />
    : null

  // ── Étape 2 : code de confirmation ───────────────────────────────────────
  if (etape === 2) {
    return (
      <AuthScreen
        title={s.stepConfirm}
        subtitle={<>{a.codeSentTo} <span className="font-medium text-stone-900 dark:text-stone-100" dir="ltr">{identifiant}</span></>}
        step={{ current: 2, total: 2 }}
        onBack={() => { setEtape(1); setCode(''); setError(null) }}
      >
        <OtpInput value={code} onChange={setCode} label={a.confirmationCode} />
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <AuthActions>
          <button type="button" onClick={handleEtape2} disabled={loading || code.length !== 6} className={authPrimaryBtn}>
            {loading ? <><Spinner light /> {a.verifying}</> : s.confirmAccount}
          </button>
          <button type="button" onClick={() => { setEtape(1); setCode(''); setError(null) }}
            className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-orange-700 py-2">
            {a.editMyInfo}
          </button>
        </AuthActions>
      </AuthScreen>
    )
  }

  // ── Étape 1 : informations ───────────────────────────────────────────────
  return (
    <AuthScreen
      title={s.title}
      subtitle={s.subtitle}
      step={{ current: 1, total: 2 }}
      backHref="/connexion"
      below={<p>{s.alreadyAccount}{' '}<Link href="/connexion" className={authLink}>{a.login}</Link></p>}
    >
      <form onSubmit={e => { e.preventDefault(); if (canSubmitEtape1 && !loading) handleEtape1() }} className="space-y-4">
        <RoleChoice
          label={s.iAm}
          value={role}
          onChange={setRole}
          options={[
            { value: 'CLIENT',  title: a.googleFinalize.buy,  desc: a.googleFinalize.clientAccount, icon: ShoppingBag },
            { value: 'VENDEUR', title: a.googleFinalize.sell, desc: a.googleFinalize.sellerAccount, icon: Store },
          ]}
        />
        {role === 'VENDEUR' && <AuthAlert tone="info">{s.sellerBlocked}</AuthAlert>}

        <button type="button" onClick={handleGoogle} disabled={loadingGoogle || loading} className={authSecondaryBtn}>
          {loadingGoogle ? <Spinner /> : <GoogleIcon />}
          {role === 'VENDEUR' ? a.continueWithGoogleSeller : a.continueWithGoogle}
        </button>
        <AuthDivider />

        <div className="grid grid-cols-2 gap-3">
          <AuthField id="nom" label={s.lastName} value={form.nom} onChange={handleChange('nom')} placeholder={s.lastNamePlaceholder} autoComplete="family-name" />
          <AuthField id="prenom" label={s.firstName} value={form.prenom} onChange={handleChange('prenom')} placeholder={s.firstNamePlaceholder} autoComplete="given-name" />
        </div>

        {role === 'VENDEUR' && (
          <>
            <AuthField id="nomBoutique" label={a.shopName} icon={Store} value={form.nomBoutique} onChange={handleChange('nomBoutique')} placeholder={a.shopPlaceholder} />
            <WilayaCommuneSelect
              wilaya={lieu.wilaya}
              commune={lieu.commune}
              onChange={setLieu}
              required
              selectClassName={authSelectCls}
              labelClassName={authLabelCls}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            />
          </>
        )}

        <Segmented
          label={t.auth.signin.identifier}
          value={identifiantType}
          onChange={v => { setIdentifiantType(v); setIdStatus('idle') }}
          options={[{ value: 'email', label: s.email }, { value: 'telephone', label: s.phone }]}
        />
        <AuthField
          id="identifiant"
          type={identifiantType === 'email' ? 'email' : 'tel'}
          inputMode={identifiantType === 'email' ? 'email' : 'tel'}
          autoComplete={identifiantType === 'email' ? 'email' : 'tel'}
          aria-label={identifiantType === 'email' ? s.email : s.phone}
          icon={identifiantType === 'email' ? Mail : Smartphone}
          value={identifiant}
          onChange={e => { handleChange(identifiantType === 'email' ? 'email' : 'telephone')(e); setIdStatus('idle') }}
          placeholder={identifiantType === 'email' ? s.emailPlaceholder : s.phonePlaceholder}
          dir="ltr"
          tone={idStatus === 'available' ? 'ok' : idStatus === 'taken' ? 'error' : 'default'}
          end={statutId}
          hint={
            idStatus === 'available' ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{identifiantType === 'email' ? s.emailAvailable : s.numberAvailable}</p>
            ) : idStatus === 'taken' ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {identifiantType === 'email' ? s.emailTaken : s.phoneTaken}.{' '}
                <Link href="/connexion" className={authLink}>{a.loginQuestion}</Link>
              </p>
            ) : null
          }
        />

        <PasswordField
          id="motDePasse"
          label={s.password}
          icon={Lock}
          autoComplete="new-password"
          value={form.motDePasse}
          onChange={handleChange('motDePasse')}
          placeholder={s.passwordPlaceholder}
          hint={pwd.length > 0 ? <div className="pt-1"><RuleChips rules={reglesMdp} /></div> : null}
        />

        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <AuthActions>
          <button type="submit" disabled={loading || !canSubmitEtape1} className={authPrimaryBtn}>
            {loading ? <><Spinner light /> {a.sending}</> : a.receiveCode}
          </button>
          <p className="md:hidden text-center text-sm text-stone-500 dark:text-stone-400">
            {s.alreadyAccount}{' '}<Link href="/connexion" className={authLink}>{a.login}</Link>
          </p>
        </AuthActions>
      </form>
    </AuthScreen>
  )
}
