// lib/flowmerce-validation.ts — validation des réponses du formulaire de retour.
//
// Aucune règle de validation n'est codée en dur ici : toutes les règles
// proviennent de la définition du formulaire renvoyée par Flowmerce
// (field.validation + field.required + field.options…).
// Ce module est compatible client (aucun import serveur).

import type { ReturnField, ReturnFieldValidation, ReturnOption, ReturnAnswer } from '@/lib/flowmerce-types'

/** Valeur d'une réponse. */
type AnswerValue = unknown

/** Normalise une option du JSON (string ou { value, label }) en { value, label }. */
export function normalizeOption(option: ReturnOption): { value: string; label: string } {
  if (typeof option === 'string') return { value: option, label: option }
  return { value: option.value, label: option.label }
}

/** Extrait l'extension (sans le point) d'une URL ou d'un nom de fichier. */
function extensionOf(value: string): string {
  try {
    const path = new URL(value).pathname
    const ext  = path.slice(path.lastIndexOf('.'))
    return ext.startsWith('.') ? ext.slice(1).toLowerCase() : ''
  } catch {
    const lastDot = value.lastIndexOf('.')
    return lastDot >= 0 ? value.slice(lastDot + 1).toLowerCase() : ''
  }
}

function isPresent(value: AnswerValue): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** Vérifie un fichier sélectionné (avant upload) contre les règles du champ. */
export function validateFileSelection(field: ReturnField, file: File): string | null {
  const rules = field.validation

  if (rules?.maxFileSize != null && file.size > rules.maxFileSize) {
    return `Fichier trop volumineux (max ${formatBytes(rules.maxFileSize)})`
  }

  if (rules?.allowedExtensions?.length) {
    const ext      = extensionOf(file.name)
    const allowed  = rules.allowedExtensions.map(e => e.toLowerCase().replace(/^\./, ''))
    if (ext && !allowed.includes(ext)) {
      return `Extension non autorisée (${allowed.map(a => `.${a}`).join(', ')})`
    }
  }

  return null
}

/** Applique les règles du JSON sur une valeur (post-upload : la valeur est une URL). */
export function validateField(field: ReturnField, value: AnswerValue): string | null {
  const rules: ReturnFieldValidation = field.validation ?? {}
  const required = rules.required ?? field.required ?? false
  // Case à cocher simple (booléenne, sans options) : "requis" veut dire cochée.
  // `false` est une valeur présente mais insuffisante pour un consentement.
  if (field.type === 'checkbox' && (field.options?.length ?? 0) === 0) {
    return required && value !== true ? 'Ce champ est requis' : null
  }


  if (!isPresent(value)) {
    return required ? 'Ce champ est requis' : null
  }

  const values: AnswerValue[] = Array.isArray(value) ? value : [value]

  if (Array.isArray(value)) {
    if (rules.minItems != null && value.length < rules.minItems) {
      return `Sélectionnez au moins ${rules.minItems} élément${rules.minItems > 1 ? 's' : ''}`
    }
    if (rules.maxItems != null && value.length > rules.maxItems) {
      return `Sélectionnez au plus ${rules.maxItems} éléments`
    }
  }

  for (const v of values) {
    if (typeof v === 'string') {
      const text = v.trim()

      if (rules.minLength != null && text.length < rules.minLength) {
        return `Minimum ${rules.minLength} caractères`
      }
      if (rules.maxLength != null && text.length > rules.maxLength) {
        return `Maximum ${rules.maxLength} caractères`
      }
      if (rules.regex) {
        try {
          if (!new RegExp(rules.regex).test(text)) {
            return 'Format invalide'
          }
        } catch {
          // Regex invalide dans le JSON Flowmerce — on laisse passer côté client,
          // Flowmerce reste la source de vérité.
        }
      }
    }

    if (typeof v === 'number') {
      if (rules.min != null && v < rules.min) return `Valeur minimale : ${rules.min}`
      if (rules.max != null && v > rules.max) return `Valeur maximale : ${rules.max}`
    }

    if (typeof v === 'string' && rules.allowedExtensions?.length && isFileUrl(v)) {
      const ext     = extensionOf(v)
      const allowed = rules.allowedExtensions.map(e => e.toLowerCase().replace(/^\./, ''))
      if (ext && !allowed.includes(ext)) {
        return `Extension non autorisée (${allowed.map(a => `.${a}`).join(', ')})`
      }
    }
  }

  return null
}

/** Vrai si la valeur ressemble à une URL (fichier déjà uploadé). */
function isFileUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:') || value.startsWith('data:')
}

/** Valide l'ensemble des réponses d'un formulaire. Retourne { fieldId: message }. */
export function validateForm(formFields: ReturnField[], answers: ReturnAnswer): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const field of formFields) {
    const error = validateField(field, answers[field.id])
    if (error) errors[field.id] = error
  }

  return errors
}

/** Formate un nombre d'octets en lisible. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} Mo`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${bytes} o`
}

/** Construit la chaîne `accept` d'un input file à partir des règles du champ. */
export function acceptFor(field: ReturnField): string | undefined {
  const exts = field.validation?.allowedExtensions
  if (exts?.length) return exts.join(',')

  switch (field.type) {
    case 'image':
    case 'barcode':
    case 'qr':
      return 'image/*'
    case 'video':
      return 'video/*'
    default:
      return undefined
  }
}
