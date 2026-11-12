/** Abonnements vendeurs et facturation (forfait ou commission). */
const billing = {
  levels: {
    NIVEAU_0: { label: 'Niveau 0', desc: 'Administration' },
    NIVEAU_1: { label: 'Niveau 1', desc: 'Priorité 1 — affiché en premier' },
    NIVEAU_2: { label: 'Niveau 2', desc: 'Priorité 2' },
    NIVEAU_3: { label: 'Niveau 3', desc: 'Priorité 3' },
    NIVEAU_4: { label: 'Niveau 4', desc: 'Priorité 4' },
  } as Record<string, { label: string; desc: string }>,
  modes: {
    COMMISSION: 'Commission',
    FORFAIT: 'Forfait',
  } as Record<string, string>,
  durations: {
    mensuel: '1 mois',
    semestriel: '6 mois',
    annuel: '12 mois',
  } as Record<string, string>,
  methods: {
    virement: 'Virement',
    ccp: 'CCP',
    cash: 'Espèces',
  } as Record<string, string>,
  status: {
    ACTIF: 'Actif',
    BLOQUE: 'Bloqué',
  } as Record<string, string>,
  invoiceStatus: {
    A_VENIR: 'À venir',
    EN_ATTENTE: 'À régler',
    PAYEE: 'Réglée',
    ANNULEE: 'Non due',
  } as Record<string, string>,

  commissionLabel: (pct: number): string => `Commission ${pct} %`,
  forfaitLabel: (duree: string): string => `Forfait ${duree}`,
  commissionDetail: (pct: number, sales: string, orders: number): string =>
    `${pct} % sur ${sales} de ventes livrées (${orders} commande${orders > 1 ? 's' : ''})`,
  periodRange: (from: string, to: string): string => `du ${from} au ${to}`,
  paidOn: (date: string, method: string): string => `Réglée le ${date}${method ? ` · ${method}` : ''}`,
  dueBefore: (date: string, days: number): string =>
    `À régler avant le ${date} — il vous reste ${days} jour${days > 1 ? 's' : ''}`,
  overdue: 'Échéance dépassée',
  ref: (r: string): string => `Réf. ${r}`,
  creditDeducted: (amount: string): string => `Avoir déduit : ${amount}`,
  creditAvailable: (amount: string): string => `Avoir disponible : ${amount}, déduit de votre prochaine facture (retours acceptés).`,
  genericError: 'Une erreur est survenue',

  // Choix de l'offre
  perOrder: 'par commande livrée',
  perMonth: '/mois',
  forfaitTotal: (amount: string, duree: string): string => `soit ${amount} pour ${duree}`,
  commissionIntro: 'Vous ne payez que si vous vendez : un pourcentage du prix des articles livrés, réglé après chaque mois.',
  forfaitIntro: "Un montant fixe sans pourcentage sur vos ventes. Il n'est dû qu'à partir de votre première commande livrée sur la période.",
  durationLabel: 'Durée',
  currentOffer: 'Offre actuelle',
  priorityNote: "Le niveau fixe l'ordre d'affichage de vos produits : Niveau 1 en premier. Il est le même en forfait et en commission.",
  nextOffer: (offer: string, date: string): string => `Prochaine offre : ${offer}, à partir du ${date}.`,
  cancelChange: 'Annuler le changement',
  takesEffect: (date: string): string => `Votre choix prendra effet le ${date}.`,
  confirmChoice: 'Choisir cette offre',

  // Page vendeur
  sellerFallback: 'Vendeur',
  title: 'Mon abonnement',
  subtitle: 'Votre offre, ce que vous devez et vos factures',
  noSubscription: 'Aucun abonnement trouvé.',
  blockedTitle: 'Compte bloqué',
  blockedDesc: (amount: string): string =>
    `Vos produits ne sont plus affichés. Réglez ${amount} : dès que l'administration confirme le paiement, ils reviennent en ligne.`,
  displayPriority: "Priorité d'affichage",
  priorityN: (n: number): string => `Priorité ${n}`,
  currentCycle: 'Cycle en cours',
  forfaitEnds: "Forfait jusqu'au",
  toPay: 'À régler',
  nothingToPay: 'Vous êtes à jour : rien à régler.',
  howToPay: "Réglez par virement, CCP ou en espèces auprès de l'administration, qui confirme ensuite votre paiement.",
  forfaitPending: (amount: string): string =>
    `Forfait de ${amount} : il deviendra à régler dès votre première commande livrée sur la période.`,
  forfaitPendingShort: 'Dû après la première commande livrée',
  commissionThisCycle: 'Commission du cycle en cours',
  commissionBilledOn: (date: string): string => `Facturée le ${date}, à régler dans le mois qui suit.`,
  chooseOffer: 'Choisir mon offre',
  history: 'Historique des factures',
  noInvoices: 'Aucune facture pour le moment.',

  // Bandeau du tableau de bord vendeur
  bannerDue: (amount: string, days: number): string =>
    `Il vous reste ${days} jour${days > 1 ? 's' : ''} pour régler ${amount}.`,
  bannerBlocked: (amount: string): string => `Compte bloqué : réglez ${amount} pour remettre vos produits en ligne.`,
  bannerLink: 'Voir le détail',

  // Facture imprimable
  invoice: {
    title: 'Facture vendeur',
    seller: 'Vendeur :',
    period: 'Période :',
    offer: 'Offre',
    deliveredSales: 'Ventes livrées',
    deliveredOrders: 'Commandes livrées',
    rate: 'Taux',
    duration: 'Durée',
    payment: 'Paiement',
    paidOn: 'Réglée le',
    method: 'Méthode',
    reference: 'Référence',
    status: 'Statut',
    dueDate: 'À régler avant le',
    credit: 'Avoir disponible',
    amount: 'Montant',
    generated: 'Document généré depuis Caba Store.',
    export: 'Exporter',
    print: 'Imprimer',
  },
}

export default billing
