import nodemailer from 'nodemailer'
import { getI18nFor, localeDir, type Locale } from '@/lib/i18n'
import { SELLER_SUBSCRIPTION_PRICING } from '@/lib/seller-billing'

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

// ── Notification expiration abonnement ────────────────────────────────────────
// Envoyée par le cron : aucune langue de requête → français par défaut.

const SEUIL_COULEUR: Record<string, string> = {
  '25': '#3b82f6',
  '50': '#f59e0b',
  '75': '#f97316',
  '90': '#ef4444',
}

export async function sendNotifAbonnement({
  email,
  prenom,
  nomBoutique,
  niveau,
  dateFin,
  seuil,
  joursRestants,
  locale = 'fr',
}: {
  email: string
  prenom: string
  nomBoutique: string
  niveau: string
  dateFin: Date
  seuil: string   // '25' | '50' | '75' | '90'
  joursRestants: number
  locale?: Locale
}) {
  const { t, fmt } = getI18nFor(locale)
  const m   = t.mail.subscription
  const cfg = m.thresholds[seuil]
  const couleur = SEUIL_COULEUR[seuil]
  if (!cfg || !couleur) return

  const dir   = localeDir(locale)
  const end   = dir === 'rtl' ? 'left' : 'right'
  const tarif = SELLER_SUBSCRIPTION_PRICING[niveau as keyof typeof SELLER_SUBSCRIPTION_PRICING]
  const niveauLabel = niveau === 'NIVEAU_0'
    ? m.adminLevel
    : tarif
      ? m.levelPerMonth(t.billing.levels[niveau]?.label ?? niveau, fmt.price(tarif.mensuel))
      : niveau

  const dateFinStr = fmt.date(dateFin)

  await transporter.sendMail({
    from: `"CabaStore" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: cfg.titre,
    html: `
<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- En-tête coloré selon urgence -->
    <div style="background:${couleur};padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">${cfg.titre}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${cfg.urgence}</p>
    </div>

    <!-- Corps -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:14px;">
        ${m.hello} <strong>${esc(prenom)}</strong>,
      </p>
      <p style="margin:0 0 20px;color:#374151;font-size:14px;">
        ${m.approaching(esc(nomBoutique), niveauLabel)}
      </p>

      <!-- Bloc récap -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;">${m.subscription}</td>
            <td style="padding:4px 0;text-align:${end};font-weight:600;">${niveauLabel}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">${m.expirationDate}</td>
            <td style="padding:4px 0;text-align:${end};font-weight:600;">${dateFinStr}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">${m.daysLeft}</td>
            <td style="padding:4px 0;text-align:${end};font-weight:700;color:${couleur};">
              ${m.days(joursRestants)}
            </td>
          </tr>
        </table>
      </div>

      ${seuil === '75' || seuil === '90' ? `
      <p style="margin:0 0 20px;color:#374151;font-size:14px;">
        ${m.hiddenWarning}
      </p>
      ` : ''}

      <!-- Bouton -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${process.env.NEXT_PUBLIC_URL ?? 'https://cabastore.com'}/vendeur/abonnement"
           style="display:inline-block;background:${couleur};color:#fff;text-decoration:none;
                  padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;">
          ${m.renew}
        </a>
      </div>
    </div>

    <!-- Pied -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">
        ${m.footer}
      </p>
    </div>

  </div>
</body>
</html>
    `,
  })
}
