'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, FileText, Image as ImageIcon } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { useIsMobile } from '@/lib/hooks/useIsMobile'
import { btnSecondary } from '@/lib/dashboard-ui'

/**
 * Choix de la source d'une photo : caméra ou galerie.
 *
 * Sur mobile (et toujours dans l'app Capacitor), `open()` affiche un menu en bas
 * d'écran. Sur ordinateur, il ouvre directement le sélecteur de fichiers.
 * Deux champs fichier sont nécessaires : dans la WebView Android, un champ avec
 * `capture` + accept="image/*" ouvre la caméra seule, un champ sans `capture`
 * ouvre la galerie / les fichiers seuls.
 *
 * Les photos trop lourdes (souvent 4 à 10 Mo en sortie d'appareil photo) sont
 * réduites avant d'être transmises, pour passer les limites d'upload.
 */

const MAX_DIMENSION   = 2000
const MAX_BYTES_AS_IS = 1.5 * 1024 * 1024
const QUALITY         = 0.85
const RESIZABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function prepareImage(file: File): Promise<File> {
  if (!RESIZABLE_TYPES.includes(file.type)) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale  = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= MAX_BYTES_AS_IS) { bitmap.close(); return file }

    const canvas  = document.createElement('canvas')
    canvas.width  = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    // PNG / WebP → WebP pour garder la transparence ; photos → JPEG.
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, QUALITY))
    if (!blob || blob.size >= file.size) return file

    // Le navigateur peut ignorer le type demandé (ex. Safari sans WebP → PNG) : on suit blob.type.
    const ext  = blob.type === 'image/jpeg' ? '.jpg' : blob.type === 'image/webp' ? '.webp' : '.png'
    const name = file.name.replace(/\.[^.]+$/, '') + ext
    return new File([blob], name, { type: blob.type, lastModified: Date.now() })
  } catch {
    return file
  }
}

export function usePhotoPicker({
  onFiles,
  accept = 'image/*',
  multiple = false,
  allowsDocuments = false,
}: {
  onFiles: (files: File[]) => void
  /** Types acceptés par le choix galerie / fichiers. La caméra produit toujours une image. */
  accept?: string
  multiple?: boolean
  /** Le choix galerie accepte aussi des documents (PDF) : libellé « Choisir un fichier ». */
  allowsDocuments?: boolean
}) {
  const { t }      = useI18n()
  const p          = t.common.photo
  const isMobile   = useIsMobile()
  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const open = () => {
    if (isMobile) setSheetOpen(true)
    else galleryRef.current?.click()
  }

  const pick = (ref: React.RefObject<HTMLInputElement | null>) => {
    setSheetOpen(false)
    ref.current?.click()
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (files.length === 0) return
    onFiles(await Promise.all(files.map(prepareImage)))
  }

  const rowCls =
    'w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 ' +
    'hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors active:scale-[0.98]'

  const GalleryIcon = allowsDocuments ? FileText : ImageIcon

  const picker = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <input ref={galleryRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={handleChange} />

      {sheetOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end justify-center"
          onClick={e => { if (e.target === e.currentTarget) setSheetOpen(false) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={p.addTitle}
            className="w-full max-w-md bg-[#FAF7F2] dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 rounded-t-2xl shadow-2xl px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <p className="px-3 pb-2 text-xs font-medium text-stone-500 dark:text-stone-400">{p.addTitle}</p>
            <button type="button" onClick={() => pick(cameraRef)} className={rowCls}>
              <Camera className="w-5 h-5 text-orange-700 dark:text-orange-400" />
              {p.takePhoto}
            </button>
            <button type="button" onClick={() => pick(galleryRef)} className={rowCls}>
              <GalleryIcon className="w-5 h-5 text-orange-700 dark:text-orange-400" />
              {allowsDocuments ? p.chooseFile : p.chooseFromGallery}
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className={`w-full mt-2 ${btnSecondary}`}
            >
              {t.common.cancel}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )

  return { open, picker }
}
