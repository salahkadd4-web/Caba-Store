// Tests de la déclaration des statuts à Flowmerce (declarerStatuts, lib/flowmerce-statut/core.ts).
// Lancer : npm test   (node --test, sans dépendance ; aucune base ni réseau utilisés)

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  declarerStatuts, urlDeclarationStatuts, LIBELLES_STATUT, _reinitialiserAvertissement,
} from '../lib/flowmerce-statut/core.ts'

const CONFIG = { url: 'https://flowmerce.test:8443/webhooks/orders?x=1', apiKey: 'flk_test_cle', secret: 'whsec_test' }

/** Journal qui mémorise les messages, pour vérifier avertissements et absence de clé. */
function journal() {
  const lignes = { warn: [], error: [], info: [] }
  const ecrire = niveau => (...a) => lignes[niveau].push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '))
  return { lignes, log: { warn: ecrire('warn'), error: ecrire('error'), info: ecrire('info') } }
}

/** Faux fetch : une réponse (code + corps JSON) ou une erreur levée. */
function fauxFetch(reponse, corps = {}) {
  const appels = []
  const fn = async (url, init) => {
    appels.push({ url, ...init })
    if (reponse instanceof Error) throw reponse
    return { status: reponse, text: async () => JSON.stringify(corps) }
  }
  fn.appels = appels
  return fn
}

const reponseOk = (mapped = () => true) => ({
  statuses: Object.values(LIBELLES_STATUT).map(label => ({ label, status: 'x', mapped: mapped(label) })),
  declared_at: '2026-11-15T10:00:00Z',
})

beforeEach(() => _reinitialiserAvertissement())

test('1. le corps contient exactement les libellés de LIBELLES_STATUT, avec la clé API et sans signature', async () => {
  const fetch = fauxFetch(200, reponseOk())
  const { log } = journal()
  const r = await declarerStatuts({ config: CONFIG, fetch, log })

  assert.equal(r.issue, 'declare')
  assert.equal(fetch.appels.length, 1)
  const [appel] = fetch.appels
  assert.equal(appel.method, 'PUT')
  assert.deepEqual(JSON.parse(appel.body), { statuses: Object.values(LIBELLES_STATUT) })
  assert.deepEqual(Object.keys(JSON.parse(appel.body)), ['statuses'])
  assert.equal(appel.headers['Content-Type'], 'application/json')
  assert.equal(appel.headers['X-Flowmerce-Key'], 'flk_test_cle')
  assert.equal(appel.headers['X-Flowmerce-Signature'], undefined)
  assert.ok(appel.signal instanceof AbortSignal, 'timeout posé')
  assert.equal(r.declaredAt, '2026-11-15T10:00:00Z')
})

test('2. l\'URL est dérivée de l\'origine de FLOWMERCE_WEBHOOK_URL', async () => {
  assert.equal(urlDeclarationStatuts(CONFIG.url), 'https://flowmerce.test:8443/api/v1/order-statuses')
  assert.equal(urlDeclarationStatuts('http://localhost:3000/api/webhooks/caba'), 'http://localhost:3000/api/v1/order-statuses')
  const fetch = fauxFetch(200, reponseOk())
  await declarerStatuts({ config: CONFIG, fetch, log: journal().log })
  assert.equal(fetch.appels[0].url, 'https://flowmerce.test:8443/api/v1/order-statuses')
})

test('3. configuration absente : aucun appel réseau', async () => {
  const fetch = fauxFetch(200, reponseOk())
  assert.deepEqual(await declarerStatuts({ config: null, fetch, log: journal().log }), { issue: 'desactive' })

  // Lecture réelle de l'environnement, variables retirées
  const sauvegarde = { ...process.env }
  delete process.env.FLOWMERCE_WEBHOOK_URL
  delete process.env.FLOWMERCE_API_KEY
  delete process.env.FLOWMERCE_STATUS_WEBHOOK_SECRET
  try {
    const { lignes, log } = journal()
    assert.deepEqual(await declarerStatuts({ fetch, log }), { issue: 'desactive' })
    assert.equal(lignes.warn.length, 1)
  } finally {
    Object.assign(process.env, sauvegarde)
  }
  assert.equal(fetch.appels.length, 0)
})

for (const [nom, reponse] of [
  ['500', 500],
  ['403', 403],
  ['401', 401],
  ['400', 400],
  ['un timeout', Object.assign(new Error('délai'), { name: 'TimeoutError' })],
  ['une erreur réseau', new TypeError('fetch failed')],
]) {
  test(`4. ${nom} ne lève pas d'erreur, est journalisé, sans la clé API`, async () => {
    const { lignes, log } = journal()
    const r = await declarerStatuts({ config: CONFIG, fetch: fauxFetch(reponse, { error: 'non' }), log })
    assert.equal(r.issue, 'echec')
    const messages = [...lignes.warn, ...lignes.error]
    assert.equal(messages.length, 1)
    if (reponse === 401) assert.match(lignes.error[0], /ALERTE/)
    for (const m of [...messages, ...lignes.info]) assert.ok(!m.includes(CONFIG.apiKey))
  })
}

test('4b. une réponse illisible ou un fetch qui plante autrement ne lève pas d\'erreur', async () => {
  const fetch = async () => ({ status: 200, text: async () => { throw new Error('flux coupé') } })
  await assert.doesNotReject(declarerStatuts({ config: CONFIG, fetch, log: journal().log }))
})

test('5. un libellé mapped: false produit un avertissement', async () => {
  const { lignes, log } = journal()
  const r = await declarerStatuts({
    config: CONFIG,
    fetch: fauxFetch(200, reponseOk(label => label !== 'En préparation' && label !== 'Annulée')),
    log,
  })
  assert.equal(r.issue, 'declare')
  assert.deepEqual(r.nonReconnus, ['En préparation', 'Annulée'])
  assert.equal(lignes.warn.length, 2)
  assert.match(lignes.warn[0], /En préparation/)
  assert.match(lignes.warn[1], /Annulée/)
  for (const m of [...lignes.warn, ...lignes.info]) assert.ok(!m.includes(CONFIG.apiKey))
})

test('5b. tous les libellés reconnus : aucun avertissement', async () => {
  const { lignes, log } = journal()
  const r = await declarerStatuts({ config: CONFIG, fetch: fauxFetch(200, reponseOk()), log })
  assert.deepEqual(r.nonReconnus, [])
  assert.equal(lignes.warn.length, 0)
})
