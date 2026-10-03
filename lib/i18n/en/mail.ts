import type fr from '../fr/mail'

const mail: typeof fr = {
  expires15: 'This code expires in <strong>15 minutes</strong>.',
  reset: {
    subject: 'Password reset code',
    title: 'Password reset',
    yourCode: 'Your reset code is:',
    ignore: "If you didn't request this reset, ignore this email.",
  },
  confirm: {
    subject: 'Confirm your registration',
    welcome: (prenom: string): string => `Welcome ${prenom}!`,
    thanks: 'Thanks for signing up to our store.',
    yourCode: 'Your confirmation code is:',
    ignore: "If you didn't create an account, ignore this email.",
  },
  identity: {
    subject: 'Confirmation code — Profile change',
    hello: (prenom: string): string => `Hello ${prenom},`,
    requested: 'You asked to change your profile.',
    yourCode: 'Your confirmation code is:',
    ignore: "If you didn't make this request, ignore this email.",
    userFallback: 'User',
  },
  subscription: {
    thresholds: {
      '25': { titre: '📅 Subscription reminder — 75% remaining', urgence: 'For your information' },
      '50': { titre: '⏳ Subscription reminder — 50% remaining', urgence: 'Halfway through your subscription' },
      '75': { titre: '⚠️ Subscription expiring soon — 25% remaining', urgence: 'Remember to renew' },
      '90': { titre: '🚨 Subscription about to expire — 10% remaining', urgence: 'Urgent action required' },
    },
    adminLevel: 'Admin level',
    levelPerMonth: (label: string, price: string): string => `${label} — ${price}/month`,
    hello: 'Hello',
    approaching: (shop: string, level: string): string =>
      `Your subscription for the shop <strong>${shop}</strong> (<strong>${level}</strong>) is about to expire.`,
    subscription: 'Subscription',
    expirationDate: 'Expiry date',
    daysLeft: 'Days left',
    days: (n: number): string => `${n} day${n === 1 ? '' : 's'}`,
    hiddenWarning: 'Without renewal, your products will be <strong>hidden from the store</strong> as soon as your subscription expires.',
    renew: 'Renew my subscription',
    footer: 'CabaStore • This email is sent automatically, please do not reply.',
  },
}

export default mail
