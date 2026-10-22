'use client'

/**
 * Dernier filet : erreur dans le layout racine lui-même (session, langue…).
 * Les fournisseurs (I18nProvider, thème) ne sont pas disponibles ici : la page
 * porte ses propres textes et lit la langue dans le cookie `lang`.
 */

const TEXTS = {
  fr: { title: 'Chargement interrompu', desc: 'La connexion au serveur a été coupée. Réessayez dans un instant.', retry: 'Réessayer', dir: 'ltr' },
  ar: { title: 'انقطع التحميل', desc: 'انقطع الاتصال بالخادم. أعد المحاولة بعد لحظة.', retry: 'إعادة المحاولة', dir: 'rtl' },
  en: { title: 'Loading interrupted', desc: 'The connection to the server dropped. Try again in a moment.', retry: 'Try again', dir: 'ltr' },
} as const

function currentLang(): keyof typeof TEXTS {
  if (typeof document === 'undefined') return 'fr'
  const m = document.cookie.match(/(?:^|;\s*)lang=(fr|ar|en)/)
  return (m?.[1] as keyof typeof TEXTS) ?? 'fr'
}

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const lang = currentLang()
  const t = TEXTS[lang]

  return (
    <html lang={lang} dir={t.dir}>
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#fafaf9', color: '#1c1917', fontFamily: 'system-ui, "Segoe UI", Tahoma, sans-serif', padding: 16 }}>
        <div style={{ maxWidth: 420, background: '#fff', border: '1px solid #e7e5e4', borderRadius: 16, padding: 28 }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#c2410c' }}>Caba Store</p>
          <h1 style={{ margin: '12px 0 8px', fontSize: 24, fontWeight: 600 }}>{t.title}</h1>
          <p style={{ margin: '0 0 20px', color: '#57534e', lineHeight: 1.5 }}>{t.desc}</p>
          <button
            type="button"
            onClick={reset}
            style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 12, background: '#c2410c', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            {t.retry}
          </button>
        </div>
      </body>
    </html>
  )
}
