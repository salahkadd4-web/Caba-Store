// lib/flowmerce-dependencies.ts — dépendances entre champs du formulaire de
// retour (formulaire Flowmerce version 3).
//
// Capacités génériques, pilotées uniquement par le JSON Flowmerce :
//   - `field.depends_on` + `option.parent` : un champ ne propose que les options
//     dont `parent` vaut la réponse de son champ parent ; tant que le parent est
//     vide, le champ attend (désactivé).
//   - `field.emphasized_by` + `option.is_other` : un champ est mis en avant quand
//     l'option choisie dans le champ désigné porte `is_other: true`.
// Aucun identifiant de champ (reason, reason_detail…) n'est codé en dur ici.
// Un champ sans `depends_on` et une option sans `parent` gardent le
// comportement d'avant la version 3.
// Module compatible client (aucun import serveur).

import type { NormalizedOption, ReturnAnswer, ReturnField, ReturnOption } from '@/lib/flowmerce-types'

/** Normalise une option du JSON (string ou objet) en objet, en gardant
 *  `parent` et `is_other` quand ils sont fournis. */
export function normalizeOption(option: ReturnOption): NormalizedOption {
  if (typeof option === 'string') return { value: option, label: option }
  const normalized: NormalizedOption = { value: option.value, label: option.label }
  if (typeof option.parent === 'string') normalized.parent = option.parent
  if (option.is_other === true) normalized.is_other = true
  return normalized
}

/** Valeurs choisies dans un champ, sous forme de chaînes (vide si rien). */
export function selectedValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(selectedValues)
  if (typeof value === 'string') return value === '' ? [] : [value]
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  return []
}

/** Vrai si le champ dépend d'un parent qui n'a pas encore de réponse. */
export function isAwaitingParent(field: ReturnField, answers: ReturnAnswer): boolean {
  return typeof field.depends_on === 'string'
    && field.depends_on !== ''
    && selectedValues(answers[field.depends_on]).length === 0
}

/** Options proposées pour ce champ compte tenu des réponses actuelles.
 *  Sans `depends_on` : toutes les options, comme avant. Avec `depends_on` :
 *  seulement celles dont `parent` correspond à la réponse du champ parent. */
export function availableOptions(field: ReturnField, answers: ReturnAnswer): NormalizedOption[] {
  const all = (field.options ?? []).map(normalizeOption)
  if (!field.depends_on) return all
  const parentValues = selectedValues(answers[field.depends_on])
  if (parentValues.length === 0) return []
  return all.filter(o => o.parent !== undefined && parentValues.includes(o.parent))
}

/** Vrai si la réponse du champ contient une valeur hors des options proposées
 *  (seulement pour les champs dépendants : ailleurs, rien ne change). */
export function hasUnavailableValue(field: ReturnField, answers: ReturnAnswer): boolean {
  if (!field.depends_on) return false
  const allowed = new Set(availableOptions(field, answers).map(o => o.value))
  return selectedValues(answers[field.id]).some(v => !allowed.has(v))
}

/**
 * Vide les réponses des champs dépendants qui ne sont plus valides (le parent a
 * changé), en cascade : si un champ vidé est lui-même parent d'un autre, ce
 * dernier est revu au passage suivant. Le nombre de passages est borné par le
 * nombre de champs, ce qui protège d'un JSON contenant une dépendance cyclique.
 * Renvoie le même objet si rien n'a changé.
 */
export function pruneDependentAnswers(fields: ReturnField[], answers: ReturnAnswer): ReturnAnswer {
  let next = answers

  for (let pass = 0; pass < fields.length; pass++) {
    let changed = false

    for (const field of fields) {
      if (!field.depends_on || !(field.id in next)) continue
      if (!hasUnavailableValue(field, next)) continue

      const value = next[field.id]
      if (Array.isArray(value)) {
        // Choix multiples : on garde les valeurs encore proposées.
        const allowed = new Set(availableOptions(field, next).map(o => o.value))
        next = { ...next, [field.id]: value.filter(v => selectedValues(v).every(s => allowed.has(s))) }
      } else {
        next = { ...next }
        delete next[field.id]
      }
      changed = true
    }

    if (!changed) break
  }

  return next
}

/** Le champ et tous ceux qui en dépendent, directement ou en cascade. */
export function withDependents(fields: ReturnField[], fieldId: string): string[] {
  const ids = [fieldId]
  for (let i = 0; i < ids.length; i++) {
    for (const f of fields) {
      if (f.depends_on === ids[i] && !ids.includes(f.id)) ids.push(f.id)
    }
  }
  return ids
}

/** Vrai si le champ doit être mis en avant : l'option choisie dans le champ
 *  désigné par `emphasized_by` porte `is_other: true`. */
export function isEmphasized(field: ReturnField, fields: ReturnField[], answers: ReturnAnswer): boolean {
  if (!field.emphasized_by) return false
  const source = fields.find(f => f.id === field.emphasized_by)
  if (!source) return false
  const chosen = selectedValues(answers[source.id])
  if (chosen.length === 0) return false
  return availableOptions(source, answers).some(o => o.is_other === true && chosen.includes(o.value))
}
