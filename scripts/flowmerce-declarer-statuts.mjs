// Déclare à Flowmerce la liste des statuts de commande de Caba Store, à la demande.
// N'écrit rien dans la base de Caba Store. Le cron /api/cron/flowmerce le fait
// aussi chaque jour (déclaration idempotente : la liste remplace la précédente).
//
//   node --env-file=.env scripts/flowmerce-declarer-statuts.mjs
//
// Utilise la même fonction que le cron (lib/flowmerce-statut/core.ts).
// Affiche le code HTTP et la réponse ; jamais la clé API.

import { lireConfig, declarerStatuts, libellesADeclarer, urlDeclarationStatuts } from '../lib/flowmerce-statut/core.ts'

const config = lireConfig()
if (!config) process.exit(1)

const interception = async (url, init) => {
  const res = await fetch(url, init)
  const texte = await res.text()
  console.log(`HTTP ${res.status}\n${texte.slice(0, 2000)}`)
  return { status: res.status, text: async () => texte }
}

console.log(`Déclaration vers ${urlDeclarationStatuts(config.url)} : ${JSON.stringify(libellesADeclarer())}`)
const r = await declarerStatuts({ config, fetch: interception })

if (r.issue === 'declare') {
  for (const s of r.statuts) console.log(`  ${s.mapped ? '✔' : '✖'} ${s.label}${s.status ? ` → ${s.status}` : ''}`)
  console.log(`Résultat : déclaré${r.declaredAt ? ` le ${r.declaredAt}` : ''}${r.nonReconnus.length ? `, ${r.nonReconnus.length} libellé(s) non reconnu(s)` : ''}`)
  process.exit(0)
}
console.log('Résultat :', r.issue === 'echec' ? `échec (${r.erreur})` : 'désactivé')
process.exit(2)
