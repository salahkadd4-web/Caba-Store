'use client'

import { Download, Printer } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import type { I18n } from '@/lib/i18n'
import { tr } from '@/lib/i18n'
import type { FactureVue } from '@/lib/seller-billing'
import { libelleOffre } from '@/components/billing/labels'

/** Échappe les valeurs saisies avant de les insérer dans le HTML de la facture. */
function esc(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function getInvoiceHtml(f: FactureVue, sellerName: string, { t, fmt, locale, dir }: Pick<I18n, 't' | 'fmt' | 'locale' | 'dir'>) {
  const b = t.billing
  const L = b.invoice
  const row = (k: string, v: string) => `<div class="row"><span>${k}</span><strong>${v}</strong></div>`
  const detail = f.type === 'COMMISSION'
    ? row(L.deliveredSales, fmt.price(f.ventesBrutes)) +
      row(L.deliveredOrders, String(f.nbCommandes)) +
      row(L.rate, `${Math.round((f.taux ?? 0) * 100)} %`)
    : row(L.duration, esc(b.durations[f.periodicite ?? 'mensuel'] ?? f.periodicite))
  const paiement = f.statut === 'PAYEE' && f.payeeLe
    ? row(L.paidOn, fmt.date(f.payeeLe)) +
      row(L.method, esc(f.methode ? tr(b.methods, f.methode) : '—')) +
      row(L.reference, esc(f.reference ?? '—'))
    : row(L.status, esc(b.invoiceStatus[f.statut] ?? f.statut)) +
      (f.echeance ? row(L.dueDate, fmt.date(f.echeance)) : '')

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${esc(f.numero)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1c1917; margin: 32px; }
    .wrap { max-width: 820px; margin: 0 auto; }
    .top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
    .box { border: 1px solid #d6d3d1; border-radius: 16px; padding: 20px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin-bottom: 12px; }
    .muted { color: #57534e; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e7e5e4; }
    .row:last-child { border-bottom: none; }
    .total { background: #fafaf9; }
    .small { font-size: 12px; }
    @media print { body { margin: 0; } .wrap { max-width: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div>
        <h1>${L.title}</h1>
        <p class="muted">${esc(f.numero)}</p>
      </div>
      <div>
        <p><strong>${L.seller}</strong> ${esc(sellerName)}</p>
        <p><strong>${L.period}</strong> ${fmt.date(f.periodeDebut)} – ${fmt.date(f.periodeFin)}</p>
      </div>
    </div>
    <div class="grid">
      <div class="box">
        <h2>${esc(b.modes[f.type] ?? f.type)}</h2>
        ${row(L.offer, esc(libelleOffre(t, f)))}
        ${detail}
      </div>
      <div class="box">
        <h2>${L.payment}</h2>
        ${paiement}
      </div>
    </div>
    <div class="box total">
      ${row(L.amount, fmt.price(f.montant))}
    </div>
    <p class="small muted" style="margin-top: 16px;">${L.generated}</p>
  </div>
</body>
</html>`
}

export default function SellerInvoiceActions({ facture, sellerName }: { facture: FactureVue; sellerName: string }) {
  const i18n = useI18n()
  const L = i18n.t.billing.invoice

  const handlePrint = () => {
    const popup = window.open('', '_blank', 'width=980,height=820')
    if (!popup) return
    popup.document.open()
    popup.document.write(getInvoiceHtml(facture, sellerName, i18n))
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const handleExport = () => {
    const blob = new Blob([getInvoiceHtml(facture, sellerName, i18n)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${facture.numero}.html`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleExport}
        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition">
        <Download className="w-3.5 h-3.5" /> {L.export}
      </button>
      <button type="button" onClick={handlePrint}
        className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 px-3 py-1.5 text-xs font-medium text-white dark:text-stone-900 hover:opacity-90 transition">
        <Printer className="w-3.5 h-3.5" /> {L.print}
      </button>
    </div>
  )
}
