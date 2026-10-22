/**
 * Accord du mot « produit » après un nombre, en arabe :
 * de 2 à 10 → منتجات, sinon (0, 1, 11 et plus) → منتج.
 */
export const produits = (n: number): string => (n >= 2 && n <= 10 ? 'منتجات' : 'منتج')

/** « produit(s) lié(s) » : l'adjectif s'accorde avec le nom. */
export const produitsLies = (n: number): string => (n >= 2 && n <= 10 ? 'منتجات مرتبطة' : 'منتج مرتبط')
