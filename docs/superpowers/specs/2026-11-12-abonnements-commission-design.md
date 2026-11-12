# Nouveau modèle d'abonnement vendeur : forfait ou commission

Date : 2026-11-12 — statut : implémenté (branche `feat/abonnement-commission`)

## Pourquoi

Aujourd'hui un vendeur approuvé reçoit **un an gratuit** (Niveau 3) puis paie un
forfait (5000 / 4000 / 3000 DA, mensuel ou annuel) **plus 1 % des ventes
livrées**. Le gratuit ne rapporte rien et retarde le moment où le vendeur
s'engage. Le nouveau modèle fait payer dès le premier mois, mais en douceur :
une petite commission de 2 % (le vendeur ne paie que s'il vend), puis le vendeur
choisit lui-même la formule qui lui convient.

## Décisions de Salah

### Huit offres, au choix l'une OU l'autre

| Niveau = priorité d'affichage | Forfait (payé d'avance)  | Commission (payée après) |
|-------------------------------|--------------------------|--------------------------|
| Niveau 1 — priorité 1 (haute) | 5000 DA / mois           | 5 % par commande         |
| Niveau 2 — priorité 2         | 4000 DA / mois           | 4 %                      |
| Niveau 3 — priorité 3         | 3000 DA / mois           | 3 %                      |
| Niveau 4 — priorité 4 (basse) | 2000 DA / mois           | 2 %                      |

Le forfait se prend sur **1 mois**, **6 mois (−10 %)** ou **12 mois (−20 %)** :

| Niveau | 1 mois  | 6 mois    | 12 mois   |
|--------|---------|-----------|-----------|
| 1      | 5 000   | 27 000    | 48 000    |
| 2      | 4 000   | 21 600    | 38 400    |
| 3      | 3 000   | 16 200    | 28 800    |
| 4      | 2 000   | 10 800    | 19 200    |

Un vendeur en commission ne paie **aucun** montant fixe ; un vendeur au forfait
ne paie **aucune** commission. Les 1 % actuels disparaissent.

### Démarrage

- Plus d'abonnement gratuit.
- À l'approbation, le vendeur est en **commission Niveau 4 (2 %)** pour son
  premier mois, sans choix possible.
- À partir de la fin du premier mois, il choisit son offre lui-même depuis son
  tableau de bord.

### Paiement et blocage

- **Commission** : les commandes livrées du mois N sont facturées à la fin du
  mois N. Le vendeur a **jusqu'à la fin du mois N+1** pour payer.
- **Forfait** : payé au début de la période.
- Rappels pendant le mois de paiement : **« il te reste xx jours »** à
  **J+7, J+15, J+21, J+25, J+27, J+29**. Pas d'autres rappels : le vendeur ne
  doit pas se sentir harcelé.
- **Fin du mois sans paiement → compte bloqué immédiatement** : ses produits
  disparaissent de la boutique. Il est débloqué dès que l'admin confirme le
  paiement.
- Le paiement reste hors ligne (virement, CCP, espèces), confirmé à la main par
  l'admin, comme aujourd'hui.

## Objectifs

1. Supprimer toute trace du gratuit dans le parcours (approbation, textes, filtres).
2. Les 8 offres, leurs durées et leurs prix existent dans le code à un seul endroit.
3. Chaque mois, sans intervention humaine : facture de commission éditée,
   rappels envoyés, comptes impayés bloqués.
4. Le vendeur voit à tout moment : son offre, la commission qui s'accumule ce
   mois-ci, ce qu'il doit payer, avant quelle date, et combien de jours il lui reste.
5. L'admin voit les factures à encaisser et les confirme en un geste.
6. Priorité d'affichage = niveau (1 à 4), quelle que soit la formule.

## Non-objectifs

- Paiement en ligne (CIB / Edahabia) : non, toujours hors ligne.
- Remboursement ou changement d'offre en cours de forfait.
- Déduire de la commission les retours acceptés après livraison.
- Facturer des frais sur la livraison : la commission porte sur le prix des
  articles uniquement (prix × quantité des OrderItem du vendeur).

## Anti-objectifs (ce qui serait un échec même si « ça marche »)

- Un vendeur bloqué alors qu'il ne pouvait pas encore connaître le montant.
- Un vendeur qui reçoit plus que les 6 rappels prévus pour une même facture.
- Une commande livrée comptée deux fois, ou jamais.
- Toucher à la base de production pendant le développement (voir
  mémoire « vérifier en local » : base réelle, pas d'écriture).

## Comment ça marche

### Le cycle du vendeur

Chaque vendeur a un **cycle mensuel ancré sur sa date d'approbation**
(approuvé le 14 → cycles du 14 au 14). Les rappels J+7…J+29 se comptent depuis
le début du cycle. Pour un mois plus court que 30 jours, un rappel dont le jour
dépasse la fin du cycle n'est pas envoyé, sauf le dernier (J+29), qui part la veille de la fin.

À chaque fin de cycle, un traitement quotidien (cron) :

1. **Vendeur en commission** : crée la facture du cycle écoulé
   (ventes livrées pendant le cycle × taux du niveau). Échéance = fin du cycle
   suivant. Facture à 0 DA → marquée payée d'office, pas de rappel.
2. Applique l'**offre choisie pour le cycle suivant**, s'il y en a une.
3. Toute facture **en attente dont l'échéance est passée** → vendeur bloqué.

### Changer d'offre (mon choix)

Le vendeur peut choisir son offre à tout moment ; elle s'applique **au début du
cycle suivant**. Le premier cycle est toujours en commission 2 %, quoi qu'il
choisisse. Entre deux niveaux de commission, le changement est libre chaque
mois. Un forfait en cours ne peut pas être interrompu.

### Le forfait (décision de Salah)

Le forfait **n'est dû qu'après une commande livrée** : quand le vendeur passe au
forfait, une facture « à venir » est créée pour toute la période (1, 6 ou 12 mois).
Elle devient à régler dès la première commande livrée sur la période ; le vendeur
a alors un mois (rappels J+7…J+29), puis il est bloqué s'il n'a pas payé. Sans
aucune commande livrée sur la période, le forfait n'est pas dû. L'admin peut
aussi encaisser un forfait d'avance. À la fin du forfait, il se renouvelle à
l'identique sauf si le vendeur a choisi une autre offre.

### Blocage et déblocage

- Bloqué = `prioriteAffichage = 99` (mécanisme existant : produits masqués,
  non commandables, cf. `lib/product-visibility.ts`) + statut d'abonnement
  `BLOQUE` (nouveau, à la place de l'ancien `EXPIRE` pour ce cas).
- Débloqué automatiquement quand l'admin confirme la dernière facture en retard :
  la priorité revient au niveau de l'offre.
- Un vendeur bloqué garde l'accès à son tableau de bord pour voir ce qu'il doit.

### Notifications

*(Canal : voir question ouverte 3.)* Dans tous les cas :
- un **bandeau** sur le tableau de bord vendeur (« Il vous reste 4 jours pour
  régler 1 240 DA »), visible pendant tout le mois de paiement ;
- un **e-mail** aux 6 jours prévus (on réutilise `sendNotifAbonnement` de
  `lib/mail.ts`, réécrit pour ce nouveau message).

## Changements de données

- `NiveauAbonnement` : ajouter `NIVEAU_4`. `NIVEAU_0` reste pour l'admin.
- Nouvelle enum `ModeFacturation { COMMISSION, FORFAIT }` et champ `mode` sur
  `Abonnement`.
- `Abonnement.periodicite` : `mensuel | semestriel | annuel` (forfait seulement).
- `Abonnement` : `dateDebut` / `dateFin` = cycle ou forfait en cours ; nouveau
  `offreSuivante` (mode + niveau + durée) choisie par le vendeur.
- `StatutAbonnement` : retirer `GRATUIT`, ajouter `BLOQUE`.
- Nouveau modèle **`Facture`** : vendeur, type (`COMMISSION` / `FORFAIT`),
  période couverte, niveau, taux, ventes brutes, montant, échéance, statut
  (`EN_ATTENTE` / `PAYEE`), rappels déjà envoyés, lien vers le `Paiement` qui
  la solde. Remplace l'astuce actuelle qui stocke la facture en JSON dans
  `Paiement.note` (les anciennes factures restent lisibles en historique).
- `Order.livreeLe` (nouveau) : date de passage à `LIVREE`, posée dans
  `app/api/admin/commandes/[id]/route.ts` et `app/api/vendeur/commandes/[id]/route.ts`.
  La commission d'un cycle = commandes dont `livreeLe` tombe dans le cycle
  (aujourd'hui le calcul utilise `createdAt`, ce qui perd les commandes
  passées en fin de cycle et livrées au cycle suivant). Rattrapage des
  commandes déjà livrées : `livreeLe = updatedAt`.

## Écrans

**Vendeur — `/vendeur/abonnement`** (refonte) :
offre actuelle et priorité ; commission estimée du cycle en cours ; factures à
payer avec compte à rebours ; choix de l'offre (8 offres, et durées pour le
forfait) — verrouillé pendant le premier mois avec une phrase qui l'explique ;
historique des factures (les PDF/impressions existantes via
`SellerInvoiceActions` restent).

**Vendeur — tableau de bord** : les cartes « frais sur ventes / total dû »
deviennent « commission ce mois-ci / à payer avant le … ».

**Admin — `/admin/abonnements`** : liste centrée sur les **factures à
encaisser** (en attente, en retard, vendeurs bloqués), filtre par statut,
bouton « Confirmer le paiement » (méthode, référence, note).

**Admin — fiche vendeur, onglet abonnement** : même information pour un
vendeur, et possibilité pour l'admin de changer son offre.

**Admin — statistiques** : répartition par formule (forfait / commission) et
par niveau ; montants encaissés et en attente.

Tous les textes en FR / AR / EN selon les conventions i18n du projet
(`lib/i18n/{fr,ar,en}/billing.ts`, etc.) ; design selon les règles maison
(Rubik, 12 px minimum, palette par rôle).

## Laissé au développeur

- Découpage exact des routes API et des composants.
- Calcul des dates de cycle (mois calendaires glissants, gestion du 29–31).
- Fusion ou remplacement des deux crons existants (`check-abonnements`,
  `notif-abonnements`) — un seul cron quotidien suffit.
- Libellés précis, dans le ton des pages existantes.

## Décisions prises en l'absence de réponse (à confirmer)

1. Vendeurs existants : période gratuite, expirés → commission Niveau 4 (2 %),
   premier cycle à la mise en ligne. Forfait payé en cours → conservé jusqu'à sa
   date de fin, puis renouvelé (dû après une commande livrée).
2. Rappels par **e-mail + bandeau** dans le tableau de bord vendeur ; les vraies
   notifications push (Firebase + plugin Capacitor) sont un chantier à part.

## Affichage des produits

Partout sauf « Meilleures ventes » : admin (niveau 0), puis niveau 1 → 4 — même
rang en forfait et en commission —, puis wilaya du visiteur, puis date. Les
listes limitées (accueil, produits similaires, recherche instantanée, aperçus de
catégories) classent tous les candidats avant de couper (`idsClasses`).

## Retours (demande du 2026-11-12)

La page Retours de l'admin liste les réclamations (client, vendeur, produit
retourné, réponses du formulaire) avec Accepter / Refuser. Un retour accepté
sort le produit retourné de la commission du vendeur :
- commande du cycle en cours → l'estimation baisse d'elle-même ;
- facture à régler → recalculée (non due si elle tombe à 0, vendeur débloqué
  s'il ne doit plus rien) ;
- facture déjà payée → avoir sur l'abonnement, déduit de la prochaine facture.
La correction n'a lieu qu'une fois par retour (admin, webhook Flowmerce ou
acceptation immédiate par Flowmerce). Une décision de l'admin n'est pas écrasée
par le webhook. Le forfait n'est pas concerné (montant fixe).
