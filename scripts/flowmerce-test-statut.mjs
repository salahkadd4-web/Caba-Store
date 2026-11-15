// Envoie UN événement de statut signé à Flowmerce, pour vérifier la configuration.
// N'écrit rien dans la base de Caba Store et ne crée aucune commande.
//
//   node --env-file=.env scripts/flowmerce-test-statut.mjs <order_id> "<statut>" [email] [fr|ar]
//   ex. : node --env-file=.env scripts/flowmerce-test-statut.mjs TEST-VERIF-1 "Expédiée" moi@example.com fr
//
// Utilise les mêmes fonctions que la boutique (lib/flowmerce-statut/core.ts).
// Affiche le code HTTP et la réponse ; jamais la clé, le secret ni la signature.

import { lireConfig, envoyerUneFois, nouvelIdEvenement } from '../lib/flowmerce-statut/core.ts'

const [orderId, status, email, language] = process.argv.slice(2)
if (!orderId || !status) {
  console.error('Usage : node --env-file=.env scripts/flowmerce-test-statut.mjs <order_id> "<statut>" [email] [fr|ar]')
  process.exit(1)
}

const config = lireConfig()
if (!config) process.exit(1)

const corps = { order_id: orderId, status, updated_at: new Date().toISOString() }
const customer = {}
if (email) customer.email = email
if (language === 'fr' || language === 'ar') customer.language = language
if (Object.keys(customer).length) corps.customer = customer

const eventId = nouvelIdEvenement()
const body = JSON.stringify(corps)
const interception = async (url, init) => {
  const res = await fetch(url, init)
  const texte = await res.text()
  console.log(`HTTP ${res.status}\n${texte.slice(0, 1000)}`)
  return { status: res.status, text: async () => texte }
}

console.log(`Envoi de ${eventId} vers ${new URL(config.url).origin}… corps : ${body}`)
const r = await envoyerUneFois(config, eventId, body, { fetch: interception })
console.log('Résultat :', r.issue === 'livre' ? 'livré' : r.issue === 'relance' ? `échec temporaire (${r.erreur})` : `refusé (${r.erreur})`)
process.exit(r.issue === 'livre' ? 0 : 2)
