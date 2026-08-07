# Caba Store

Marketplace algérienne multi-vendeurs : vente en ligne de produits avec paiement à la livraison, livraison 48h dans les 58 wilayas, retours gratuits sous 14 jours, et abonnements vendeurs. Interface 100 % en français, devise : **DA (dinar algérien)**.

## Fonctionnalités

### Côté client
- **Catalogue** : page d'accueil (meilleures ventes, dernières arrivées, catégories), liste de produits avec filtres par catégorie, fiches produit détaillées avec variantes (couleur) et options (taille).
- **Prix dégressifs** : paliers de prix par quantité (ex. 1 = 1 500 DA, 2+ = 1 400 DA) calculés côté client et côté serveur.
- **Panier** : groupé par vendeur, sélection de variantes en ligne, prix dégressifs appliqués, badge compteur.
- **Commandes** : tunnel multi-vendeurs (une commande par vendeur reliée par `groupeId`), adresse + wilaya, **paiement à la livraison** (COD), 3 méthodes d'expédition par vendeur (standard 700 DA / express 1 200 DA / point relais 400 DA), suivi de statut en 6 états.
- **Retours** : entièrement pilotés par **Flowmerce** (source de vérité unique). Caba Store récupère la définition JSON du formulaire (`GET /api/v1/return-form`, la clé API Bearer identifie le Vendor et sa ReturnPolicy), le génère dynamiquement (17 types de champs, validation, upload de fichiers), et envoie les réponses à Flowmerce (`POST /api/v1/returns`). Webhook HMAC de réconciliation des statuts ; aucune politique de retour ni identifiant de boutique n'est stocké localement.
- **Recherche** : barre de recherche globale + page dédiée.
- **Favoris**, **profil** (58 wilayas, genre, âge, adresse, changement de mot de passe ou OTP email), **inscription et connexion** par email/téléphone + mot de passe ou **Google** (web et natif Android).
- **OTP** : SMS (Twilio, `+213`) et email (Nodemailer), expiration 15 min, rate limité.

### Côté vendeur
- Dashboard avec KPIs (produits, commandes, chiffre d'affaires livré), top produits, facturation (`lib/seller-billing.ts`).
- CRUD produits : variantes, options, prix dégressifs, upload multi-images Cloudinary.
- Catégories soumises à approbation admin, pièces justificatives (Vercel Blob).
- Abonnements payants (3 niveaux) avec priorité d'affichage, factures, historique de paiements, crons d'expiration et de rappel.
- Commission de 1 % sur les ventes livrées ; approbation de ses commandes.

### Côté admin
- KPIs (produits, clients, commandes, CA livré en DA), gestion produits / catégories / clients / vendeurs (approbation, suspension, notes admin), abonnements et paiements, statistiques détaillées (top/flop produits, ventes par catégorie, CA par vendeur, revenus par abonnement, expirations à 30 jours).

## Stack technique

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Prisma 7** + **PostgreSQL** (adapter `pg`)
- **NextAuth v5** (JWT, Credentials + Google OAuth)
- **Capacitor 8** : application Android native (`com.cabastore.app`) + **PWA** installable
- Services : **Twilio Verify** (SMS), **Nodemailer** (emails), **Cloudinary** (images), **Vercel Blob** (documents), **Upstash Redis** (rate limiting), **Pusher** (temps réel), **Flowmerce** (moteur de gestion des retours)

## Architecture

### Rôles et protection
3 rôles : `CLIENT`, `VENDEUR`, `ADMIN`. Protection en 3 couches :
1. **Middleware** (`proxy.ts`) : contrôle des rôles via JWT, session requise pour les zones privées, CSP stricte + headers de sécurité.
2. **Guards serveur** (`lib/security.ts` : `requireAdmin`, `requireVendeur`, `requireAuth`) et layouts de dashboard.
3. **`VendeurGuard`** : écran dédié selon le statut (EN_ATTENTE, SUSPENDU, PIECES_REQUISES, APPROUVE).

### Routes principales
- Public : `/`, `/produits`, `/produits/[id]`, `/categories`, `/recherche`, `/connexion`, `/inscription`, `/recuperer-mot-de-passe`
- Client connecté : `/panier`, `/commandes`, `/commandes/nouveau`, `/retours`, `/favoris`, `/profil`
- Dashboard : `/admin/*`, `/vendeur/*`
- API : `app/api/**` (~45 routes : auth, panier, commandes, retours, produits, vendeur, admin, profil, upload, crons)

### Modèle de données (Prisma)
`User`, `VendeurProfile`, `VendeurDocument`, `Category`, `Product` (avec `prixVariables` JSON pour les prix dégressifs), `ProductVariant`, `VariantOption`, `Abonnement`, `Paiement`, `Cart`/`CartItem`, `Favorite`, `Order`/`OrderItem`, `ReturnRequest`, `ResetToken`, `OtpToken`.

## Démarrage

Prérequis : Node.js 20+, PostgreSQL (ou Neon).

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
# Créez un fichier .env à partir du tableau ci-dessous

# 3. Générer le client Prisma et initialiser la base
npm run db:push

# 4. Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). En développement, le code OTP universel est `000000` et un quick-login par rôle est disponible sur `/connexion`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Serveur de développement (webpack) |
| `npm run build` | Génère le client Prisma puis build de production |
| `npm start` | Serveur de production |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run db:push` | Pousse le schéma Prisma vers la base |
| `npm run db:migrate` | Applique les migrations (`prisma migrate deploy`) |

## Variables d'environnement

| Catégorie | Variables |
|---|---|
| Auth | `AUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Base de données | `DATABASE_URL`, `DIRECT_URL` |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`, `TWILIO_TEST_NUMBER` |
| Email | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` |
| Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Pusher | `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` |
| Flowmerce | `FLOWMERCE_API_URL`, `FLOWMERCE_API_KEY` (identifie la boutique chez Flowmerce), `FLOWMERCE_WEBHOOK_SECRET`, `FLOWMERCE_UPLOAD_URL` (optionnel — future API d'upload Flowmerce ; repli Cloudinary) |
| Crons | `CRON_SECRET` |
| Application | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_URL` |

## Déploiement

### Vercel
- Build : `prisma generate && prisma db push --accept-data-loss && next build` (défini dans `vercel.json`).
- 2 **Vercel Cron** : `check-abonnements` (2h UTC : expiration des abonnements, masquage des produits) et `notif-abonnements` (8h UTC : emails de rappel aux seuils 75/50/25/10 %), protégés par `CRON_SECRET`.
- L'application Android (Capacitor) charge `https://caba-store.vercel.app/app-entry` ; gardez `NEXT_PUBLIC_APP_URL` à jour.

### Application Android
```bash
npm run build
npx cap sync android
npx cap open android   # puis build via Android Studio
```

La WebView charge la version distante, affiche `offline.html` embarqué hors-ligne, et gère le bouton retour et l'OAuth Google natif (`android/`).

## Sécurité

- CSP stricte (nonce, `strict-dynamic`, `frame-ancestors 'none'`) + headers de sécurité globaux (`next.config.ts`).
- Rate limiting distribué Upstash (auth, OTP, password reset, upload, API).
- Sanitisation XSS, validation email / téléphone algérien (05/06/07), exigences de mot de passe fort.
- Webhooks signés HMAC (Flowmerce), ownership checks, guards par rôle.
- Upload de fichiers de retour : validation MIME + magic bytes, taille max 10 Mo, rate limit 20/h. Les règles de fond (extensions, tailles, motifs) restent pilotées par le JSON du formulaire Flowmerce.
