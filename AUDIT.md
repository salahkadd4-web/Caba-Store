# AUDIT TECHNIQUE COMPLET — CABA-STORE

**Verdict global : produit fonctionnel à 70 %, mais NON prêt pour la production à l'échelle.** Vulnérabilités critiques, dette technique élevée, UX correcte mais standardisée, performances DB médiocres. À ce stade, **lancer en production = risque légal, financier et réputationnel.**

---

## 1. SCORES GLOBAUX

| Domaine | Score | Commentaire |
|---|---|---|
| **Architecture** | **5.5 / 10** | App Router bien découpé en (client)/(admin)/(vendeur), mais Prisma client custom-path, mélange de styles (auth.ts vs auth.config), pas de couche service/repository — tout dans les routes. |
| **Code Quality** | **4.5 / 10** | `any` partout, duplication massive (8+ blocs identiques de tri vendeur priorité), pas de validation Zod, pas de tests, fonctions de 700 lignes, comments en français mélangés au code. |
| **Performance** | **4 / 10** | `images: { unoptimized: true }` (catastrophique), `<img>` partout au lieu de `<Image>`, N+1 queries sur dashboards admin/vendeurs, tri en JS post-DB, pas d'index DB explicites, pas de cache. |
| **Security** | **3 / 10** | **IDOR critique sur /api/panier/[itemId]**, secrets DEV hardcodés dans le bundle client, comparaison OTP non timing-safe sur certains chemins, pas de CSP, JWT sans rotation, rate-limit en mémoire (cassé en serverless multi-instance). |
| **SEO** | **3 / 10** | Metadata par défaut globale, pas de OpenGraph, pas de sitemap, pas de robots.txt explicite, pas de structured data (Product), pas de metadata dynamique sur produits/catégories, langue OK. |
| **UX/UI** | **6 / 10** | Design noir/blanc cohérent, dark mode, mobile-first correct, mais homepage froide, manque de preuves sociales (reviews, ratings, badges), CTA monochrome, pas de promo bar, checkout en page unique = bien. |
| **Conversion e-commerce** | **4 / 10** | Pas de reviews/notes, pas de wishlist partageable, pas de promo code, pas de relance panier abandonné, paiement uniquement COD, pas de tracking livraison réel, frais de livraison codés en dur côté client. |

**Note moyenne : 4.3 / 10. Niveau MVP avancé, pas startup prête à scaler.**

---

## 2. PROBLÈMES CRITIQUES (à corriger AVANT toute mise en prod)

### CRIT-1 — IDOR sur `/api/panier/[itemId]` (PATCH et DELETE)
**Fichier :** [app/api/panier/[itemId]/route.ts](app/api/panier/%5BitemId%5D/route.ts)
**Description :** Aucune vérification d'ownership. Un user connecté peut modifier/supprimer n'importe quel `CartItem` d'un autre user en devinant l'ID.
**Impact business :** un attaquant scripte une boucle qui vide les paniers de la base = sabotage. Risque RGPD.
**Risque technique :** Critique. CWE-639 (Insecure Direct Object Reference).
**Solution :**
```ts
const item = await prisma.cartItem.findUnique({
  where: { id: itemId },
  include: { cart: { select: { userId: true } } },
})
if (!item || item.cart.userId !== token.id) {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 404 })
}
```

### CRIT-2 — Comptes DEV hardcodés et envoyés au navigateur
**Fichier :** [app/(client)/connexion/page.tsx:11-19](app/%28client%29/connexion/page.tsx#L11-L19)
**Description :** `cabastoredz31@gmail.com` / `Salah@2000` (admin) sont dans le bundle JS public. `IS_DEV = process.env.NODE_ENV !== 'production'` est calculé au build : en dev local, le bundle qui sera potentiellement déployé contient ces credentials. De plus le `GOOGLE_WEB_CLIENT_ID` est en dur — c'est public, OK, mais ce n'est pas une bonne pratique.
**Impact business :** prise de contrôle totale du back-office si une seule build dev fuit ou si la même paire est utilisée en prod.
**Solution :** retirer entièrement le bloc DEV_ACCOUNTS, ou le gérer via une route serveur protégée par un cookie dev-only. Au minimum : changer ces mots de passe **immédiatement** car le repo est sur GitHub public.

### CRIT-3 — Race condition + survente stock (orders)
**Fichier :** [app/api/commandes/route.ts:65-150](app/api/commandes/route.ts#L65-L150)
**Description :** Check stock → create order → décrément stock se fait **hors transaction**. Deux requêtes concurrentes peuvent passer le check stock et créer 2 commandes pour 1 article restant. Le décrément `decrement` ne vérifie pas que le stock reste ≥ 0.
**Impact business :** survente de stock (le pire scénario e-commerce — annuler une commande payée détruit la confiance).
**Solution :**
```ts
await prisma.$transaction(async (tx) => {
  for (const item of panier.items) {
    const updated = await tx.variantOption.updateMany({
      where: { id: item.variantOptionId, stock: { gte: item.quantite } },
      data: { stock: { decrement: item.quantite } },
    })
    if (updated.count === 0) throw new Error(`Stock insuffisant: ${item.product.nom}`)
  }
  await tx.order.create({ /* ... */ })
  await tx.cartItem.deleteMany({ where: { cartId: panier.id } })
})
```

### CRIT-4 — `fraisLivraison` envoyé par le client et accepté tel quel
**Fichier :** [app/api/commandes/route.ts:102](app/api/commandes/route.ts#L102) ↔ [app/(client)/commandes/nouveau/page.tsx:156](app/%28client%29/commandes/nouveau/page.tsx#L156)
**Description :** `const frais = typeof fraisLivraison === 'number' ? fraisLivraison : 700`. Le client envoie ce qu'il veut — un attaquant peut envoyer `fraisLivraison: -50000`, total négatif.
**Impact business :** fraude directe, vol.
**Solution :** valider côté serveur via la `methodeExpedition` reçue : `const FRAIS = { 'Livraison standard': 700, 'Livraison express': 1200, 'Retrait en point relais': 400 }`.

### CRIT-5 — Rate-limit en mémoire (Map JS) ne fonctionne PAS en serverless
**Fichier :** [lib/security.ts:12](lib/security.ts#L12)
**Description :** Vercel = lambdas. Chaque instance a sa propre Map. Le rate-limit est en pratique multiplié par N instances et reset à chaque cold start.
**Impact business :** brute-force possible sur les routes auth/OTP/reset-password. Aucune protection réelle.
**Solution :** Upstash Redis + `@upstash/ratelimit`, ou Vercel KV. Coût ~0 pour vos volumes.

### CRIT-6 — Secret cron via simple Bearer dans header
**Fichier :** [app/api/cron/check-abonnements/route.ts:6-9](app/api/cron/check-abonnements/route.ts#L6-L9)
**Description :** OK pour Vercel Cron, mais `CRON_SECRET` n'est pas dans `.env.example`. Si l'env n'est pas définie en prod, `Bearer undefined` matche `Bearer undefined` — anyone peut déclencher la cron.
**Solution :** `if (!process.env.CRON_SECRET || authHeader !== ...)` + ajouter au `.env.example`.

### CRIT-7 — Champ DB `adresse` ignoré, encodage `|||` dans `wilaya`
**Fichier :** [app/api/profil/route.ts:9-20](app/api/profil/route.ts#L9-L20) + [prisma/schema.prisma:25](prisma/schema.prisma#L25)
**Description :** Le schéma a une colonne `adresse String?` mais le code l'ignore et stocke `wilaya|||adresse` dans la colonne `wilaya`. Aberration de modélisation. Impossible de filtrer/chercher par wilaya, casse les indices, etc.
**Solution :** migration Prisma : utiliser les deux colonnes, écrire un script de backfill pour split les valeurs existantes.

### CRIT-8 — `unoptimized: true` sur Image + `<img>` partout
**Fichier :** [next.config.ts:5](next.config.ts#L5) + toutes les pages
**Description :** Désactive l'optimisation d'images Next. Sur une boutique = LCP catastrophique sur mobile. Combiné avec `<img>` brut, aucun lazy loading, aucun WebP automatique, aucune taille responsive.
**Impact business :** Core Web Vitals médiocres → SEO Google pénalisé → moins de trafic organique → moins de ventes.
**Solution :** Activer `images: { remotePatterns: [{ hostname: 'res.cloudinary.com' }] }`, utiliser `<Image>` partout avec `sizes` et `priority` sur le hero.

---

## 3. PROBLÈMES HAUTE PRIORITÉ

### HIGH-1 — Aucune validation Zod / schema-driven sur les bodies API
Partout : `const { nom, prix, stock, ... } = await req.json()`. Aucun guarantee de types. `parseFloat(undefined) = NaN` → DB peut stocker NaN sur Float si pas attrapé.
**Solution :** `zod` + helper `parseBody(req, schema)`.

### HIGH-2 — Duplication massive du tri "priorité affichage"
Le pattern `[...x].sort((a, b) => (a.vendeur?.prioriteAffichage ?? 0) - ...)` est répété ≥6 fois ([app/page.tsx](app/page.tsx#L172), [(client)/produits/page.tsx](app/%28client%29/produits/page.tsx#L40), `[id]/page.tsx`, etc). Tri applicatif d'un dataset DB = anti-pattern, fragile (pagination cassée).
**Solution :** ajouter `prioriteAffichage` sur Product (dénormalisé) et trier en SQL. Ou utiliser `orderBy: [{ vendeur: { prioriteAffichage: 'asc' } }, { createdAt: 'desc' }]`.

### HIGH-3 — N+1 sur dashboard vendeurs admin
[app/api/admin/vendeurs/route.ts:40-55](app/api/admin/vendeurs/route.ts#L40-L55) : `Promise.all(vendeurs.map(...))` → 2 queries par vendeur. Avec 500 vendeurs = 1000 queries. Cold start = explosion.
**Solution :** une seule query `groupBy` sur `OrderItem`.

### HIGH-4 — Aucune indexation explicite sur les colonnes critiques
Le `schema.prisma` n'a aucun `@@index`. `Order.userId`, `Product.vendeurId`, `Product.actif`, `Product.categoryId`, `CartItem.cartId`, `Favorite.userId` sont tous queriés sans index secondaire (Prisma crée des indexes sur FK postgres en automatique, OK pour FK, mais pas sur `actif`, `statut`, `createdAt`).
**Solution :**
```prisma
@@index([actif, categoryId])
@@index([vendeurId, actif])
@@index([statut, createdAt])
```

### HIGH-5 — `setImmediate` dans une route Vercel = silent fail
[app/api/admin/commandes/[id]/route.ts:99](app/api/admin/commandes/%5Bid%5D/route.ts#L99) : `setImmediate(async () => ...)` après le retour de la réponse. Sur Vercel, le runtime kill le lambda après response → le code asynchrone ne s'exécute jamais ou s'interrompt.
**Solution :** utiliser `waitUntil` (`@vercel/functions`) ou une vraie file (QStash, Inngest).

### HIGH-6 — Pas de Content-Security-Policy
[lib/security.ts:104-110](lib/security.ts#L104-L110) : ajoute X-Frame-Options, etc., mais **n'est appelée nulle part**. Aucune CSP nulle part. XSS via product description (qui n'est jamais sanitizée) = vol de session.
**Solution :** middleware global qui injecte CSP + appliquer `sanitize` aux champs textuels stockés en DB.

### HIGH-7 — JWT session sans refresh ni invalidation
Auth NextAuth en mode JWT, donc côté serveur on n'invalide pas les sessions. Si un user est banni, supprimé, ou son rôle change, son JWT reste valide jusqu'à expiration.
**Solution :** stocker un `tokenVersion` dans User, l'incrémenter sur ban/role-change, vérifier dans callback `jwt()`.

### HIGH-8 — Aucun checkout : 1 seul mode (COD), pas de paiement réel
[app/(client)/commandes/nouveau/page.tsx:43-75](app/%28client%29/commandes/nouveau/page.tsx#L43-L75) : tous les autres modes sont `disabled: true` (CCP, Dahabia, BaridiMob, virement). En Algérie, COD a un taux de no-show de 20-40 %. Sans paiement en ligne, vous perdez 1/4 de votre CA.
**Solution :** intégrer CIB/Edahabia via SATIM, ou Chargily (passerelle algérienne packagée).

### HIGH-9 — Frais de livraison hardcodés côté client
[app/(client)/commandes/nouveau/page.tsx:77-81](app/%28client%29/commandes/nouveau/page.tsx#L77-L81) : `METHODES_EXPEDITION` en const dans le composant. Pour changer un prix, il faut redéployer. En plus en Algérie les tarifs varient par wilaya (Yalidine = 58 wilayas × 2 tarifs).
**Solution :** table `ShippingRate` en DB avec `wilaya × methode → prix + delai`, calcul côté serveur uniquement.

### HIGH-10 — Pas de reviews / notes produits
Le schema n'a aucun `Review`. Pour une boutique de vêtements, c'est **le** levier de conversion principal (Baymard : +18 % de conversion). Anti-pattern par rapport à tous les standards (ASOS, Zara, Amazon).

---

## 4. PROBLÈMES MOYENS

- **MED-1** Magic bytes upload : check WebP `bytes[8]==0x57` est faux (WebP = `RIFF` à offset 0, `WEBP` à offset 8 — donc le check est OK en pratique mais fragile). Utiliser `file-type` lib.
- **MED-2** `eslint.config.mjs` : pas de `no-explicit-any` ni `strict-boolean-expressions`. Le projet est truffé de `any`.
- **MED-3** Pas de `package.json` test script. Aucun test (unit, integration, e2e). Pour une boutique qui gère de l'argent : inacceptable.
- **MED-4** Tailwind v4 + custom CSS dans `globals.css` non audité : risque de purge incorrect.
- **MED-5** `capacitor.config.ts` mélange web/native ; pas vu de fallback réseau dans les pages.
- **MED-6** Logos PNG (`/logo_noir.png`) non SVG → poids inutile, qualité dégradée.
- **MED-7** Pas de `loading.tsx` ni `error.tsx` par route → mauvaise UX pendant les transitions.
- **MED-8** Pas de Suspense boundaries autour des sections async coûteuses du `app/page.tsx`.
- **MED-9** Aucun `revalidate` / `cache: 'no-store'` explicite → comportement de cache imprévisible Next 16.
- **MED-10** `useEffect(() => fetchPanier(), [])` dans panier : pas de polling, pas d'invalidation si stock change → user voit un prix obsolète.
- **MED-11** `prisma.cart.findUnique → if (!panier) panier = create` dans `panier/route.ts` est une race condition (utiliser `upsert`).
- **MED-12** Aucun lien `Conditions générales`, `Politique retour`, `Mentions légales`, `Confidentialité` dans le footer → **non-conformité légale** en Algérie et hors.
- **MED-13** OTP en email envoyé en HTML sans version texte → marqué spam.
- **MED-14** `console.log` partout en prod (`[flowmerce] boot`, `[flowmerce:webhook] boot`, etc.) → logs Vercel pollués/coût en plan payant.
- **MED-15** `Order.adresse` est un string unique alors qu'on a `wilaya` et `adresse` séparés sur User : pas de cohérence.
- **MED-16** Aucune normalisation devise (DA en dur partout). Si vous voulez internationaliser → refactor massif.
- **MED-17** Le panier utilise `BroadcastChannel` mais pas de fallback (Safari < 15.4 = silent fail).
- **MED-18** Pas de sitemap.xml dynamique (Next a `app/sitemap.ts`).
- **MED-19** Email transporter créé au module-level : connection pool jamais fermé sur serverless.
- **MED-20** Pas de protection contre les emails jetables (10minute-mail, etc.) → faux comptes.

---

## 5. PROBLÈMES UX / UI

### Homepage
- Trop austère, manque de **chaleur produit**. La hero est "Première boutique online en Algérie spécialisée en importation" — texte vendeur, pas client. Remplacer par une image produit dominante + value prop client ("Livraison 48h partout en Algérie · Paiement à la livraison · Retours gratuits").
- Le composant `SuitcaseAnimationBg` (animation de valise) est cute, mais ralentit le LCP. Mesurer.
- Pas de section "best-sellers", "tendances", "nouveautés par catégorie", "marques".
- Pas de testimonials, pas de reviews agrégées, pas de badges trust (paiement sécurisé, livraison, etc.).
- "L'Excellence, Toujours" en grand → vide de sens, n'aide pas la conversion.

### Pages produit
- Pas de **zoom image** ni galerie miniature scrollable lock.
- Pas de breadcrumb schema.org → SEO perdu.
- Pas de "stock restant" affiché (urgence) ni "X personnes regardent ce produit" (social proof).
- Pas de FAQ accordion, pas d'onglet "description / matières / livraison / retour".
- Pas de "guide des tailles" intégré.
- "Produits similaires" : OK mais pas d'algo, juste createdAt — bof.

### Panier
- Très bon visuel, propre. Mais : pas de **save for later**, pas de "code promo", pas d'estimation de frais avant checkout (passer à la page suivante pour voir le prix livraison).
- 700 lignes dans un seul fichier — refactor obligatoire en 4-5 composants.

### Checkout
- Une seule page = bien. Mais : pas de progression visible (step 1/2/3), pas de récap "Adresse → Paiement → Confirmation" clair.
- Modal de confirmation : pas de timer "expire dans X" si nécessaire, pas de moyen d'éditer depuis le modal.

### Connexion
- "Email ou Téléphone" mélangés → confus. Séparer en 2 onglets ou détecter l'input.
- Le bloc DEV affiché en local est OK mais **ne doit pas exister dans le bundle** (cf CRIT-2).

### Mobile
- BottomNav présent, bien.
- Header se cache au scroll : bon pattern.
- Mais aucun système de toast/notification pour confirmer les actions (ajout panier, favori) → l'utilisateur ne sait pas si ça a marché.

### Standards à atteindre
- **Zara** : galerie image plein écran, tri par "Nouveau / Prix / Tendance", filtres latéraux sticky.
- **ASOS** : reviews, "fits true to size", recommandations IA, wishlist partagée.
- **Shopify boutiques pro** : avis Trustpilot intégrés, badges paiement, retour gratuit affiché en haut.
- **Nike** : guide tailles modal, vidéos produit, customisation, comptes connectés Apple/Google sans friction.

---

## 6. FONCTIONNALITÉS MANQUANTES (par ordre de ROI)

| Feature | Impact estimé conversion | Effort |
|---|---|---|
| Reviews/notes produits | +15-20 % | Moyen |
| Paiement en ligne (CIB/Edahabia via Chargily) | +20 % (réduction no-show COD) | Moyen |
| Codes promo / soldes | +10 % | Petit |
| Email panier abandonné | +5-10 % | Moyen |
| Recommandations "vous aimerez aussi" | +5-8 % | Moyen |
| Guide des tailles | +3-5 % | Petit |
| Tracking livraison (Yalidine/ZR Express API) | +Rétention | Moyen |
| Wishlist partageable URL | +Acquisition | Petit |
| Recherche full-text avec autosuggest | +5 % | Moyen |
| Filtres avancés (taille, couleur, prix, marque) | +Conversion | Petit |
| Notifications push (PWA déjà en place) | +Rétention | Petit |
| Programme fidélité (points) | +LTV | Grand |
| Multilang FR/AR | +Reach algérien | Grand |

---

## 7. SÉCURITÉ — RÉCAPITULATIF

| Vulnérabilité | Sévérité |
|---|---|
| IDOR `/api/panier/[itemId]` (PATCH/DELETE) | **Critique** |
| `fraisLivraison` accepté du client | **Critique** |
| Credentials admin hardcodés dans bundle client | **Critique** |
| Race condition stock + survente possible | **Critique** |
| Rate-limit non fonctionnel en serverless | **Haute** |
| Pas de CSP / pas d'appel à `addSecurityHeaders` | **Haute** |
| JWT sans invalidation | **Haute** |
| Pas de validation Zod côté API | **Haute** |
| Description produit / inputs non sanitizés → XSS stocké | **Haute** |
| Logs verbeux (`console.log` boot) leak la longueur de clés | **Moyenne** |
| `CRON_SECRET` non documenté → potentielle string vide | **Moyenne** |
| OTP en email pas envoyé en TLS forcé (port 587 STARTTLS OK mais pas vérifié) | **Moyenne** |
| Pas de protection brute-force globale | **Moyenne** |
| Pas de 2FA admin | **Moyenne** |

---

## 8. ROADMAP D'AMÉLIORATION

### 🔴 Phase 0 — Hotfix avant tout déploiement public (semaine 1)
1. Fix IDOR panier (CRIT-1)
2. Retirer DEV_ACCOUNTS du bundle (CRIT-2) + **rotate immédiatement les mots de passe admin** (le repo est public)
3. Wrap commande dans `$transaction` avec `updateMany + gte` (CRIT-3)
4. Valider `fraisLivraison` serveur via méthode (CRIT-4)
5. Ajouter `CRON_SECRET` à `.env.example` + vérifier la présence (CRIT-6)
6. Désactiver tous les `console.log` en prod

### 🟠 Phase 1 — Sécurité & Performance (2-3 semaines)
1. Migrer rate-limit vers Upstash Redis
2. Ajouter Zod + middleware de validation sur toutes les routes API
3. Activer `next/image` proprement (remotePatterns Cloudinary)
4. Remplacer tous les `<img>` par `<Image>`
5. Ajouter index Prisma + migration
6. Refactor schéma : `User.wilaya` + `User.adresse` séparés
7. Ajouter CSP via middleware
8. Sanitize description produit (DOMPurify ou similar)
9. Ajouter tests sur les routes commande/panier/auth (Vitest + Supertest)
10. Mettre en place Sentry / error tracking

### 🟡 Phase 2 — Conversion (4-6 semaines)
1. Reviews produits (modèle + UI + modération)
2. Intégration Chargily/CIB
3. Codes promo (modèle + UI checkout)
4. Email panier abandonné (cron + transactional email Resend)
5. Frais de livraison dynamiques par wilaya (Yalidine ou table interne)
6. Sitemap + OpenGraph dynamique par produit
7. Metadata SEO dynamique
8. Filtres avancés produits
9. Toast notifications globales
10. Tracking livraison API

### 🟢 Phase 3 — Scale (3+ mois)
1. Migrer panier guest → cookies anonymes (actuellement panier nécessite compte)
2. Recommandations produit (collaborative filtering simple ou via Algolia)
3. Recherche full-text PostgreSQL (`pg_trgm`) ou Meilisearch
4. CDN images custom (Cloudinary déjà OK, mais ajouter transformations à la volée)
5. PWA push notifs (réengagement)
6. A/B testing infra (GrowthBook ou Vercel Edge Config)
7. Multilang FR/AR avec next-intl
8. Programme fidélité

---

## 9. QUICK WINS (< 1 jour chacun, ROI immédiat)

1. **Retirer `images: { unoptimized: true }`** + ajouter `remotePatterns`. Gain LCP énorme.
2. **Refactor le tri priorité** en SQL via `orderBy` composite.
3. **Supprimer les `console.log` boot** dans `submit/route.ts` et `webhook/route.ts`.
4. **Ajouter `loading.tsx` à la racine de `(client)`** : transitions instantanées.
5. **Ajouter Open Graph image** par défaut dans `layout.tsx` + dynamique sur produit.
6. **Toast lib** (sonner) → confirmation visuelle ajout panier.
7. **Ajouter "Stock restant" sur page produit** si stock < 10 → urgence.
8. **Pré-remplir adresse depuis profil** : déjà fait, bien — mais pas wilaya séparée.
9. **Stocker `lastSeenAt` user** → analytics + segmentation.
10. **Ajouter `sitemap.ts` et `robots.ts`** Next-natif.

---

## 10. REFACTORS STRATÉGIQUES

### R1 — Couche service (la priorité absolue)
Toute la logique métier est dans les routes. Extraire :
```
lib/services/
  cart.service.ts       (addItem, updateQte, clear, getCart)
  order.service.ts      (createOrder transactionnelle)
  pricing.service.ts    (calculateTotal, applyTiers, applyPromo)
  inventory.service.ts  (checkStock, decrementStock)
  shipping.service.ts   (getRates, calculate)
```
Permet de tester, de réutiliser entre admin/vendeur/client, et de découpler de Next.

### R2 — Validation centralisée (Zod)
```
lib/schemas/
  order.schema.ts
  product.schema.ts
  cart.schema.ts
```

### R3 — Composants UI réutilisables
ProductCard est dupliqué 4 fois (homepage, products, similaires, search). Extraire en `<ProductCard variant="grid|carousel|compact">`.

### R4 — Renommer en anglais
Mélange français/anglais (`commande` / `order`, `panier` / `cart`, `produit` / `product`). Choisir une langue pour le code (anglais conseillé pour libs et noms de fichiers) et garder le français uniquement dans l'UI/copy.

---

## 11. FONCTIONNALITÉS PREMIUM RECOMMANDÉES

1. **Live shopping** (vendeur diffuse, clients commandent en direct) — gros levier en Algérie via Instagram.
2. **Try-on AR** sur sneakers/vêtements (lib three.js + Mind AR ou Snapchat camera kit).
3. **Chat client → vendeur** intégré (Pusher déjà en place, c'est facile).
4. **Abonnement produit** (cartouches, beauté) → MRR.
5. **Marketplace social** : permettre aux clients de partager leur achat avec photo → galerie publique inspirée Insta.
6. **Personnalisation produit** (broderie, gravure) → AOV plus élevé.
7. **Compte vendeur premium** avec analytics avancés, dégressifs sur abonnement — vous avez déjà la base (`niveau`, `prioriteAffichage`).
8. **App mobile native** : Capacitor déjà en place — finir la version Android, soumettre Play Store.

---

## CONCLUSION

**Caba-Store est un projet ambitieux et bien structuré sur la forme** (marketplace multi-vendeurs, scan livraison ML, abonnements vendeurs, retours via Flowmerce). Le périmètre fonctionnel est impressionnant pour un développeur seul/petite équipe.

**Mais sur le fond, ce n'est pas prêt pour la production.** Les vulnérabilités CRIT-1 à CRIT-4 sont éliminatoires : aucune startup sérieuse ne déploie avec un IDOR sur le panier, une survente stock possible, et des credentials admin dans le bundle public. Ces 4 fixes représentent ~1 jour de travail et sont **non négociables**.

Au-delà : code quality 4.5/10, conversion 4/10 — vous fonctionnez à 40 % du potentiel d'une boutique standardisée. Sur un marché compétitif (mode en Algérie face à Jumia, AliExpress local, Instagram shops), c'est insuffisant pour scaler.

**Verdict :** 2 semaines de hotfix sécurité + 4 semaines de roadmap conversion (Phase 0 + 1 + intégration paiement + reviews) = boutique réellement prête à pousser du trafic payant. **Ne dépensez aucun budget marketing avant ça**, vous brûlerez du cash.
