'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { ShoppingBag, Smartphone, Store } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import {
  AuthActions, AuthAlert, AuthField, AuthScreen, OtpInput, RoleChoice, Spinner, authLink, authPrimaryBtn,
} from '@/components/auth/AuthUI'

function FinaliserGoogleContent() {
  const { t } = useI18n()
  const a = t.auth
  const g = t.auth.googleFinalize
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
      setError(e instanceof Error ? e.message : a.unknownError)
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
      if (!signInResult?.ok) throw new Error(g.sessionCreateError)

      if (data.role === 'VENDEUR') {
        router.push('/inscription/finaliser-vendeur?skipPhone=true')
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : a.unknownError)
    } finally { setLoading(false) }
  }

  // ── Étape 2 : code reçu par SMS ──────────────────────────────────────────
  if (etape === 2) {
    return (
      <AuthScreen
        title={g.stepSms}
        subtitle={<>{a.codeSentToPhone} <span className="font-medium text-stone-900 dark:text-stone-100" dir="ltr">{telephone}</span></>}
        step={{ current: 2, total: 2 }}
        onBack={() => { setEtape(1); setCode(''); setError(null) }}
      >
        {testMode && <AuthAlert tone="warning">{a.testMode} <span className="font-semibold tabular-nums">000000</span></AuthAlert>}
        <OtpInput value={code} onChange={setCode} label={a.confirmationCode} />
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <AuthActions>
          <button type="button" onClick={handleEtape2} disabled={loading || code.length !== 6} className={authPrimaryBtn}>
            {loading ? <><Spinner light /> {a.creating}</> : g.confirmCreate}
          </button>
          <button type="button" onClick={() => { setEtape(1); setCode(''); setError(null) }}
            className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-orange-700 py-2">
            {a.editMyInfo}
          </button>
        </AuthActions>
      </AuthScreen>
    )
  }

  // ── Étape 1 : rôle et téléphone ──────────────────────────────────────────
  return (
    <AuthScreen
      title={g.title}
      subtitle={g.sideTitle}
      step={{ current: 1, total: 2 }}
      backHref="/connexion"
      below={<p>{g.haveAccount}{' '}<Link href="/connexion" className={authLink}>{a.login}</Link></p>}
    >
      <form onSubmit={e => { e.preventDefault(); if (phoneValid && !loading) handleEtape1() }} className="space-y-4">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{g.iWant}</p>
        <RoleChoice
          label={g.iWant}
          value={role}
          onChange={setRole}
          options={[
            { value: 'CLIENT',  title: g.buy,  desc: g.clientAccount, icon: ShoppingBag },
            { value: 'VENDEUR', title: g.sell, desc: g.sellerAccount, icon: Store },
          ]}
        />
        {role === 'VENDEUR' && <AuthAlert tone="info">{g.sellerNote}</AuthAlert>}

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
          <button type="submit" disabled={loading || !phoneValid} className={authPrimaryBtn}>
            {loading ? <><Spinner light /> {a.sending}</> : g.receiveSms}
          </button>
          <p className="md:hidden text-center text-sm text-stone-500 dark:text-stone-400">
            {g.haveAccount}{' '}<Link href="/connexion" className={authLink}>{a.login}</Link>
          </p>
        </AuthActions>
      </form>
    </AuthScreen>
  )
}

export default function FinaliserGooglePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white md:bg-[#f3f0ec] dark:bg-stone-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin" />
      </div>
    }>
      <FinaliserGoogleContent />
    </Suspense>
  )
}
