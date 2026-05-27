import { NextResponse } from 'next/server'

// Le système de scan produit a été supprimé.
export async function GET() {
  return NextResponse.json({ total_scans: 0, scans: [] })
}