// Tests de l'envoi des statuts de commande à Flowmerce (lib/flowmerce-statut/core.ts).
// Lancer : npm test   (node --test, sans dépendance ; aucune base ni réseau utilisés)

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  signer, construireCorps, enregistrerChangementsStatut, traiterFile, lireConfig,
  interpreterReponse, _reinitialiserAvertissement, MAX_TENTATIVES,
} from '../lib/flowmerce-statut/core.ts'

const CONFIG = { url: 'https://flowmerce.test/webhooks/orders', apiKey: 'flk_test', secret: 'whsec_test_secret' }
const silencieux = { warn() {}, error() {}, info() {} }

const COMMANDE = {
  id: 'cmd_1',
  langue: 'ar',
  user: { nom: 'B.', prenom: 'Amine', email: 'amine@example.com', telephone: '0550000000' },
  items: [{ quantite: 1, variantNom: 'Noir', variantOptionValeur: '39', product: { nom: 'Chaussure X' } }],
}

// ── File en mémoire et faux client HTTP ─────────────────────────────────────

function fileMemoire(evenements) {
  const lignes = evenements.map(e => ({ etat: 'EN_ATTENTE', tentatives: 0, prochainEssai: new Date(0), verrouJusqua: null, ...e }))
  return {
    lignes,
    async listerDus(maintenant, limite) {
      return lignes
        .filter(l => l.etat === 'EN_ATTENTE' && l.prochainEssai <= maintenant && (!l.verrouJusqua || l.verrouJusqua < maintenant))
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, limite)
        .map(l => ({ ...l }))
    },
    async aUnPrecedentEnAttente(e) {
      return lignes.some(l => l.orderId === e.orderId && l.etat === 'EN_ATTENTE' && l.createdAt < e.createdAt)
    },
    async reserver(id, maintenant, jusqua) {
      const l = lignes.find(x => x.id === id)
      if (!l || l.etat !== 'EN_ATTENTE' || (l.verrouJusqua && l.verrouJusqua >= maintenant)) return false
      l.verrouJusqua = jusqua
      return true
    },
    async marquerLivre(id, tentatives, code) { Object.assign(lignes.find(x => x.id === id), { etat: 'LIVRE', tentatives, code, verrouJusqua: null }) },
    async programmerRelance(id, tentatives, prochainEssai, code, erreur) { Object.assign(lignes.find(x => x.id === id), { tentatives, prochainEssai, code, erreur, verrouJusqua: null }) },
    async marquerEchec(id, tentatives, code, erreur) { Object.assign(lignes.find(x => x.id === id), { etat: 'ECHEC', tentatives, code, erreur, verrouJusqua: null }) },
  }
}

/** Faux fetch : renvoie les réponses dans l'ordre et mémorise chaque requête. */
function fauxFetch(...reponses) {
  const appels = []
  const fn = async (url, init) => {
    appels.push({ url, ...init })
    const r = reponses[Math.min(appels.length - 1, reponses.length - 1)]
    if (r instanceof Error) throw r
    return { status: r, text: async () => `{"code":${r}}` }
  }
  fn.appels = appels
  return fn
}

function horloge(depart = Date.UTC(2026, 10, 15, 10, 0, 0)) {
  let t = depart
  const f = () => new Date(t)
  f.avancer = ms => { t += ms }
  return f
}

const evt = (id, orderId, createdAt, corps = '{"order_id":"x","status":"Livrée","updated_at":"2026-11-15T10:00:00.000Z"}') =>
  ({ id, orderId, corps, createdAt: new Date(createdAt) })

beforeEach(() => _reinitialiserAvertissement())

// ── 1. Signature : vecteur de test fixe ─────────────────────────────────────

test('1. la signature correspond au vecteur de test fixe (calculé avec openssl)', () => {
  const corps = '{"order_id":"CABA-10452","status":"Expédiée","updated_at":"2026-11-14T17:20:00.000Z"}'
  assert.equal(
    signer('whsec_test_secret', '1763140800', 'evt_test_0001', corps),
    '5cf75b4403f68c6654b51c5ca4105fa5bd78b8956995eaf9308fb4155490b6d6',
  )
})

// ── 2. Corps envoyé = corps signé ───────────────────────────────────────────

test('2. le corps envoyé est exactement la chaîne stockée et signée', async () => {
  const corps = JSON.stringify(construireCorps(COMMANDE, 'EXPEDIEE', new Date('2026-11-14T17:20:00Z')))
  const file = fileMemoire([evt('evt_a', 'cmd_1', 1, corps)])
  const fetch = fauxFetch(200)
  await traiterFile(file, { config: CONFIG, fetch, maintenant: horloge(), log: silencieux })

  const [appel] = fetch.appels
  assert.equal(appel.method, 'POST')
  assert.equal(appel.url, CONFIG.url)
  assert.equal(typeof appel.body, 'string')
  assert.equal(appel.body, corps)
  const h = appel.headers
  assert.equal(h['Content-Type'], 'application/json')
  assert.equal(h['X-Flowmerce-Key'], 'flk_test')
  assert.equal(h['X-Flowmerce-Event-Id'], 'evt_a')
  assert.match(h['X-Flowmerce-Timestamp'], /^\d{10}$/)
  const attendu = createHmac('sha256', CONFIG.secret).update(`${h['X-Flowmerce-Timestamp']}.evt_a.${appel.body}`).digest('hex')
  assert.equal(h['X-Flowmerce-Signature'], attendu)
})

test('2b. contenu du corps : libellé tel quel, champs inconnus omis, téléphone au format international', () => {
  const corps = construireCorps(COMMANDE, 'EXPEDIEE', new Date('2026-11-14T17:20:00Z'))
  assert.deepEqual(corps, {
    order_id: 'cmd_1',
    status: 'Expédiée',
    updated_at: '2026-11-14T17:20:00.000Z',
    customer: { name: 'Amine B.', email: 'amine@example.com', phone: '+213550000000', language: 'ar' },
    items: [{ name: 'Chaussure X (Noir, 39)', qty: 1 }],
  })
  const minimal = construireCorps({ id: 'c2', langue: 'en', user: { email: '  ', telephone: null }, items: [] }, 'LIVREE', new Date(0))
  assert.deepEqual(minimal, { order_id: 'c2', status: 'Livrée', updated_at: '1970-01-01T00:00:00.000Z' })
})

// ── 3. Un changement de statut = un seul événement ──────────────────────────

test('3. un changement de statut crée un seul événement, avec son propre identifiant', async () => {
  const ecrits = []
  const tx = {
    order: { findMany: async () => [COMMANDE] },
    flowmerceStatusEvent: { createMany: async ({ data }) => { ecrits.push(...data) } },
  }
  const changeLe = new Date('2026-11-14T17:20:00Z')
  const ids = await enregistrerChangementsStatut(tx, [{ orderId: 'cmd_1', statut: 'EXPEDIEE', changeLe }], CONFIG)

  assert.equal(ecrits.length, 1)
  assert.deepEqual(ids, [ecrits[0].id])
  assert.match(ecrits[0].id, /^evt_[0-9a-f-]{36}$/)
  assert.equal(ecrits[0].statut, 'EXPEDIEE')
  assert.equal(JSON.parse(ecrits[0].corps).updated_at, changeLe.toISOString())

  // Deux changements distincts → deux identifiants distincts
  await enregistrerChangementsStatut(tx, [{ orderId: 'cmd_1', statut: 'LIVREE', changeLe }], CONFIG)
  assert.equal(ecrits.length, 2)
  assert.notEqual(ecrits[0].id, ecrits[1].id)
})

// ── 4. 200 et 409 → livré ───────────────────────────────────────────────────

for (const code of [200, 409]) {
  test(`4. une réponse ${code} marque l'événement comme livré, sans renvoi`, async () => {
    const file = fileMemoire([evt('evt_a', 'cmd_1', 1)])
    const fetch = fauxFetch(code)
    const h = horloge()
    const bilan = await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux })
    assert.equal(bilan.livres, 1)
    assert.equal(file.lignes[0].etat, 'LIVRE')
    h.avancer(48 * 3600_000)
    await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux })
    assert.equal(fetch.appels.length, 1)
  })
}

// ── 5. 500 et timeout → relance, même identifiant, signature recalculée ────

for (const [nom, premier] of [['500', 500], ['un timeout', Object.assign(new Error('délai'), { name: 'TimeoutError' })]]) {
  test(`5. ${nom} déclenche une relance avec le même identifiant et une signature recalculée`, async () => {
    const file = fileMemoire([evt('evt_a', 'cmd_1', 1)])
    const fetch = fauxFetch(premier, 200)
    const h = horloge()

    await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux })
    assert.equal(file.lignes[0].etat, 'EN_ATTENTE')
    assert.equal(file.lignes[0].tentatives, 1)

    // Pas de renvoi avant l'échéance du délai
    await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux })
    assert.equal(fetch.appels.length, 1)

    h.avancer(2 * 60_000)
    await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux })
    assert.equal(fetch.appels.length, 2)
    const [a, b] = fetch.appels
    assert.equal(b.headers['X-Flowmerce-Event-Id'], a.headers['X-Flowmerce-Event-Id'])
    assert.equal(b.body, a.body)
    assert.notEqual(b.headers['X-Flowmerce-Timestamp'], a.headers['X-Flowmerce-Timestamp'])
    assert.notEqual(b.headers['X-Flowmerce-Signature'], a.headers['X-Flowmerce-Signature'])
    assert.equal(file.lignes[0].etat, 'LIVRE')
  })
}

test('5b. le nombre de tentatives est borné puis l\'événement passe en échec définitif', async () => {
  const file = fileMemoire([evt('evt_a', 'cmd_1', 1)])
  const fetch = fauxFetch(503)
  const h = horloge()
  for (let i = 0; i < MAX_TENTATIVES + 3; i++) {
    await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux })
    h.avancer(48 * 3600_000)
  }
  assert.equal(fetch.appels.length, MAX_TENTATIVES)
  assert.equal(file.lignes[0].etat, 'ECHEC')
})

// ── 6. 400, 401, 403 → pas de relance ───────────────────────────────────────

for (const code of [400, 401, 403]) {
  test(`6. une réponse ${code} ne déclenche pas de relance`, async () => {
    const file = fileMemoire([evt('evt_a', 'cmd_1', 1)])
    const fetch = fauxFetch(code)
    const h = horloge()
    const erreurs = []
    const log = { ...silencieux, error: (...a) => erreurs.push(a.map(String).join(' ')) }
    await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log })
    h.avancer(48 * 3600_000)
    await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log })
    assert.equal(fetch.appels.length, 1)
    assert.equal(file.lignes[0].etat, 'ECHEC')
    assert.equal(erreurs.length, 1)
    if (code === 401) assert.match(erreurs[0], /ALERTE/)
    // Jamais de secret, de clé ni de signature dans les logs
    const sig = fetch.appels[0].headers['X-Flowmerce-Signature']
    for (const e of erreurs) for (const s of [CONFIG.secret, CONFIG.apiKey, sig]) assert.ok(!e.includes(s))
  })
}

test('6b. correspondance code HTTP → action', () => {
  assert.equal(interpreterReponse(201).issue, 'livre')
  assert.equal(interpreterReponse(429).issue, 'relance')
  assert.equal(interpreterReponse(502).issue, 'relance')
  assert.equal(interpreterReponse(404).issue, 'echec')
})

// ── 7. Un échec de Flowmerce ne fait pas échouer le changement de statut ───

test('7. un échec de Flowmerce ou de la base ne remonte jamais au changement de statut', async () => {
  // Le changement de statut et l'événement sont écrits d'abord (transaction) …
  const ecrits = []
  const tx = { order: { findMany: async () => [COMMANDE] }, flowmerceStatusEvent: { createMany: async ({ data }) => { ecrits.push(...data) } } }
  await enregistrerChangementsStatut(tx, [{ orderId: 'cmd_1', statut: 'ANNULEE', changeLe: new Date() }], CONFIG)

  // … puis l'envoi, qui échoue : il se termine normalement et garde l'événement en file.
  const file = fileMemoire([{ ...ecrits[0], createdAt: new Date(1) }])
  const bilan = await traiterFile(file, { config: CONFIG, fetch: fauxFetch(new TypeError('fetch failed')), log: silencieux })
  assert.equal(bilan.relances, 1)
  assert.equal(file.lignes[0].etat, 'EN_ATTENTE')

  // Base indisponible pendant l'envoi : pas d'exception non plus.
  const casse = { ...file, listerDus: async () => { throw new Error('base indisponible') } }
  await assert.doesNotReject(traiterFile(casse, { config: CONFIG, fetch: fauxFetch(200), log: silencieux }))
})

// ── 8. Variables d'environnement absentes ───────────────────────────────────

test('8. variables absentes : envoi désactivé avec avertissement, rien écrit ni envoyé', async () => {
  const avertissements = []
  const log = { warn: m => avertissements.push(m) }
  assert.equal(lireConfig({ FLOWMERCE_API_KEY: 'flk_x' }, log), null)
  assert.equal(avertissements.length, 1)
  assert.match(avertissements[0], /FLOWMERCE_WEBHOOK_URL/)
  assert.match(avertissements[0], /FLOWMERCE_STATUS_WEBHOOK_SECRET/)
  assert.ok(!avertissements[0].includes('flk_x'))
  assert.equal(lireConfig({ FLOWMERCE_API_KEY: 'flk_x' }, log), null)
  assert.equal(avertissements.length, 1, 'avertissement journalisé une seule fois')

  let ecritures = 0
  const tx = { order: { findMany: async () => [COMMANDE] }, flowmerceStatusEvent: { createMany: async () => { ecritures++ } } }
  assert.deepEqual(await enregistrerChangementsStatut(tx, [{ orderId: 'cmd_1', statut: 'LIVREE', changeLe: new Date() }], null), [])
  assert.equal(ecritures, 0)

  const fetch = fauxFetch(200)
  const bilan = await traiterFile(fileMemoire([evt('evt_a', 'cmd_1', 1)]), { config: null, fetch, log: silencieux })
  assert.equal(bilan.desactive, true)
  assert.equal(fetch.appels.length, 0)

  assert.equal(lireConfig({ FLOWMERCE_WEBHOOK_URL: 'ftp://x', FLOWMERCE_API_KEY: 'k', FLOWMERCE_STATUS_WEBHOOK_SECRET: 's' }, { warn() {} }), null)
})

// ── Fiabilité : workers concurrents et ordre par commande ──────────────────

test('deux workers simultanés n\'envoient pas le même événement', async () => {
  const file = fileMemoire([evt('evt_a', 'cmd_1', 1)])
  const fetch = fauxFetch(200)
  const h = horloge()
  await Promise.all([
    traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux }),
    traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux }),
  ])
  assert.equal(fetch.appels.length, 1)
})

test('les événements d\'une même commande partent dans l\'ordre', async () => {
  const file = fileMemoire([evt('evt_2', 'cmd_1', 2), evt('evt_1', 'cmd_1', 1), evt('evt_x', 'cmd_2', 3)])
  const fetch = fauxFetch(500, 200)
  const h = horloge()
  await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux })
  // evt_1 échoue → evt_2 (même commande) attend ; evt_x (autre commande) part.
  assert.deepEqual(fetch.appels.map(a => a.headers['X-Flowmerce-Event-Id']), ['evt_1', 'evt_x'])
  h.avancer(2 * 60_000)
  await traiterFile(file, { config: CONFIG, fetch, maintenant: h, log: silencieux })
  assert.deepEqual(fetch.appels.map(a => a.headers['X-Flowmerce-Event-Id']), ['evt_1', 'evt_x', 'evt_1', 'evt_2'])
})
