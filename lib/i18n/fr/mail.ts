/** Emails transactionnels. */
const mail = {
  expires15: 'Ce code expire dans <strong>15 minutes</strong>.',
  reset: {
    subject: 'Code de réinitialisation de mot de passe',
    title: 'Réinitialisation du mot de passe',
    yourCode: 'Votre code de réinitialisation est :',
    ignore: "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.",
  },
  confirm: {
    subject: 'Confirmez votre inscription',
    welcome: (prenom: string): string => `Bienvenue ${prenom} !`,
    thanks: 'Merci de vous être inscrit sur notre boutique.',
    yourCode: 'Votre code de confirmation est :',
    ignore: "Si vous n'avez pas créé de compte, ignorez cet email.",
  },
  identity: {
    subject: 'Code de confirmation — Modification du profil',
    hello: (prenom: string): string => `Bonjour ${prenom},`,
    requested: 'Vous avez demandé à modifier votre profil.',
    yourCode: 'Votre code de confirmation est :',
    ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    userFallback: 'Utilisateur',
  },
  billing: {
    hello: (prenom: string): string => `Bonjour ${prenom},`,
    reminderSubject: (n: number): string => `Caba Store — il vous reste ${n} jour${n > 1 ? 's' : ''} pour régler votre facture`,
    reminderTitle: (n: number): string => `Il vous reste ${n} jour${n > 1 ? 's' : ''}`,
    reminderIntro: (shop: string): string =>
      `Petit rappel pour la boutique <strong>${shop}</strong> : une facture Caba Store est à régler.`,
    reminderNote: "Réglez par virement, CCP ou en espèces auprès de l'administration. Vos produits restent en ligne jusqu'à l'échéance.",
    amountDue: 'Montant à régler',
    dueDate: 'À régler avant le',
    daysLeft: 'Jours restants',
    days: (n: number): string => `${n} jour${n > 1 ? 's' : ''}`,
    blockedSubject: 'Caba Store — votre compte vendeur est bloqué',
    blockedIntro: (shop: string): string =>
      `L'échéance de paiement de la boutique <strong>${shop}</strong> est passée : vos produits ne sont plus affichés.`,
    blockedNote: "Dès que l'administration confirme votre paiement, votre compte est débloqué et vos produits réapparaissent.",
    seeDetails: 'Voir mon abonnement',
    footer: 'Caba Store • Cet e-mail est envoyé automatiquement, merci de ne pas y répondre.',
  },
}

export default mail
