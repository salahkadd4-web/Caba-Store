import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Email de réinitialisation mot de passe
export async function sendResetEmail(email: string, code: string) {
  await transporter.sendMail({
    from: `"Caba Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Code de réinitialisation de mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto;">
        <h2>Réinitialisation du mot de passe</h2>
        <p>Votre code de réinitialisation est :</p>
        <h1 style="color: #2563eb; letter-spacing: 8px;">${code}</h1>
        <p>Ce code expire dans <strong>15 minutes</strong>.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      </div>
    `,
  })
}

// Email de confirmation d'inscription
export async function sendConfirmationEmail(email: string, code: string, prenom: string) {
  await transporter.sendMail({
    from: `Caba Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Confirmez votre inscription',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto;">
        <h2>Bienvenue ${prenom} !</h2>
        <p>Merci de vous être inscrit sur notre boutique.</p>
        <p>Votre code de confirmation est :</p>
        <h1 style="color: #2563eb; letter-spacing: 8px;">${code}</h1>
        <p>Ce code expire dans <strong>15 minutes</strong>.</p>
        <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
      </div>
    `,
  })
}

// ── Code de confirmation d'identité (profil sans mot de passe) ───────────────
export async function sendIdentityOtpEmail(email: string, code: string, prenom: string) {
  await transporter.sendMail({
    from: `"Caba Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Code de confirmation — Modification du profil',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto;">
        <h2>Bonjour ${prenom},</h2>
        <p>Vous avez demandé à modifier votre profil.</p>
        <p>Votre code de confirmation est :</p>
        <h1 style="color: #2563eb; letter-spacing: 8px;">${code}</h1>
        <p>Ce code expire dans <strong>15 minutes</strong>.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      </div>
    `,
  })
}

// ── Notification expiration abonnement ────────────────────────────────────────

const SEUIL_CONFIG: Record<string, { couleur: string; titre: string; urgence: string }> = {
  '25': {
    couleur: '#3b82f6',
    titre: '📅 Rappel abonnement — 75% restant',
    urgence: 'Pour votre information',
  },
  '50': {
    couleur: '#f59e0b',
    titre: '⏳ Rappel abonnement — 50% restant',
    urgence: 'À mi-chemin de votre abonnement',
  },
  '75': {
    couleur: '#f97316',
    titre: '⚠️ Abonnement bientôt expiré — 25% restant',
    urgence: 'Pensez à renouveler',
  },
  '90': {
    couleur: '#ef4444',
    titre: '🚨 Abonnement très proche de l\'expiration — 10% restant',
    urgence: 'Action urgente requise',
  },
}

const NIVEAU_LABELS: Record<string, string> = {
  NIVEAU_0: 'Niveau Admin',
  NIVEAU_1: 'Niveau 1 — 2 500 DA/mois',
  NIVEAU_2: 'Niveau 2 — 2 000 DA/mois',
  NIVEAU_3: 'Niveau 3 — 1 500 DA/mois',
}

export async function sendNotifAbonnement({
  email,
  prenom,
  nomBoutique,
  niveau,
  dateFin,
  seuil,
  joursRestants,
}: {
  email: string
  prenom: string
  nomBoutique: string
  niveau: string
  dateFin: Date
  seuil: string   // '25' | '50' | '75' | '90'
  joursRestants: number
}) {
  const cfg = SEUIL_CONFIG[seuil]
  if (!cfg) return

  const dateFinStr = dateFin.toLocaleDateString('fr-DZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  await transporter.sendMail({
    from: `"CabaStore" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: cfg.titre,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- En-tête coloré selon urgence -->
    <div style="background:${cfg.couleur};padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">${cfg.titre}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${cfg.urgence}</p>
    </div>

    <!-- Corps -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:14px;">
        Bonjour <strong>${prenom}</strong>,
      </p>
      <p style="margin:0 0 20px;color:#374151;font-size:14px;">
        Votre abonnement pour la boutique <strong>${nomBoutique}</strong>
        (<strong>${NIVEAU_LABELS[niveau] ?? niveau}</strong>) approche de son expiration.
      </p>

      <!-- Bloc récap -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Abonnement</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;">${NIVEAU_LABELS[niveau] ?? niveau}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Date d'expiration</td>
            <td style="padding:4px 0;text-align:right;font-weight:600;">${dateFinStr}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Jours restants</td>
            <td style="padding:4px 0;text-align:right;font-weight:700;color:${cfg.couleur};">
              ${joursRestants} jour${joursRestants > 1 ? 's' : ''}
            </td>
          </tr>
        </table>
      </div>

      ${seuil === '75' || seuil === '90' ? `
      <p style="margin:0 0 20px;color:#374151;font-size:14px;">
        Sans renouvellement, vos produits seront <strong>masqués de la boutique</strong>
        dès l'expiration de votre abonnement.
      </p>
      ` : ''}

      <!-- Bouton -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${process.env.NEXT_PUBLIC_URL ?? 'https://cabastore.com'}/vendeur/abonnement"
           style="display:inline-block;background:${cfg.couleur};color:#fff;text-decoration:none;
                  padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;">
          Renouveler mon abonnement
        </a>
      </div>
    </div>

    <!-- Pied -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">
        CabaStore • Cet email est envoyé automatiquement, ne pas répondre.
      </p>
    </div>

  </div>
</body>
</html>
    `,
  })
}