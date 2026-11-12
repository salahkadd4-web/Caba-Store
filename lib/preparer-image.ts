/**
 * lib/preparer-image.ts
 * ---------------------
 * Réduit une photo dans le navigateur avant l'envoi à /api/upload.
 *
 * Pourquoi : une photo de téléphone pèse souvent 3 à 8 Mo. Au-delà de 4,5 Mo,
 * Vercel refuse la requête avant même l'API (limite des fonctions), et l'API
 * refuse au-delà de 5 Mo. Cloudinary ramène de toute façon l'image à 1200 px à
 * l'upload : envoyer 1600 px au plus ne perd rien et accélère l'envoi en 3G/4G.
 *
 * Sans dépendance (canvas natif). En cas d'échec, ou si le résultat n'est pas
 * plus léger, le fichier d'origine est envoyé tel quel. Les GIF (animés) ne
 * sont jamais retouchés. L'API garde ses propres contrôles (type, taille, octets).
 */

const MAX_COTE = 1600            // px, côté le plus long
const ENVOI_DIRECT = 1_000_000   // ≤ 1 Mo et ≤ 1600 px : envoyée sans retouche
const QUALITE = 0.86

function versBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, QUALITE))
}

export async function preparerImagePourUpload(file: File): Promise<File> {
  if (typeof window === 'undefined' || typeof createImageBitmap !== 'function') return file
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const echelle = Math.min(1, MAX_COTE / Math.max(bitmap.width, bitmap.height))
    if (echelle === 1 && file.size <= ENVOI_DIRECT) return file

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * echelle)
    canvas.height = Math.round(bitmap.height * echelle)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    // WebP garde la transparence ; navigateur sans encodeur WebP → JPEG sur fond blanc.
    let blob = await versBlob(canvas, 'image/webp')
    if (!blob || blob.type !== 'image/webp') {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      blob = await versBlob(canvas, 'image/jpeg')
    }
    if (!blob || blob.size >= file.size) return file

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const nom = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${nom}.${ext}`, { type: blob.type, lastModified: Date.now() })
  } catch {
    return file
  } finally {
    bitmap.close()
  }
}
