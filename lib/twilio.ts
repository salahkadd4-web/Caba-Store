import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!

// Formater le numéro algérien → international
export function formatPhone(telephone: string): string {
  const cleaned = telephone.replace(/\s/g, '')
  if (cleaned.startsWith('0')) {
    return '+213' + cleaned.slice(1)
  }
  return cleaned
}

// Valider le format algérien
export function validatePhone(telephone: string): boolean {
  const cleaned = telephone.replace(/\s/g, '')
  return /^(05|06|07)\d{8}$/.test(cleaned)
}

// Envoyer le code OTP
// locale : langue du SMS envoyé par Twilio Verify ('fr' | 'ar')
export async function sendOTP(telephone: string, locale?: 'fr' | 'ar'): Promise<void> {
  const phone = formatPhone(telephone)
  await client.verify.v2
    .services(serviceSid)
    .verifications.create({ to: phone, channel: 'sms', ...(locale ? { locale } : {}) })
}

// Vérifier le code OTP
export async function verifyOTP(telephone: string, code: string): Promise<boolean> {
  const phone = formatPhone(telephone)
  const result = await client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({ to: phone, code })
  return result.status === 'approved'
}
