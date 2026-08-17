// lib/flowmerce-types.ts — types partagés (client + serveur) pour Flowmerce.
//
// Flowmerce est l'unique source de vérité pour les formulaires de retour :
// la définition du formulaire (champs, options, validations) arrive du JSON
// renvoyé par Flowmerce et n'est jamais codée en dur dans Caba Store.

/** Types de champs supportés par le moteur de formulaire dynamique. */
export type ReturnFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'tel'
  | 'date'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'image'
  | 'video'
  | 'file'
  | 'signature'
  | 'barcode'
  | 'qr'
  | 'switch'
  | 'boolean'

/** Règles de validation provenant du JSON Flowmerce (ex. `field.validation`). */
export interface ReturnFieldValidation {
  /** Champ obligatoire. */
  required?: boolean
  /** Valeur numérique minimale (champs number). */
  min?: number
  /** Valeur numérique maximale (champs number). */
  max?: number
  /** Longueur minimale (text, textarea, select multiple). */
  minLength?: number
  /** Longueur maximale (text, textarea, select multiple). */
  maxLength?: number
  /** Expression régulière testée sur la valeur (text, textarea). */
  regex?: string
  /** Extensions acceptées pour les champs image/video/file (ex. ['.jpg', '.png']). */
  allowedExtensions?: string[]
  /** Taille de fichier maximale en octets (image/video/file). */
  maxFileSize?: number
  /** Nombre minimal de sélections (checkbox à options multiples). */
  minItems?: number
  /** Nombre maximal de sélections (checkbox à options multiples). */
  maxItems?: number
}

/** Option d'un champ select / radio / checkbox : string simple ou { value, label }. */
export type ReturnOption = string | { value: string; label: string }

/** Définition d'un champ du formulaire, tel que renvoyé par Flowmerce. */
export interface ReturnField {
  /** Identifiant unique du champ — utilisé comme clé dans `answers`. */
  id: string
  /** Type de rendu du champ (voir ReturnFieldType). */
  type: ReturnFieldType
  /** Libellé affiché au-dessus du champ. */
  label?: string
  /** Placeholder pour les champs texte. */
  placeholder?: string
  /** Texte d'aide affiché sous le champ. */
  helpText?: string
  /** Champ obligatoire (raccourci équivalent à validation.required). */
  required?: boolean
  /** Options pour select / radio / checkbox. */
  options?: ReturnOption[]
  /** Valeur par défaut. */
  defaultValue?: unknown
  /** Règles de validation pilotées par Flowmerce. */
  validation?: ReturnFieldValidation
  /** Autoriser plusieurs fichiers (image/video/file) → tableau d'URLs. */
  multiple?: boolean
  /** Extras libres du JSON Flowmerce, ignorés par le moteur. */
  [key: string]: unknown
}

/** Section du formulaire : groupe de champs (ex. "Motif du retour"). */
export interface ReturnFormSection {
  /** Identifiant unique de la section. */
  id: string
  /** Titre affiché au-dessus des champs de la section. */
  title: string
  /** Description / instruction affichée sous le titre de la section. */
  description?: string
  /** Champs de la section, rendus dynamiquement via `fields.map(...)`. */
  fields: ReturnField[]
}

/** Définition complète du formulaire de retour, renvoyée par Flowmerce. */
export interface ReturnForm {
  /** Version du formulaire — utilisée pour détecter les versions incompatibles. */
  version: number
  /** Titre affiché en haut du formulaire. */
  /** Version de moteur la plus ancienne capable de rendre ce formulaire, renvoyée par Flowmerce. */
  min_compatible_version: number
  title: string
  /** Description / instructions affichées sous le titre. */
  description?: string
  /** Sections du formulaire, chaque section regroupant ses champs. */
  sections: ReturnFormSection[]
  /** Métadonnées libres renvoyées par Flowmerce, ignorées par le moteur. */
  meta?: {
    /** Informations de la boutique / vendeur associé à la clé API. */
    shop?: Record<string, unknown>
    /** Informations de la politique de retour associée. */
    policy?: Record<string, unknown>
  }
}

/**
 * Aplatit les champs de toutes les sections en un tableau plat.
 * Utilisé par le moteur de validation et par les boucles sur l'ensemble
 * des champs (valeurs par défaut), qui opèrent sur des ReturnField.
 */
export function flattenFields(form: Pick<ReturnForm, 'sections'>): ReturnField[] {
  return (form.sections ?? []).flatMap(s => s.fields ?? [])
}

/** Réponses collectées : { [fieldId]: valeur } — envoyées telles quelles à Flowmerce. */
export type ReturnAnswer = Record<string, unknown>

/** Payload envoyé à Flowmerce lors de la soumission.
 *  Aucun identifiant de boutique : la clé API Bearer identifie le Vendor et
 *  sa ReturnPolicy chez Flowmerce. */
export interface ReturnSubmission {
  orderId: string
  productId: string
  answers: ReturnAnswer
}

/** Résultat de soumission renvoyé par Flowmerce. */
export interface ReturnSubmissionResult {
  claimId: string
  status?: string
}

/** Erreur normalisée renvoyée par Flowmerce (HTTP ou réseau). */
export interface FlowmerceApiError {
  status: number
  message: string
  code?: string
}

/** Versions de formulaire supportées par le moteur Caba Store. */
export const ENGINE_VERSION = 1

/** Délai de cache (ms) de la définition du formulaire côté serveur. */
export const RETURN_FORM_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/** Sous-ensemble de réponses déjà connues (commande, client, produit) : ces
 *  champs ne sont pas affichés à l'utilisateur, ils sont injectés directement
 *  dans les réponses envoyées à Flowmerce. */
export type ReturnPrefill = Partial<Record<string, unknown>>
