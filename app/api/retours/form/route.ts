// app/api/retours/form/route.ts — CabaStore
//
// GET — Récupère la définition du formulaire de retour auprès de Flowmerce.
// Flowmerce est l'unique source de vérité : Caba Store ne fait que renvoyer
// le JSON tel quel au client (le formulaire est ensuite construit dynamiquement).
//
// Aucun identifiant de boutique n'est transmis : la FLOWMERCE_API_KEY (Bearer)
// identifie la boutique chez Flowmerce.
//
// Le formulaire est mis en cache côté serveur (TTL 5 min, voir lib/flowmerce.ts)
// pour éviter un appel API Flowmerce à chaque ouverture.

import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/getAuthToken'
import { getReturnForm, FlowmerceError } from '@/lib/flowmerce'
import { rateLimit, rateLimits } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, rateLimits.api)
  if (limited) return limited

  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const form = await getReturnForm()
    return NextResponse.json({ form })
  } catch (err) {
    if (err instanceof FlowmerceError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[retours/form] erreur inattendue', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
