/**
 * lib/constants.ts
 * ----------------
 * Constantes applicatives partagées entre le client et le serveur.
 * Source de vérité unique — modifier ici se répercute partout.
 */

// ── Frais d'expédition (DA) ───────────────────────────────────────────────
// Le serveur est la source de vérité : app/api/commandes/route.ts valide
// ces valeurs côté serveur. Le client les affiche uniquement.
export const FRAIS_EXPEDITION: Record<string, number> = {
  'Livraison standard':      700,
  'Livraison express':       1_200,
  'Retrait en point relais': 400,
}

export const METHODE_EXPEDITION_DEFAUT = 'Livraison standard'

// ── Vendeurs ──────────────────────────────────────────────────────────────
// Un vendeur avec prioriteAffichage >= cette valeur est considéré suspendu
// et ses produits ne sont pas affichés.
export const VENDEUR_SUSPENDU_PRIORITE = 99

// ── Application ───────────────────────────────────────────────────────────
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://caba-store.vercel.app'
