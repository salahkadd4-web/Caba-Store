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
  subscription: {
    thresholds: {
      '25': { titre: '📅 Rappel abonnement — 75% restant', urgence: 'Pour votre information' },
      '50': { titre: '⏳ Rappel abonnement — 50% restant', urgence: 'À mi-chemin de votre abonnement' },
      '75': { titre: '⚠️ Abonnement bientôt expiré — 25% restant', urgence: 'Pensez à renouveler' },
      '90': { titre: "🚨 Abonnement très proche de l'expiration — 10% restant", urgence: 'Action urgente requise' },
    } as Record<string, { titre: string; urgence: string }>,
    adminLevel: 'Niveau Admin',
    levelPerMonth: (label: string, price: string): string => `${label} — ${price}/mois`,
    hello: 'Bonjour',
    approaching: (shop: string, level: string): string =>
      `Votre abonnement pour la boutique <strong>${shop}</strong> (<strong>${level}</strong>) approche de son expiration.`,
    subscription: 'Abonnement',
    expirationDate: "Date d'expiration",
    daysLeft: 'Jours restants',
    days: (n: number): string => `${n} jour${n > 1 ? 's' : ''}`,
    hiddenWarning: "Sans renouvellement, vos produits seront <strong>masqués de la boutique</strong> dès l'expiration de votre abonnement.",
    renew: 'Renouveler mon abonnement',
    footer: 'CabaStore • Cet email est envoyé automatiquement, ne pas répondre.',
  },
}

export default mail
