'use client'

// components/retours/flowmerce/DynamicField.tsx
//
// Rendu dynamique d'un champ du formulaire de retour Flowmerce.
// Le rendu est piloté UNIQUEMENT par la définition JSON (field.type) :
// aucun champ, motif ou règle n'est codé en dur. fields.map(...) + switch.

import { useRef, useState } from 'react'
import { AlertCircle, Check, FileText, Loader2, Trash2, X } from 'lucide-react'
import type { ReturnField } from '@/lib/flowmerce-types'
import { acceptFor, formatBytes, normalizeOption, validateFileSelection } from '@/lib/flowmerce-validation'

export type UploadFn = (field: ReturnField, file: File) => Promise<string>

// ─── Styles partagés (cohérents avec le design Caba Store) ──────────────────
const inputCls = [
  'w-full text-sm border border-stone-200 dark:border-stone-700 rounded-xl',
  'px-3 py-2.5 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100',
  'placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-700 transition',
].join(' ')

const errorCls = 'border-red-400 dark:border-red-600'

interface DynamicFieldProps {
  field: ReturnField
  value: unknown
  error?: string
  onChange: (value: unknown) => void
  onUpload: UploadFn
}

// ═════════════════════════════════════════════════════════════════════════════
//  Composant principal — aiguillage par type de champ
// ═════════════════════════════════════════════════════════════════════════════

export default function DynamicField({ field, value, error, onChange, onUpload }: DynamicFieldProps) {
  const label = field.label ?? field.id

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {label}
          {isRequired(field) && <span className="text-orange-600 dark:text-orange-500 ml-0.5">*</span>}
        </label>
      </div>

      <FieldInput field={field} value={value} error={error} onChange={onChange} onUpload={onUpload} />

      {field.helpText && (
        <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">{field.helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

function isRequired(field: ReturnField): boolean {
  return field.required === true || field.validation?.required === true
}

// ═════════════════════════════════════════════════════════════════════════════
//  Aiguillage par type — le seul endroit qui lit field.type
// ═════════════════════════════════════════════════════════════════════════════

function FieldInput(props: DynamicFieldProps) {
  const { field } = props

  switch (field.type) {
    case 'textarea':      return <TextareaField    {...props} />
    case 'select':        return <SelectField      {...props} />
    case 'radio':         return <RadioField       {...props} />
    case 'checkbox':      return <CheckboxField    {...props} />
    case 'switch':
    case 'boolean':       return <SwitchField      {...props} />
    case 'number':        return <InputField type="number" {...props} />
    case 'email':         return <InputField type="email"  {...props} />
    case 'tel':           return <InputField type="tel"    {...props} />
    case 'date':          return <InputField type="date"   {...props} />
    case 'image':         return <FileField accept="image/*" {...props} />
    case 'video':         return <FileField accept="video/*" {...props} />
    case 'file':          return <FileField accept={acceptFor(field)} {...props} />
    case 'barcode':       return <FileField accept="image/*" capture="environment" {...props} />
    case 'qr':            return <FileField accept="image/*" capture="environment" {...props} />
    case 'signature':     return <SignatureField {...props} />
    case 'text':
    default:              return <InputField type="text" {...props} />
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Champs de saisie (text / email / tel / date / number)
// ═════════════════════════════════════════════════════════════════════════════

function InputField({
  field, type, value, error, onChange,
}: DynamicFieldProps & { type: 'text' | 'email' | 'tel' | 'date' | 'number' }) {
  const rules = field.validation

  const handleChange = (raw: string) => {
    if (type === 'number') {
      onChange(raw === '' ? '' : Number(raw))
    } else {
      onChange(raw)
    }
  }

  return (
    <input
      type={type}
      value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
      placeholder={field.placeholder}
      min={type === 'number' ? rules?.min : undefined}
      max={type === 'number' ? rules?.max : undefined}
      maxLength={rules?.maxLength}
      onChange={e => handleChange(e.target.value)}
      className={`${inputCls} ${error ? errorCls : ''}`}
    />
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Textarea (avec compteur si maxLength fourni par le JSON)
// ═════════════════════════════════════════════════════════════════════════════

function TextareaField({ field, value, error, onChange }: DynamicFieldProps) {
  const maxLength = field.validation?.maxLength
  const text = typeof value === 'string' ? value : ''

  return (
    <div>
      <textarea
        value={text}
        placeholder={field.placeholder}
        rows={4}
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        className={`${inputCls} resize-none ${error ? errorCls : ''}`}
      />
      {maxLength != null && (
        <p className="text-[10px] text-stone-400 mt-1 text-right">{text.length}/{maxLength}</p>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Select
// ═════════════════════════════════════════════════════════════════════════════

function SelectField({ field, value, error, onChange }: DynamicFieldProps) {
  const options = (field.options ?? []).map(normalizeOption)

  return (
    <select
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      className={`${inputCls} ${error ? errorCls : ''}`}
    >
      <option value="" disabled>{field.placeholder ?? 'Sélectionnez…'}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Radio — options fournies par le JSON
// ═════════════════════════════════════════════════════════════════════════════

function RadioField({ field, value, error, onChange }: DynamicFieldProps) {
  const options = (field.options ?? []).map(normalizeOption)

  return (
    <div className={`grid gap-2 ${options.length > 2 ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
      {options.map(opt => {
        const selected = value === opt.value
        return (
          <label
            key={opt.value}
            className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer text-sm transition-all ${
              selected
                ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60'
                : 'border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
            } ${error ? 'border-red-400 dark:border-red-600' : ''}`}
          >
            <input
              type="radio"
              name={field.id}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="accent-orange-700 shrink-0"
            />
            <span className={`flex-1 leading-tight ${selected ? 'font-semibold text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-200'}`}>
              {opt.label}
            </span>
            {selected && <Check className="w-4 h-4 text-orange-700 shrink-0" />}
          </label>
        )
      })}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Checkbox — booléen seul, ou multi-sélection si options fournies
// ═════════════════════════════════════════════════════════════════════════════

function CheckboxField({ field, value, error, onChange }: DynamicFieldProps) {
  const options = (field.options ?? []).map(normalizeOption)

  // Cas 1 : case à cocher simple (réponse booléenne)
  if (options.length === 0) {
    return (
      <label className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer text-sm transition-all ${
        value === true
          ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60'
          : 'border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
      } ${error ? 'border-red-400 dark:border-red-600' : ''}`}>
        <input
          type="checkbox"
          checked={value === true}
          onChange={e => onChange(e.target.checked)}
          className="accent-orange-700 mt-0.5 shrink-0"
        />
        <span className="leading-tight text-stone-700 dark:text-stone-200">{field.helpText ?? field.label}</span>
      </label>
    )
  }

  // Cas 2 : multi-sélection (réponse = tableau de valeurs)
  const selected: string[] = Array.isArray(value) ? value : []

  const toggle = (optValue: string) => {
    onChange(selected.includes(optValue)
      ? selected.filter(v => v !== optValue)
      : [...selected, optValue])
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(opt => {
        const checked = selected.includes(opt.value)
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer text-sm transition-all ${
              checked
                ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60'
                : 'border-stone-100 dark:border-stone-800 hover:border-stone-200 dark:hover:border-stone-700'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(opt.value)}
              className="accent-orange-700 mt-0.5 shrink-0"
            />
            <span className={`leading-tight ${checked ? 'font-semibold text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-200'}`}>
              {opt.label}
            </span>
          </label>
        )
      })}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Switch / Boolean — interrupteur
// ═════════════════════════════════════════════════════════════════════════════

function SwitchField({ field, value, error, onChange }: DynamicFieldProps) {
  const on = value === true

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={field.label ?? field.id}
      onClick={() => onChange(!on)}
      className={`flex items-center gap-3 w-full p-3 rounded-xl border-2 cursor-pointer transition-all ${
        on ? 'border-orange-700 bg-orange-50 dark:bg-orange-950/60' : 'border-stone-100 dark:border-stone-800'
      } ${error ? 'border-red-400 dark:border-red-600' : ''}`}
    >
      <span className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-orange-700' : 'bg-stone-300 dark:bg-stone-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
      <span className={`text-sm font-medium ${on ? 'text-orange-700 dark:text-orange-400' : 'text-stone-700 dark:text-stone-200'}`}>
        {field.helpText ?? (on ? 'Oui' : 'Non')}
      </span>
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Fichiers (image / video / file / barcode / qr)
//  Sélection → upload → URL stockée dans answers. Prêt pour l'upload Flowmerce.
// ═════════════════════════════════════════════════════════════════════════════

function FileField({
  field, value, error, onChange, onUpload, accept, capture,
}: DynamicFieldProps & { accept?: string; capture?: 'environment' }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const multiple = field.multiple === true
  const values: string[] = Array.isArray(value) ? value : (typeof value === 'string' && value ? [value] : [])

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadError(null)

    for (const file of Array.from(files)) {
      const selectionError = validateFileSelection(field, file)
      if (selectionError) {
        setUploadError(selectionError)
        continue
      }

      setUploading(true)
      try {
        const url = await onUpload(field, file)
        if (multiple) {
          onChange([...new Set([...values, url])])
        } else {
          onChange(url)
        }
      } catch {
        setUploadError('Échec de l\'upload, réessayez.')
      } finally {
        setUploading(false)
      }
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (index: number) => {
    const next = values.filter((_, i) => i !== index)
    onChange(multiple ? next : next[0] ?? '')
  }

  return (
    <div>
      <div className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-all ${error ? 'border-red-400 dark:border-red-600' : 'border-stone-200 dark:border-stone-700'}`}>
        {values.length === 0 && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex-1 text-sm text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-500 transition py-2"
          >
            {multiple ? 'Choisir des fichiers…' : 'Choisir un fichier…'}
            {field.validation?.maxFileSize != null && (
              <span className="block text-[10px] mt-0.5">Max {formatBytes(field.validation.maxFileSize)}</span>
            )}
          </button>
        )}
        {uploading && (
          <span className="flex-1 flex items-center justify-center gap-2 text-sm text-stone-500 dark:text-stone-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept ?? acceptFor(field)}
          capture={capture}
          multiple={multiple}
          className="sr-only"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {values.length > 0 && (
        <div className="mt-2 space-y-2">
          {values.map((url, index) => (
            <FilePreview key={url} url={url} onRemove={() => remove(index)} />
          ))}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
        </p>
      )}
    </div>
  )
}

function FilePreview({ url, onRemove }: { url: string; onRemove: () => void }) {
  const isImage = /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(url) || url.startsWith('data:image')
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg shrink-0" />
      )}
      {isVideo && (
        <video src={url} controls className="w-14 h-14 object-cover rounded-lg shrink-0" />
      )}
      {!isImage && !isVideo && (
        <div className="w-14 h-14 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6 text-stone-400" />
        </div>
      )}
      <span className="flex-1 text-xs text-stone-500 dark:text-stone-400 truncate">{url}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-stone-400 hover:text-red-600 transition shrink-0"
        aria-label="Supprimer le fichier"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  Signature — pad canvas, la signature est uploadée puis stockée en URL
// ═════════════════════════════════════════════════════════════════════════════

const SIGNATURE_WIDTH  = 560
const SIGNATURE_HEIGHT = 160

function SignatureField({ field, value, error, onChange, onUpload }: DynamicFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const signed = typeof value === 'string' && value !== ''

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const point = getPoint(e)
    if (!canvas || !ctx || !point) return
    ctx.strokeStyle = '#292524'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const point = getPoint(e)
    if (!ctx || !point) return
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }

  const stopDraw = () => { drawing.current = false }

  const confirm = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (isEmptyCanvas(canvas)) return

    const dataUrl = canvas.toDataURL('image/png')
    setUploading(true)
    setUploadError(null)
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'signature.png', { type: 'image/png' })
      const url  = await onUpload(field, file)
      onChange(url)
    } catch {
      setUploadError('Échec de l\'envoi de la signature, réessayez.')
    } finally {
      setUploading(false)
    }
  }

  const isEmptyCanvas = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return true
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return false
    }
    return true
  }

  return (
    <div>
      {signed ? (
        <div className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={String(value)} alt="Signature" className="h-14 object-contain shrink-0" />
          <span className="flex-1 text-xs text-green-600 dark:text-green-400 font-medium">Signature enregistrée</span>
          <button
            type="button"
            onClick={clear}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-stone-400 hover:text-red-600 transition shrink-0"
            aria-label="Effacer la signature"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className={`rounded-xl border-2 border-dashed overflow-hidden ${error ? 'border-red-400 dark:border-red-600' : 'border-stone-200 dark:border-stone-700'}`}>
          <canvas
            ref={canvasRef}
            width={SIGNATURE_WIDTH}
            height={SIGNATURE_HEIGHT}
            className="w-full bg-white dark:bg-stone-900 touch-none cursor-crosshair"
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={stopDraw}
            onPointerLeave={stopDraw}
          />
          <div className="flex items-center justify-between gap-2 p-2 bg-stone-50 dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
            <button type="button" onClick={clear} className="text-xs text-stone-500 hover:text-red-600 transition px-2 py-1">
              Effacer
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-semibold bg-orange-700 hover:bg-orange-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Valider la signature
            </button>
          </div>
        </div>
      )}
      {uploadError && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {uploadError}
        </p>
      )}
    </div>
  )
}
