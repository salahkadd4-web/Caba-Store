// lib/flowmerce.ts — utilitaires partages serveur pour l'integration Flowmerce.

import 'server-only'

export type FlowmerceReason = 'DEFECTIVE' | 'WRONG_ITEM' | 'DESCRIPTION' | 'CHANGE_MIND'

// Raisons FR (UI) -> enum Flowmerce
export const REASON_MAP: Record<string, FlowmerceReason> = {
  'Produit défectueux':          'DEFECTIVE',
  'Produit endommagé livraison': 'DEFECTIVE',
  'Panne après utilisation':     'DEFECTIVE',
  'Produit contrefait':          'DESCRIPTION',
  'Mauvaise taille':             'WRONG_ITEM',
  'Ne correspond pas':           'WRONG_ITEM',
  'Erreur de commande vendeur':  'WRONG_ITEM',
  'Pièces manquantes':           'WRONG_ITEM',
  "Changement d'avis":           'CHANGE_MIND',
  'Allergie/Réaction':           'CHANGE_MIND',
}

export function mapReason(reasonFr: string): FlowmerceReason {
  return REASON_MAP[reasonFr] ?? 'CHANGE_MIND'
}
