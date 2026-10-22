'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Store, Phone, ShieldCheck } from 'lucide-react'
import CabaLogo from '@/components/CabaLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import WilayaCommuneSelect from '@/components/WilayaCommuneSelect'
import { useI18n } from '@/components/I18nProvider'
import AuthBrandPanel from '@/components/client/AuthBrandPanel'

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

  // ── Styles ────────────────────────────────────────────────────────────────
  const labelCls  = 'block text-xs   text-stone-500 dark:text-stone-400 mb-2'
  const baseInput = 'w-full h-11 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:border-orange-700 dark:focus:border-orange-500 focus:ring-2 focus:ring-orange-700/15 outline-none text-sm text-stone-800 dark:text-stone-100 transition-colors duration-300 placeholder-stone-300 dark:placeholder-stone-700'
  const btnPrimary = 'w-full bg-orange-700 hover:bg-orange-800 text-white text-xs   py-4 rounded-xl transition-colors duration-300 disabled:opacity-40 flex items-center justify-center gap-2'

  const Stepper = () => (
    <div className="flex items-center gap-3 mb-10">
      {([
        { n: 1, label: v.stepShopPhone },
        { n: 2, label: v.stepConfirm },
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
          <span className={`text-xs hidden sm:block transition-colors duration-300 ${
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

      <AuthBrandPanel
        title={v.sideTitle}
        points={[
          { icon: Store,       text: v.sideShop },
          { icon: Phone,       text: skipPhone ? v.sidePhoneVerified : v.sideSms },
          { icon: ShieldCheck, text: v.sideValidation },
        ]}
      />

      {/* ── Formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          <div className="flex justify-end mb-6 -mt-2">
            <LanguageSwitcher className="border border-stone-200 dark:border-stone-700" />
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-500 mb-2">
              {skipPhone ? v.lastStep : v.almostDone}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              {v.title}
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
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-xs text-orange-700 dark:text-orange-400 font-semibold">
                  {session.user.name?.[0] ?? '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-stone-800 dark:text-stone-100 truncate">{session.user.name}</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 truncate">{session.user.email}</p>
              </div>
              {skipPhone && session.user.telephone && (
                <div className="ms-auto flex items-center gap-1 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-2 py-1 rounded-xl shrink-0">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-green-700 dark:text-green-400 font-medium">
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
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-500">
                {v.shopCreated}
              </p>
              <p className="text-sm font-light text-stone-800 dark:text-stone-100">{success}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 ">
                {v.activationNote}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-600 mt-4">
                {v.redirecting}
              </p>
            </div>
          ) : (
            <>
              {/* ══ MODE SKIP_PHONE ══ */}
              {skipPhone ? (
                <div className="space-y-7">
                  <div>
                    <label className={labelCls}>{a.shopName}</label>
                    <input type="text" value={nomBoutique} onChange={e => setNomBoutique(e.target.value)}
                      placeholder={a.shopPlaceholder} className={baseInput} />
                    <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-600 ">
                      {v.shopPublicHint}
                    </p>
                  </div>
                  <WilayaCommuneSelect
                    wilaya={lieu.wilaya}
                    commune={lieu.commune}
                    onChange={setLieu}
                    required
                    selectClassName={baseInput}
                    labelClassName={labelCls}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                  />

                  {error && (
                    <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-xl ">{error}</div>
                  )}

                  <button onClick={handleEtape1Skip} disabled={loading || nomBoutique.trim().length < 2 || !lieuComplet}
                    className={btnPrimary}>
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {a.creating}</>
                      : v.createShop
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
                      <label className={labelCls}>{a.shopName}</label>
                      <input type="text" value={nomBoutique} onChange={e => setNomBoutique(e.target.value)}
                        placeholder={a.shopPlaceholder} className={baseInput} />
                    </div>
                    <WilayaCommuneSelect
                      wilaya={lieu.wilaya}
                      commune={lieu.commune}
                      onChange={setLieu}
                      required
                      selectClassName={baseInput}
                      labelClassName={labelCls}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                    />
                    <div>
                      <label className={labelCls}>{a.phoneNumber}</label>
                      <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                        placeholder="05 XX XX XX XX" className={baseInput} />
                      <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-600 ">
                        {a.smsCodeHint}
                      </p>
                    </div>

                    {error && (
                      <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-xl ">{error}</div>
                    )}

                    <button onClick={handleEtape1Normal} disabled={loading || !canSubmitNormal}
                      className={btnPrimary}>
                      {loading
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {a.sending}</>
                        : a.receiveCode
                      }
                    </button>

                    <p className="text-center text-xs text-stone-400 dark:text-stone-500 ">
                      {v.clientQuestion}{' '}
                      <Link href="/" className="text-orange-700 dark:text-orange-500 underline underline-offset-4 font-medium">
                        {v.continueWithoutShop}
                      </Link>
                    </p>
                  </div>
                )}

                {/* ÉTAPE 2 — OTP */}
                {etape === 2 && (
                  <div className="space-y-7">
                    <div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">{a.codeSentToPhone}</p>
                      <p dir="ltr" className="text-sm text-stone-900 dark:text-stone-100 font-medium text-start">{telephone}</p>
                      {testMode && (
                        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-xl ">
                          {a.testMode} <span className="font-mono font-bold">000000</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-stone-500 dark:text-stone-400 mb-4">
                        {a.confirmationCode}
                      </label>
                      <input type="text" inputMode="numeric" value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6} placeholder="• • • • • •"
                        className="w-full h-14 px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 focus:border-orange-700 dark:focus:border-orange-500 focus:ring-2 focus:ring-orange-700/15 outline-none text-center text-2xl font-mono tracking-[0.5em] text-stone-800 dark:text-stone-100 transition-colors duration-300 placeholder-stone-300 dark:placeholder-stone-700" />
                      <div className="flex gap-1.5 mt-2 justify-center">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className={`h-0.5 flex-1 transition-colors duration-200 ${
 i < code.length ? 'bg-orange-700 dark:bg-orange-500' : 'bg-stone-200 dark:bg-stone-800'
 }`} />
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 rounded-xl ">{error}</div>
                    )}

                    <button onClick={handleEtape2Normal} disabled={loading || code.length !== 6}
                      className={btnPrimary}>
                      {loading
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {a.verifying}</>
                        : v.activateSeller
                      }
                    </button>

                    <button onClick={() => { setEtape(1); setCode(''); setError(null) }}
                      className="w-full text-xs text-stone-400 dark:text-stone-600 hover:text-orange-700 dark:hover:text-orange-500 transition-colors py-2">
                      {a.editMyInfo}
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
          <p className="text-xs text-stone-300 dark:text-stone-700 ">{t.common.appName}</p>
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
