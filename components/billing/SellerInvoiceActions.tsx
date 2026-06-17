'use client'

import { Download, Printer } from 'lucide-react'

type SellerInvoiceRecord = {
  invoiceNumber: string
  sellerName: string
  levelLabel: string
  periodiciteLabel: string
  paymentDateLabel: string
  periodLabel: string
  paymentMethodLabel: string
  reference: string | null
  adminNote: string | null
  grossSalesLabel: string
  salesFeeLabel: string
  subscriptionAmountLabel: string
  totalDueLabel: string
  deliveredOrdersCount: number
  soldItemsCount: number
}

function getInvoiceHtml(invoice: SellerInvoiceRecord) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${invoice.invoiceNumber}</title>
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
    .total { background: #ecfdf5; border-color: #a7f3d0; }
    .small { font-size: 12px; }
    @media print { body { margin: 0; } .wrap { max-width: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div>
        <h1>Facture vendeur</h1>
        <p class="muted">${invoice.invoiceNumber}</p>
      </div>
      <div>
        <p><strong>Vendeur :</strong> ${invoice.sellerName}</p>
        <p><strong>Date de reglement :</strong> ${invoice.paymentDateLabel}</p>
        <p><strong>Periode :</strong> ${invoice.periodLabel}</p>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <h2>Abonnement</h2>
        <div class="row"><span>Niveau</span><strong>${invoice.levelLabel}</strong></div>
        <div class="row"><span>Periodicite</span><strong>${invoice.periodiciteLabel}</strong></div>
        <div class="row"><span>Montant abonnement</span><strong>${invoice.subscriptionAmountLabel}</strong></div>
      </div>
      <div class="box">
        <h2>Paiement</h2>
        <div class="row"><span>Methode</span><strong>${invoice.paymentMethodLabel}</strong></div>
        <div class="row"><span>Reference</span><strong>${invoice.reference ?? '—'}</strong></div>
        <div class="row"><span>Note admin</span><strong>${invoice.adminNote ?? '—'}</strong></div>
      </div>
    </div>

    <div class="box">
      <h2>Detail de facturation</h2>
      <div class="row"><span>Ventes livrees</span><strong>${invoice.grossSalesLabel}</strong></div>
      <div class="row"><span>Commission ventes (1%)</span><strong>${invoice.salesFeeLabel}</strong></div>
      <div class="row"><span>Commandes livrees</span><strong>${invoice.deliveredOrdersCount}</strong></div>
      <div class="row"><span>Lignes vendues</span><strong>${invoice.soldItemsCount}</strong></div>
    </div>

    <div class="box total" style="margin-top: 20px;">
      <div class="row"><span>Total a payer</span><strong>${invoice.totalDueLabel}</strong></div>
    </div>

    <p class="small muted" style="margin-top: 16px;">Document genere depuis Caba Store.</p>
  </div>
</body>
</html>`
}

export default function SellerInvoiceActions({ invoice }: { invoice: SellerInvoiceRecord }) {
  const handlePrint = () => {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=980,height=820')
    if (!popup) return

    popup.document.open()
    popup.document.write(getInvoiceHtml(invoice))
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const handleExport = () => {
    const blob = new Blob([getInvoiceHtml(invoice)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.invoiceNumber}.html`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
      >
        <Download className="w-3.5 h-3.5" /> Exporter
      </button>
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 px-3 py-1.5 text-xs font-medium text-white dark:text-stone-900 hover:opacity-90 transition"
      >
        <Printer className="w-3.5 h-3.5" /> Imprimer
      </button>
    </div>
  )
}
