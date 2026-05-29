import { NextResponse } from 'next/server'

/**
 * GET /api/ping
 * Route ultra-légère utilisée par OfflineDetector pour vérifier
 * la connectivité réseau côté client (requête HEAD ou GET).
 */
export async function GET() {
  return new NextResponse(null, { status: 204 })
}

export async function HEAD() {
  return new NextResponse(null, { status: 204 })
}