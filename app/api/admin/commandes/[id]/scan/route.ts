import { NextResponse } from 'next/server'

// Le système de scan produit a été supprimé.
export async function POST() {
  return NextResponse.json({ error: 'Fonctionnalité désactivée' }, { status: 410 })
}