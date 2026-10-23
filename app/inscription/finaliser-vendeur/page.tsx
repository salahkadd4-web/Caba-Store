'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Smartphone, Store } from 'lucide-react'
import WilayaCommuneSelect from '@/components/WilayaCommuneSelect'
import { useI18n } from '@/components/I18nProvider'
import {
  AuthActions, AuthAlert, AuthField, AuthScreen, OtpInput, Spinner,
  authLabelCls, authLink, authPrimaryBtn, authSelectCls,
} from '@/components/auth/AuthUI'

function FinaliserVendeurContent() {
  const { t } = useI18n()
  const a = t.auth
  const v = t.auth.sellerFinalize
  const router       = useRouter()
  const searchParams = useSearchParams()
  const skipPhone    = searchParams.get('skipPhone') === 'true'

  const { data: session, status, update } = useSession()

  const [etape,       setEtape]       = useState<1 | 2>(1)
  const [nomBoutique, setNomBoutique] = useState('')
  // Localisation de la boutique : sert au classement des produits
  const [lieu,        setLieu]        = useState({ wilaya: '', commune: '' })
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
        body: JSON.stringify({ etape: 1, telephone, nomBoutique, wilaya: lieu.wilaya, commune: lieu.commune }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTestMode(!!data.testMode)
      setEtape(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : a.unknownError)
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
      setError(e instanceof Error ? e.message : a.unknownError)
    } finally { setLoading(false) }
  }

  const handleEtape1Skip = async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/auth/finaliser-vendeur', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etape: 1, nomBoutique, wilaya: lieu.wilaya, commune: lieu.commune, skipPhone: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(data.message)
      await update()
      setTimeout(() => { router.push('/vendeur'); router.refresh() }, 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : a.unknownError)
    } finally { setLoading(false) }
  }

  const lieuComplet = !!(lieu.wilaya && lieu.commune)

  const canSubmitNormal =
    nomBoutique.trim().length >= 2 &&
    lieuComplet &&
    /^(05|06|07)\d{8}$/.test(telephone.replace(/\s/g, ''))

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white md:bg-[#f3f0ec] dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin" />
      </div>
    )
  }

  // Compte connecté (avec téléphone déjà vérifié si l'on vient de Google)
  const compte = session?.user && (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
      {session.user.image ? (
        <Image src={session.user.image} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-sm text-orange-800 dark:text-orange-300 font-semibold">
          {session.user.name?.[0] ?? '?'}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{session.user.name}</p>
        <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{session.user.email}</p>
      </div>
      {skipPhone && session.user.telephone && (
        <span className="ms-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-full shrink-0" dir="ltr">
          <Check className="w-3.5 h-3.5" />{session.user.telephone}
        </span>
      )}
    </div>
  )

  // ── Boutique créée ───────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthScreen title={v.shopCreated} subtitle={success} showTrust={false}>
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
          <Check className="w-7 h-7" />
        </div>
        <AuthAlert tone="info">{v.activationNote}</AuthAlert>
        <p className="text-sm text-stone-500 dark:text-stone-400 flex items-center gap-2"><Spinner /> {v.redirecting}</p>
      </AuthScreen>
    )
  }

  const champsBoutique = (
    <>
      <AuthField
        id="nomBoutique"
        label={a.shopName}
        icon={Store}
        value={nomBoutique}
        onChange={e => setNomBoutique(e.target.value)}
        placeholder={a.shopPlaceholder}
        hint={<p className="text-sm text-stone-500 dark:text-stone-400">{v.shopPublicHint}</p>}
      />
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
  )

  // ── Téléphone déjà vérifié (arrivée depuis Google) : une seule étape ────────
  if (skipPhone) {
    return (
      <AuthScreen title={v.title} subtitle={v.sideTitle} backHref="/">
        <form onSubmit={e => { e.preventDefault(); if (nomBoutique.trim().length >= 2 && lieuComplet && !loading) handleEtape1Skip() }} className="space-y-4">
          {compte}
          {champsBoutique}
          {error && <AuthAlert tone="error">{error}</AuthAlert>}
          <AuthActions>
            <button type="submit" disabled={loading || nomBoutique.trim().length < 2 || !lieuComplet} className={authPrimaryBtn}>
              {loading ? <><Spinner light /> {a.creating}</> : v.createShop}
            </button>
          </AuthActions>
        </form>
      </AuthScreen>
    )
  }

  // ── Étape 2 : code reçu par SMS ──────────────────────────────────────────
  if (etape === 2) {
    return (
      <AuthScreen
        title={v.stepConfirm}
        subtitle={<>{a.codeSentToPhone} <span className="font-medium text-stone-900 dark:text-stone-100" dir="ltr">{telephone}</span></>}
        step={{ current: 2, total: 2 }}
        onBack={() => { setEtape(1); setCode(''); setError(null) }}
      >
        {testMode && <AuthAlert tone="warning">{a.testMode} <span className="font-semibold tabular-nums">000000</span></AuthAlert>}
        <OtpInput value={code} onChange={setCode} label={a.confirmationCode} />
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <AuthActions>
          <button type="button" onClick={handleEtape2Normal} disabled={loading || code.length !== 6} className={authPrimaryBtn}>
            {loading ? <><Spinner light /> {a.verifying}</> : v.activateSeller}
          </button>
          <button type="button" onClick={() => { setEtape(1); setCode(''); setError(null) }}
            className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-orange-700 py-2">
            {a.editMyInfo}
          </button>
        </AuthActions>
      </AuthScreen>
    )
  }

  // ── Étape 1 : boutique et téléphone ──────────────────────────────────────
  return (
    <AuthScreen
      title={v.title}
      subtitle={v.sideTitle}
      step={{ current: 1, total: 2 }}
      backHref="/"
      below={<p>{v.clientQuestion}{' '}<Link href="/" className={authLink}>{v.continueWithoutShop}</Link></p>}
    >
      <form onSubmit={e => { e.preventDefault(); if (canSubmitNormal && !loading) handleEtape1Normal() }} className="space-y-4">
        {compte}
        {champsBoutique}
        <AuthField
          id="telephone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          label={a.phoneNumber}
          icon={Smartphone}
          value={telephone}
          onChange={e => setTelephone(e.target.value)}
          placeholder="05 XX XX XX XX"
          dir="ltr"
          hint={<p className="text-sm text-stone-500 dark:text-stone-400">{a.smsCodeHint}</p>}
        />
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <AuthActions>
          <button type="submit" disabled={loading || !canSubmitNormal} className={authPrimaryBtn}>
            {loading ? <><Spinner light /> {a.sending}</> : a.receiveCode}
          </button>
          <p className="md:hidden text-center text-sm text-stone-500 dark:text-stone-400">
            {v.clientQuestion}{' '}<Link href="/" className={authLink}>{v.continueWithoutShop}</Link>
          </p>
        </AuthActions>
      </form>
    </AuthScreen>
  )
}

export default function FinaliserVendeurPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white md:bg-[#f3f0ec] dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin" />
      </div>
    }>
      <FinaliserVendeurContent />
    </Suspense>
  )
}
