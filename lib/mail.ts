import nodemailer from 'nodemailer'
import { getI18nFor, localeDir, type Locale } from '@/lib/i18n'
import { APP_URL } from '@/lib/constants'

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

/** Échappe les valeurs saisies par l'utilisateur avant insertion dans le HTML. */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

/** Gabarit commun des emails à code (texte aligné selon la langue). */
function codeEmail(locale: Locale, lines: { title: string; intro?: string; yourCode: string; code: string; ignore: string }) {
  const { t } = getI18nFor(locale)
  const dir = localeDir(locale)
  return `
      <div dir="${dir}" style="font-family: Arial, sans-serif; max-width: 400px; margin: auto; text-align: ${dir === 'rtl' ? 'right' : 'left'};">
        <h2>${lines.title}</h2>
        ${lines.intro ? `<p>${lines.intro}</p>` : ''}
        <p>${lines.yourCode}</p>
        <h1 dir="ltr" style="color: #2563eb; letter-spacing: 8px;">${lines.code}</h1>
        <p>${t.mail.expires15}</p>
        <p>${lines.ignore}</p>
      </div>
    `
}

// Email de réinitialisation mot de passe
export async function sendResetEmail(email: string, code: string, locale: Locale = 'fr') {
  const m = getI18nFor(locale).t.mail.reset
  await transporter.sendMail({
    from: `"Caba Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: m.subject,
    html: codeEmail(locale, { title: m.title, yourCode: m.yourCode, code, ignore: m.ignore }),
  })
}

// Email de confirmation d'inscription
export async function sendConfirmationEmail(email: string, code: string, prenom: string, locale: Locale = 'fr') {
  const m = getI18nFor(locale).t.mail.confirm
  await transporter.sendMail({
    from: `"Caba Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: m.subject,
    html: codeEmail(locale, { title: m.welcome(esc(prenom)), intro: m.thanks, yourCode: m.yourCode, code, ignore: m.ignore }),
  })
}

// ── Code de confirmation d'identité (profil sans mot de passe) ───────────────
export async function sendIdentityOtpEmail(email: string, code: string, prenom: string, locale: Locale = 'fr') {
  const m = getI18nFor(locale).t.mail.identity
  await transporter.sendMail({
    from: `"Caba Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: m.subject,
    html: codeEmail(locale, { title: m.hello(esc(prenom || m.userFallback)), intro: m.requested, yourCode: m.yourCode, code, ignore: m.ignore }),
  })
}

// ── Facturation vendeurs ─────────────────────────────────────────────────────
// Ton volontairement calme : peu d'e-mails (J+7, 15, 21, 25, 27, 29), sans alarme.

const COULEUR_RAPPEL = '#c2410c'  // orange-700, couleur de la marque
const COULEUR_BLOQUE = '#b91c1c'  // red-700

function billingEmail(locale: Locale, o: {
  couleur: string; titre: string; prenom: string; intro: string
  lignes: [string, string][]; note?: string; bouton: string
}) {
  const { t } = getI18nFor(locale)
  const m = t.mail.billing
  const dir = localeDir(locale)
  const end = dir === 'rtl' ? 'left' : 'right'
  return `
<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4;">
    <div style="background:${o.couleur};padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">${o.titre}</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;color:#44403c;font-size:14px;">${m.hello(esc(o.prenom))}</p>
      <p style="margin:0 0 20px;color:#44403c;font-size:14px;">${o.intro}</p>
      <div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#44403c;">
          ${o.lignes.map(([k, v]) => `<tr>
            <td style="padding:4px 0;color:#78716c;">${k}</td>
            <td style="padding:4px 0;text-align:${end};font-weight:700;">${v}</td>
          </tr>`).join('')}
        </table>
      </div>
      ${o.note ? `<p style="margin:0 0 20px;color:#44403c;font-size:14px;">${o.note}</p>` : ''}
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${APP_URL}/vendeur/abonnement"
           style="display:inline-block;background:${o.couleur};color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px;">
          ${o.bouton}
        </a>
      </div>
    </div>
    <div style="padding:16px 32px;background:#fafaf9;border-top:1px solid #e7e5e4;text-align:center;">
      <p style="margin:0;color:#a8a29e;font-size:12px;">${m.footer}</p>
    </div>
  </div>
</body>
</html>`
}

/** Rappel « il vous reste xx jours » pour régler ce qui est dû. */
export async function sendRappelPaiement({
  email, prenom, nomBoutique, montant, echeance, joursRestants, locale = 'fr',
}: {
  email: string; prenom: string; nomBoutique: string
  montant: number; echeance: Date; joursRestants: number; locale?: Locale
}) {
  const { t, fmt } = getI18nFor(locale)
  const m = t.mail.billing
  await transporter.sendMail({
    from: `"CabaStore" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: m.reminderSubject(joursRestants),
    html: billingEmail(locale, {
      couleur: COULEUR_RAPPEL,
      titre: m.reminderTitle(joursRestants),
      prenom,
      intro: m.reminderIntro(esc(nomBoutique)),
      lignes: [
        [m.amountDue, fmt.price(montant)],
        [m.dueDate, fmt.date(echeance)],
        [m.daysLeft, m.days(joursRestants)],
      ],
      note: m.reminderNote,
      bouton: m.seeDetails,
    }),
  })
}

/** Échéance passée sans paiement : le compte est bloqué. */
export async function sendCompteBloque({
  email, prenom, nomBoutique, montant, locale = 'fr',
}: {
  email: string; prenom: string; nomBoutique: string; montant: number; locale?: Locale
}) {
  const { t, fmt } = getI18nFor(locale)
  const m = t.mail.billing
  await transporter.sendMail({
    from: `"CabaStore" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: m.blockedSubject,
    html: billingEmail(locale, {
      couleur: COULEUR_BLOQUE,
      titre: m.blockedSubject,
      prenom,
      intro: m.blockedIntro(esc(nomBoutique)),
      lignes: [[m.amountDue, fmt.price(montant)]],
      note: m.blockedNote,
      bouton: m.seeDetails,
    }),
  })
}
