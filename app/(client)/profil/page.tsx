'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Check, Lock, Mail, X } from 'lucide-react'

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar','Blida','Bouira',
  'Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda',
  'Skikda','Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem',"M'Sila",'Mascara',
  'Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf',
  'Tissemsilt','El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane',
]

const pwdRules = [
  { id: 'length',  label: 'Au moins 8 caractères',         test: (p: string) => p.length >= 8 },
  { id: 'upper',   label: 'Au moins une lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Au moins une lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number',  label: 'Au moins un chiffre',           test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Au moins un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      {pwdRules.map((rule) => {
        const ok = rule.test(password)
        return (
          <div key={rule.id} className="flex items-center gap-2">
            <span className={`text-xs transition-colors ${ok ? 'text-green-700 dark:text-green-400' : 'text-stone-400 dark:text-stone-600'}`}>{ok ? <Check className="w-4 h-4" /> : '○'}</span>
            <span className={`text-xs transition-colors ${ok ? 'text-green-700 dark:text-green-400' : 'text-stone-400 dark:text-stone-500'}`}>{rule.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between py-3.5 border-b border-stone-100 dark:border-stone-800 gap-4">
      <span className="text-xs uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500 shrink-0">{label}</span>
      <span className="text-sm text-stone-800 dark:text-stone-100 text-right break-all">
        {value || <span className="text-stone-300 dark:text-stone-600 italic">Non renseigné</span>}
      </span>
    </div>
  )
}

/** Bloc confirmation pour comptes AVEC mot de passe */
function ConfirmPasswordBlock({ value, onChange, inputClass, labelClass }: {
  value: string; onChange: (v: string) => void; inputClass: string; labelClass: string
}) {
  return (
    <div className="border-t border-stone-200 dark:border-stone-800 pt-5 space-y-4">
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <Lock className="w-4 h-4 inline mr-1" />Entrez votre mot de passe actuel pour confirmer les modifications
        </p>
      </div>
      <div>
        <label className={labelClass}>Mot de passe actuel *</label>
        <input type="password" value={value} onChange={e => onChange(e.target.value)}
          required className={inputClass} placeholder="••••••••" />
      </div>
    </div>
  )
}

/** Bloc confirmation par OTP pour comptes Google (SANS mot de passe) */
function ConfirmOtpBlock({
  otpValue, onOtpChange, onSendCode, sending, codeSent, labelClass, otpClass,
}: {
  otpValue: string
  onOtpChange: (v: string) => void
  onSendCode: () => void
  sending: boolean
  codeSent: boolean
  inputClass: string
  labelClass: string
  otpClass: string
}) {
  return (
    <div className="border-t border-stone-200 dark:border-stone-800 pt-5 space-y-4">
      <div className="bg-orange-50 dark:bg-stone-900 border border-orange-200 dark:border-stone-700 rounded-xl px-4 py-3">
        <p className="text-xs text-orange-700 dark:text-orange-400">
          <Mail className="w-4 h-4 inline mr-1" />
          Votre compte Google ne possède pas de mot de passe.
          Un code de confirmation sera envoyé à votre email.
        </p>
      </div>
      {!codeSent ? (
        <button
          type="button"
          onClick={onSendCode}
          disabled={sending}
          className="w-full border border-stone-300 dark:border-stone-600 hover:border-orange-700 dark:hover:border-orange-500 text-stone-700 dark:text-stone-300 hover:text-orange-700 dark:hover:text-orange-500 text-xs uppercase tracking-[0.2em] py-3 transition-colors disabled:opacity-50"
        >
          {sending ? 'Envoi...' : 'Envoyer un code par email'}
        </button>
      ) : (
        <div>
          <label className={labelClass}>Code reçu par email *</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpValue}
            onChange={e => onOtpChange(e.target.value.replace(/\D/g, ''))}
            required
            className={otpClass}
            placeholder="000000"
            autoFocus
          />
          <button
            type="button"
            onClick={onSendCode}
            disabled={sending}
            className="mt-2 text-xs text-stone-400 dark:text-stone-500 hover:text-orange-700 dark:hover:text-orange-500 transition-colors underline underline-offset-2"
          >
            {sending ? 'Renvoi...' : 'Renvoyer le code'}
          </button>
        </div>
      )}
    </div>
  )
}

type Section     = 'infos' | 'password' | 'email'
type EmailEtape  = 'form' | 'codeAncien' | 'codeNouveau'
type View        = 'profil' | 'edit'
type EmailStatus = 'idle' | 'checking' | 'available' | 'same' | 'taken'

export default function ProfilPage() {
  const { data: session, update } = useSession()
  const [view,       setView]       = useState<View>('profil')
  const [section,    setSection]    = useState<Section>('infos')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [success,    setSuccess]    = useState('')
  const [error,      setError]      = useState('')
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  const [profil, setProfil] = useState({
    nom: '', prenom: '', telephone: '', age: '', genre: '', wilaya: '',
    adresse: '',
  })

  // ── Confirmation infos : mot de passe OU otp ─────────────────────────────
  const [motDePasseConfirm, setMotDePasseConfirm] = useState('')
  const [infosOtp,          setInfosOtp]          = useState('')
  const [infosOtpSent,      setInfosOtpSent]      = useState(false)
  const [infosOtpSending,   setInfosOtpSending]   = useState(false)

  // ── Mot de passe ─────────────────────────────────────────────────────────
  const [pwd, setPwd] = useState({ actuel: '', nouveau: '', confirmer: '' })
  const [pwdOtp,       setPwdOtp]       = useState('')
  const [pwdOtpSent,   setPwdOtpSent]   = useState(false)
  const [pwdOtpSending,setPwdOtpSending]= useState(false)

  // ── Email ─────────────────────────────────────────────────────────────────
  const [emailForm, setEmailForm] = useState({
    motDePasse: '', nouvelEmail: '', codeAncien: '', codeNouveau: '',
    etape: 'form' as EmailEtape,
  })
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailStatus,   setEmailStatus]   = useState<EmailStatus>('idle')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // ── Debounce vérif email ──────────────────────────────────────────────────
  useEffect(() => {
    const val = emailForm.nouvelEmail.trim()
    if (!val) { setEmailStatus('idle'); return }
    if (val.toLowerCase() === session?.user?.email?.toLowerCase()) { setEmailStatus('same'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { setEmailStatus('idle'); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setEmailChecking(true); setEmailStatus('checking')
      try {
        const res  = await fetch('/api/profil/email/check', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: val }),
        })
        const data = await res.json()
        setEmailStatus(data.exists ? 'taken' : 'available')
      } catch { setEmailStatus('idle') }
      finally  { setEmailChecking(false) }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [emailForm.nouvelEmail, session?.user?.email])

  // ── Chargement profil ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/profil')
      .then(r => r.json())
      .then(data => {
        setProfil({
          nom:       data.nom       || '',
          prenom:    data.prenom    || '',
          telephone: data.telephone || '',
          age:       data.age       ? String(data.age) : '',
          genre:     data.genre     || '',
          wilaya:    data.wilaya    || '',
          adresse:   data.adresse   || '',
        })
        setHasPassword(!!data.hasPassword)
        setLoading(false)
      })
  }, [])

  const clearMessages = () => { setError(''); setSuccess('') }
  const goToEdit = () => { clearMessages(); setSection('infos'); setView('edit') }
  const goBack   = () => {
    clearMessages()
    setMotDePasseConfirm(''); setInfosOtp(''); setInfosOtpSent(false)
    setPwd({ actuel: '', nouveau: '', confirmer: '' }); setPwdOtp(''); setPwdOtpSent(false)
    setEmailForm({ motDePasse: '', nouvelEmail: '', codeAncien: '', codeNouveau: '', etape: 'form' })
    setEmailStatus('idle'); setView('profil')
  }

  // ── Envoi OTP profil (infos ou password) ─────────────────────────────────
  const sendProfileOtp = async (onDone: () => void, onSending: (v: boolean) => void) => {
    onSending(true)
    try {
      const res  = await fetch('/api/profil/otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Code envoyé à votre email.')
      onDone()
    } catch { setError('Erreur serveur') }
    finally  { onSending(false) }
  }

  // ── Enregistrement infos ──────────────────────────────────────────────────
  const handleSaveInfos = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages()

    // Vérification locale avant envoi
    if (hasPassword && !motDePasseConfirm) {
      setError('Veuillez entrer votre mot de passe pour confirmer'); return
    }
    if (!hasPassword && !infosOtp) {
      setError('Veuillez entrer le code de confirmation'); return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        ...profil,
        age: profil.age ? parseInt(profil.age) : null,
      }
      if (hasPassword) body.motDePasse = motDePasseConfirm
      else             body.otp        = infosOtp

      const res  = await fetch('/api/profil', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Informations mises à jour !')
      setMotDePasseConfirm(''); setInfosOtp(''); setInfosOtpSent(false)
      await update()
    } catch { setError('Erreur serveur') } finally { setSaving(false) }
  }

  // ── Changement / définition mot de passe ─────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages()
    if (!pwdRules.every(r => r.test(pwd.nouveau))) { setError('Le nouveau mot de passe ne respecte pas les conditions'); return }
    if (pwd.nouveau !== pwd.confirmer) { setError('Les mots de passe ne correspondent pas'); return }
    if (hasPassword && !pwd.actuel) { setError('Veuillez entrer votre mot de passe actuel'); return }
    if (!hasPassword && !pwdOtp)    { setError('Veuillez entrer le code de confirmation');   return }

    setSaving(true)
    try {
      const body: Record<string, unknown> = { nouveauMotDePasse: pwd.nouveau }
      if (hasPassword) body.motDePasseActuel = pwd.actuel
      else             body.otp              = pwdOtp

      const res  = await fetch('/api/profil/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(data.message)
      setPwd({ actuel: '', nouveau: '', confirmer: '' }); setPwdOtp(''); setPwdOtpSent(false)
      // Après avoir défini un mot de passe, mettre à jour l'état local
      if (!hasPassword) setHasPassword(true)
    } catch { setError('Erreur serveur') } finally { setSaving(false) }
  }

  // ── Changement email ──────────────────────────────────────────────────────
  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setSaving(true)
    try {
      const body: Record<string, unknown> = { etape: 1, nouvelEmail: emailForm.nouvelEmail }
      // Pour les comptes avec mot de passe, on l'envoie ; pour Google c'est optionnel
      if (hasPassword) body.motDePasse = emailForm.motDePasse
      const res  = await fetch('/api/profil/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setEmailForm(f => ({ ...f, etape: 'codeAncien' })); setSuccess('Code envoyé à votre email actuel.')
    } catch { setError('Erreur serveur') } finally { setSaving(false) }
  }

  const handleVerifyOldEmail = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setSaving(true)
    try {
      const res  = await fetch('/api/profil/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etape: 2, codeAncien: emailForm.codeAncien, nouvelEmail: emailForm.nouvelEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setEmailForm(f => ({ ...f, etape: 'codeNouveau' })); setSuccess(`Code envoyé à ${emailForm.nouvelEmail}`)
    } catch { setError('Erreur serveur') } finally { setSaving(false) }
  }

  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault(); clearMessages(); setSaving(true)
    try {
      const res  = await fetch('/api/profil/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etape: 3, nouvelEmail: emailForm.nouvelEmail, codeNouveau: emailForm.codeNouveau }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess('Email modifié avec succès !')
      setEmailForm({ motDePasse: '', nouvelEmail: '', codeAncien: '', codeNouveau: '', etape: 'form' })
      setEmailStatus('idle'); await update()
    } catch { setError('Erreur serveur') } finally { setSaving(false) }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputClass = "w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors"
  const labelClass = "block text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400 mb-2"
  const otpClass   = "w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-xl text-center tracking-[0.4em] text-stone-800 dark:text-stone-100 bg-transparent transition-colors"
  const tabClass   = (s: Section) => `flex-1 py-2.5 text-xs uppercase tracking-[0.15em] border-b-2 transition-colors text-center ${section === s ? 'border-orange-700 dark:border-orange-500 text-orange-700 dark:text-orange-500' : 'border-transparent text-stone-400 dark:text-stone-500'}`
  const btnCancel  = "flex-1 border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-stone-700 dark:hover:border-stone-300 hover:text-stone-800 dark:hover:text-stone-100 text-xs uppercase tracking-[0.2em] py-3.5 transition-colors rounded-none"
  const btnSubmit  = "flex-1 bg-orange-700 dark:bg-orange-600 hover:bg-orange-800 dark:hover:bg-orange-700 text-white text-xs uppercase tracking-[0.2em] py-3.5 transition-colors disabled:opacity-50 rounded-none"

  const emailInputBorder =
    emailStatus === 'available' ? 'border-green-500 dark:border-green-400' :
    emailStatus === 'taken'     ? 'border-red-500 dark:border-red-400'     :
    emailStatus === 'same'      ? 'border-red-500 dark:border-red-400'     :
    'border-stone-300 dark:border-stone-600'

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-stone-500 dark:text-stone-400 text-sm">Chargement...</p>
    </div>
  )

  /* ── VUE PROFIL ─────────────────────────────────────────────────────────── */
  if (view === 'profil') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-12">
        <div className="mb-6 md:mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-2">Compte</p>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Mon Profil</h1>
          <div className="w-8 h-px bg-orange-700 dark:bg-orange-500 mt-3 md:mt-4" />
        </div>

        <div className="flex items-center gap-4 mb-8 bg-stone-100 dark:bg-stone-900 rounded-2xl p-4">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-orange-700 dark:bg-orange-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xl md:text-2xl font-semibold">
              {profil.prenom?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-base md:text-lg font-semibold text-stone-800 dark:text-stone-100 truncate">{profil.prenom} {profil.nom}</p>
            <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 truncate">{session?.user?.email}</p>
            {hasPassword === false && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] uppercase tracking-wide bg-orange-100 dark:bg-stone-800 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Connexion Google
              </span>
            )}
          </div>
        </div>

        <div className="mb-8 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 px-4 divide-y divide-stone-100 dark:divide-stone-800">
          <InfoRow label="Nom"       value={profil.nom} />
          <InfoRow label="Prénom"    value={profil.prenom} />
          <InfoRow label="Âge"       value={profil.age} />
          <InfoRow label="Genre"     value={profil.genre === 'HOMME' ? 'Homme' : profil.genre === 'FEMME' ? 'Femme' : undefined} />
          <InfoRow label="Téléphone" value={profil.telephone} />
          <InfoRow label="Wilaya"    value={profil.wilaya} />
          <InfoRow label="Adresse"   value={profil.adresse} />
        </div>

        <button onClick={goToEdit}
          className="w-full bg-orange-700 hover:bg-orange-800 text-white text-xs uppercase tracking-[0.3em] py-4 transition-colors rounded-xl">
          Modifier mes informations
        </button>
      </div>
    )
  }

  /* ── VUE ÉDITION ────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-12">
      <div className="mb-6 md:mb-8">
        <button onClick={goBack}
          className="flex items-center gap-2 text-stone-400 dark:text-stone-500 hover:text-orange-700 dark:hover:text-orange-500 text-xs uppercase tracking-[0.2em] transition-colors mb-5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Retour
        </button>
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-2">Compte</p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">Modifier</h1>
        <div className="w-8 h-px bg-orange-700 dark:bg-orange-500 mt-3 md:mt-4" />
      </div>

      <div className="flex border-b border-stone-200 dark:border-stone-800 mb-6 md:mb-8">
        <button onClick={() => { setSection('infos');    clearMessages() }} className={tabClass('infos')}>
          <span className="sm:hidden">Infos</span><span className="hidden sm:inline">Informations</span>
        </button>
        <button onClick={() => { setSection('password'); clearMessages() }} className={tabClass('password')}>
          {hasPassword === false ? 'Créer MDP' : 'Mot de passe'}
        </button>
        <button onClick={() => { setSection('email');    clearMessages() }} className={tabClass('email')}>Email</button>
      </div>

      {error   && <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-xs px-4 py-3 mb-5 rounded-lg">{error}</div>}
      {success && <div className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 text-xs px-4 py-3 mb-5 rounded-lg"><Check className="w-4 h-4 inline mr-1" />{success}</div>}

      {/* ── Informations ── */}
      {section === 'infos' && (
        <form onSubmit={handleSaveInfos} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Nom</label>
              <input type="text" value={profil.nom} onChange={e => setProfil({...profil, nom: e.target.value})} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Prénom</label>
              <input type="text" value={profil.prenom} onChange={e => setProfil({...profil, prenom: e.target.value})} required className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Âge</label>
              <input type="number" value={profil.age} onChange={e => setProfil({...profil, age: e.target.value})}
                min="10" max="100" className={inputClass} placeholder="Ex: 25" />
            </div>
            <div>
              <label className={labelClass}>Genre</label>
              <select value={profil.genre} onChange={e => setProfil({...profil, genre: e.target.value})}
                className="w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors">
                <option value="">Non précisé</option>
                <option value="HOMME">Homme</option>
                <option value="FEMME">Femme</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input type="tel" value={profil.telephone} onChange={e => setProfil({...profil, telephone: e.target.value})}
              className={inputClass} placeholder="05XX XX XX XX" />
          </div>
          <div>
            <label className={labelClass}>Wilaya</label>
            <select value={profil.wilaya} onChange={e => setProfil({...profil, wilaya: e.target.value})}
              className="w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors">
              <option value="">Sélectionner une wilaya</option>
              {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Adresse de livraison par défaut
              <span className="ml-1 text-stone-400 normal-case tracking-normal">(optionnel)</span>
            </label>
            <textarea
              value={profil.adresse}
              onChange={e => setProfil({...profil, adresse: e.target.value})}
              rows={2}
              placeholder="Numéro, rue, cité, commune…"
              className="w-full border-b border-stone-300 dark:border-stone-600 focus:border-orange-700 dark:focus:border-orange-500 outline-none py-3 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors resize-none"
            />
            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">
              Sera pré-remplie automatiquement lors de la commande
            </p>
          </div>

          {/* Confirmation : mot de passe OU OTP selon le type de compte */}
          {hasPassword ? (
            <ConfirmPasswordBlock value={motDePasseConfirm} onChange={setMotDePasseConfirm}
              inputClass={inputClass} labelClass={labelClass} />
          ) : (
            <ConfirmOtpBlock
              otpValue={infosOtp}
              onOtpChange={setInfosOtp}
              onSendCode={() => sendProfileOtp(() => setInfosOtpSent(true), setInfosOtpSending)}
              sending={infosOtpSending}
              codeSent={infosOtpSent}
              inputClass={inputClass}
              labelClass={labelClass}
              otpClass={otpClass}
            />
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={goBack} className={btnCancel}>Annuler</button>
            <button
              type="submit"
              disabled={
                saving ||
                (hasPassword ? !motDePasseConfirm : (!infosOtpSent || infosOtp.length < 6))
              }
              className={btnSubmit}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* ── Mot de passe ── */}
      {section === 'password' && (
        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Bannière pour comptes Google */}
          {!hasPassword && (
            <div className="bg-orange-50 dark:bg-stone-900 border border-orange-200 dark:border-stone-700 rounded-xl px-4 py-3">
              <p className="text-xs text-orange-700 dark:text-orange-400">
                <Mail className="w-4 h-4 inline mr-1" />
                Votre compte Google n&apos;a pas encore de mot de passe.
                Vous pouvez en créer un pour vous connecter également par email.
              </p>
            </div>
          )}
          <div>
            <label className={labelClass}>Nouveau mot de passe</label>
            <input type="password" value={pwd.nouveau} onChange={e => setPwd({...pwd, nouveau: e.target.value})}
              required className={inputClass} placeholder="Minimum 8 caractères" />
            <PasswordStrength password={pwd.nouveau} />
          </div>
          <div>
            <label className={labelClass}>Confirmer le nouveau mot de passe</label>
            <input type="password" value={pwd.confirmer} onChange={e => setPwd({...pwd, confirmer: e.target.value})}
              required className={inputClass} placeholder="Répétez le mot de passe" />
            {pwd.confirmer && pwd.nouveau !== pwd.confirmer && <p className="text-xs text-red-500 dark:text-red-400 mt-1">Les mots de passe ne correspondent pas</p>}
            {pwd.confirmer && pwd.nouveau === pwd.confirmer  && <p className="text-xs text-green-700 dark:text-green-400 mt-1"><Check className="w-4 h-4 inline mr-1" />Les mots de passe correspondent</p>}
          </div>

          {/* Confirmation : mot de passe actuel OU OTP */}
          {hasPassword ? (
            <div className="border-t border-stone-200 dark:border-stone-800 pt-5 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 dark:text-amber-400"><Lock className="w-4 h-4 inline mr-1" />Entrez votre mot de passe actuel pour confirmer les modifications</p>
              </div>
              <div>
                <label className={labelClass}>Mot de passe actuel *</label>
                <input type="password" value={pwd.actuel} onChange={e => setPwd({...pwd, actuel: e.target.value})}
                  required className={inputClass} placeholder="••••••••" />
              </div>
            </div>
          ) : (
            <ConfirmOtpBlock
              otpValue={pwdOtp}
              onOtpChange={setPwdOtp}
              onSendCode={() => sendProfileOtp(() => setPwdOtpSent(true), setPwdOtpSending)}
              sending={pwdOtpSending}
              codeSent={pwdOtpSent}
              inputClass={inputClass}
              labelClass={labelClass}
              otpClass={otpClass}
            />
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={goBack} className={btnCancel}>Annuler</button>
            <button
              type="submit"
              disabled={
                saving ||
                (hasPassword ? !pwd.actuel : (!pwdOtpSent || pwdOtp.length < 6))
              }
              className={btnSubmit}
            >
              {saving ? 'Modification...' : hasPassword ? 'Modifier' : 'Créer le mot de passe'}
            </button>
          </div>
        </form>
      )}

      {/* ── Email ── */}
      {section === 'email' && (
        <>
          <div className="flex items-center mb-6 md:mb-8">
            {(['form', 'codeAncien', 'codeNouveau'] as EmailEtape[]).map((e, i) => {
              const stepIndex = ['form', 'codeAncien', 'codeNouveau'].indexOf(emailForm.etape)
              const isActive = i === stepIndex; const isDone = i < stepIndex
              const labels   = ['Demande', 'Vérif.', 'Confirmer']
              return (
                <div key={e} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${isDone ? 'bg-green-700 dark:bg-green-600 text-white' : isActive ? 'bg-orange-700 dark:bg-orange-600 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500'}`}>
                      {isDone ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-[10px] tracking-wide leading-none text-center ${isActive ? 'text-orange-700 dark:text-orange-500 font-medium' : 'text-stone-400 dark:text-stone-500'}`}>{labels[i]}</span>
                  </div>
                  {i < 2 && <div className={`h-px flex-1 mx-1 mb-4 ${isDone ? 'bg-green-400 dark:bg-green-600' : 'bg-stone-200 dark:bg-stone-700'}`} />}
                </div>
              )
            })}
          </div>

          {emailForm.etape === 'form' && (
            <form onSubmit={handleRequestEmailChange} className="space-y-5">
              <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 text-xs text-stone-500 dark:text-stone-400">
                Email actuel : <span className="font-semibold text-stone-800 dark:text-stone-100 break-all">{session?.user?.email}</span>
              </div>
              <div>
                <label className={labelClass}>Nouvel email</label>
                <div className="relative">
                  <input type="email" value={emailForm.nouvelEmail}
                    onChange={e => setEmailForm(f => ({ ...f, nouvelEmail: e.target.value }))} required
                    className={`w-full border-b focus:outline-none outline-none py-3 text-sm text-stone-800 dark:text-stone-100 bg-transparent transition-colors pr-8 ${emailInputBorder}`}
                    placeholder="nouveau@email.com" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    {emailChecking && <svg className="animate-spin w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                    {!emailChecking && emailStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                    {!emailChecking && (emailStatus === 'taken' || emailStatus === 'same') && <X className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
                {emailStatus === 'available' && <p className="text-xs text-green-700 dark:text-green-400 mt-1"><Check className="w-4 h-4 inline mr-1" />Email disponible</p>}
                {emailStatus === 'same'      && <p className="text-xs text-red-500 dark:text-red-400 mt-1"><X className="w-4 h-4 inline mr-1" />Identique à votre email actuel</p>}
                {emailStatus === 'taken'     && <p className="text-xs text-red-500 dark:text-red-400 mt-1"><X className="w-4 h-4 inline mr-1" />Email déjà utilisé</p>}
              </div>

              {/* Mot de passe uniquement pour les comptes qui en ont un */}
              {hasPassword && (
                <ConfirmPasswordBlock
                  value={emailForm.motDePasse}
                  onChange={v => setEmailForm(f => ({ ...f, motDePasse: v }))}
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              )}

              {!hasPassword && (
                <div className="bg-orange-50 dark:bg-stone-900 border border-orange-200 dark:border-stone-700 rounded-xl px-4 py-3">
                  <p className="text-xs text-orange-700 dark:text-orange-400">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Un code sera envoyé à votre email actuel et au nouvel email pour confirmer le changement.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={goBack} className={btnCancel}>Annuler</button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    emailStatus !== 'available' ||
                    (hasPassword ? !emailForm.motDePasse : false)
                  }
                  className={btnSubmit}
                >
                  {saving ? 'Envoi...' : 'Envoyer le code'}
                </button>
              </div>
            </form>
          )}

          {emailForm.etape === 'codeAncien' && (
            <form onSubmit={handleVerifyOldEmail} className="space-y-5">
              <div className="bg-orange-50 dark:bg-stone-900 border border-orange-200 dark:border-stone-700 rounded-xl p-4 text-xs text-orange-700 dark:text-orange-400 leading-relaxed">
                Code envoyé à <strong className="break-all">{session?.user?.email}</strong>. Confirmez votre identité.
              </div>
              <div>
                <label className={labelClass}>Code reçu (email actuel)</label>
                <input type="text" inputMode="numeric" maxLength={6} value={emailForm.codeAncien}
                  onChange={e => setEmailForm({...emailForm, codeAncien: e.target.value.replace(/\D/g, '')})}
                  required className={otpClass} placeholder="000000" autoFocus />
              </div>
              <button type="submit" disabled={saving || emailForm.codeAncien.length < 6} className={`w-full ${btnSubmit}`}>
                {saving ? 'Vérification...' : 'Valider'}
              </button>
              <button type="button" onClick={() => { setEmailForm({...emailForm, etape: 'form', codeAncien: ''}); clearMessages() }}
                className="w-full text-stone-400 dark:text-stone-500 hover:text-orange-700 dark:hover:text-orange-500 text-xs uppercase tracking-[0.2em] transition-colors py-2">
                ← Retour
              </button>
            </form>
          )}

          {emailForm.etape === 'codeNouveau' && (
            <form onSubmit={handleConfirmEmailChange} className="space-y-5">
              <div className="bg-orange-50 dark:bg-stone-900 border border-orange-200 dark:border-stone-700 rounded-xl p-4 text-xs text-orange-700 dark:text-orange-400 leading-relaxed">
                Code envoyé à <strong className="break-all">{emailForm.nouvelEmail}</strong>. Entrez-le pour finaliser.
              </div>
              <div>
                <label className={labelClass}>Code reçu (nouvel email)</label>
                <input type="text" inputMode="numeric" maxLength={6} value={emailForm.codeNouveau}
                  onChange={e => setEmailForm({...emailForm, codeNouveau: e.target.value.replace(/\D/g, '')})}
                  required className={otpClass} placeholder="000000" autoFocus />
              </div>
              <button type="submit" disabled={saving || emailForm.codeNouveau.length < 6} className={`w-full ${btnSubmit}`}>
                {saving ? 'Confirmation...' : 'Confirmer le changement'}
              </button>
              <button type="button" onClick={() => { setEmailForm({...emailForm, etape: 'codeAncien', codeNouveau: ''}); clearMessages() }}
                className="w-full text-stone-400 dark:text-stone-500 hover:text-orange-700 dark:hover:text-orange-500 text-xs uppercase tracking-[0.2em] transition-colors py-2">
                ← Retour
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
