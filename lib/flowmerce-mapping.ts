// lib/flowmerce-mapping.ts — CabaStore
//
// Traduit les valeurs internes de Caba Store (libellés français libres, saisis
// ou générés par la boutique) vers les valeurs exactes attendues par les
// champs `select` en `merchant_fields` du formulaire de retour Flowmerce
// (ex. payment_method → PAYMENT_METHODS côté Flowmerce).
//
// Contexte : ces champs sont `source: 'merchant'`, donc jamais affichés ni
// exigés du client — mais dès qu'une valeur est transmise, Flowmerce la
// valide strictement contre son enum et rejette toute valeur inconnue
// ("Valeur invalide pour le champ <id>"). Caba Store, lui, stocke ces
// informations en texte libre (Order.modePaiement, etc.) : sans traduction,
// toute soumission échoue dès que le libellé local diffère de l'enum.
//
// Règle appliquée : normaliser si un mapping existe, sinon OMETTRE le champ
// plutôt que d'envoyer une valeur invalide — ces champs n'étant jamais
// requis, les omettre est toujours sûr (Flowmerce retombe sur son repli
// neutre côté ML/affichage).

/** Normalise une chaîne pour une comparaison insensible à la casse/accents. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// ── Mode de paiement ────────────────────────────────────────────────────────
// Valeurs cibles exactes attendues par Flowmerce (lib/constants.ts → PAYMENT_METHODS) :
//   'Cash on Delivery' | 'Card' | 'CCP' | 'Bank Transfer'
const PAYMENT_METHOD_RULES: { test: (n: string) => boolean; value: string }[] = [
  { test: n => n.includes('livraison') || n.includes('cod') || n.includes('especes') || n.includes('cash'), value: 'Cash on Delivery' },
  { test: n => n.includes('carte') || n.includes('cib') || n.includes('edahabia') || n.includes('card'), value: 'Card' },
  { test: n => n.includes('ccp') || n.includes('versement'), value: 'CCP' },
  { test: n => n.includes('virement') || n.includes('bank') || n.includes('transfer'), value: 'Bank Transfer' },
]

export function mapPaymentMethod(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  const n = normalize(raw)
  const rule = PAYMENT_METHOD_RULES.find(r => r.test(n))
  return rule?.value
}

// ── Registre extensible ─────────────────────────────────────────────────────
// Si Flowmerce ajoute d'autres champs `select` à valeurs fermées dans
// `merchant_fields`, ajouter leur mapper ici plutôt que d'éparpiller la
// logique de traduction dans les composants.
const MERCHANT_FIELD_MAPPERS: Record<string, (raw: string | null | undefined) => string | undefined> = {
  payment_method: mapPaymentMethod,
}

/**
 * Traduit un ensemble de réponses "merchant" (valeurs internes Caba Store)
 * vers les valeurs attendues par Flowmerce, en omettant tout champ pour
 * lequel aucune correspondance fiable n'a été trouvée — plutôt que de risquer
 * une valeur invalide qui ferait échouer toute la soumission.
 */
export function mapMerchantAnswers<T extends Record<string, unknown>>(answers: T): T {
  const result: Record<string, unknown> = { ...answers }
  for (const [fieldId, mapper] of Object.entries(MERCHANT_FIELD_MAPPERS)) {
    if (!(fieldId in result)) continue
    const raw = result[fieldId]
    const mapped = typeof raw === 'string' ? mapper(raw) : undefined
    if (mapped) {
      result[fieldId] = mapped
    } else {
      delete result[fieldId]
    }
  }
  return result as T
}
