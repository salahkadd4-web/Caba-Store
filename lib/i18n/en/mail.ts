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
  billing: {
    hello: (prenom: string): string => `Hello ${prenom},`,
    reminderSubject: (n: number): string => `Caba Store — ${n} day${n === 1 ? '' : 's'} left to pay your invoice`,
    reminderTitle: (n: number): string => `${n} day${n === 1 ? '' : 's'} left`,
    reminderIntro: (shop: string): string =>
      `A quick reminder for the shop <strong>${shop}</strong>: a Caba Store invoice is due.`,
    reminderNote: 'Pay by bank transfer, CCP or cash to the administration. Your products stay online until the due date.',
    amountDue: 'Amount due',
    dueDate: 'Pay before',
    daysLeft: 'Days left',
    days: (n: number): string => `${n} day${n === 1 ? '' : 's'}`,
    blockedSubject: 'Caba Store — your seller account is blocked',
    blockedIntro: (shop: string): string =>
      `The payment due date for the shop <strong>${shop}</strong> has passed: your products are no longer displayed.`,
    blockedNote: 'As soon as the administration confirms your payment, your account is unblocked and your products are back online.',
    seeDetails: 'View my subscription',
    footer: 'Caba Store • This email is sent automatically, please do not reply.',
  },
}

export default mail
