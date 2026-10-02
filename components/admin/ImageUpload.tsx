'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useI18n } from '@/components/I18nProvider'
import { usePhotoPicker } from '@/components/PhotoPicker'
import { FolderOpen } from 'lucide-react'

interface ImageUploadProps {
  value: string        // URL actuelle
  onChange: (url: string) => void
  label?: string
}

export default function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const { t } = useI18n()
  const u = t.pm.upload
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(value)

  const handleFile = async (file: File) => {
    // Preview local
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        onChange(data.url)
        setPreview(data.url)
      } else {
        console.error('Erreur upload:', data.error)
      }
    } catch {
      console.error('Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  const { open, picker } = usePhotoPicker({ onFiles: files => { if (files[0]) handleFile(files[0]) } })

  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">{label ?? u.image}</label>

      <div
        onClick={open}
        className="border-2 border-dashed border-stone-300 dark:border-stone-600 hover:border-orange-400 rounded-xl p-4 cursor-pointer transition-colors text-center"
      >
        {preview ? (
          <div>
            <div className="relative w-full h-40">
              <Image
                src={preview}
                alt="preview"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized={preview.startsWith('blob:')}
                className="object-cover rounded-lg"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                  <p className="text-white text-sm">{u.uploading}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-2">{u.clickToChange}</p>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center text-stone-400">
            <FolderOpen className="w-6 h-6 mb-2" />
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {uploading ? u.uploading : u.clickToChoose}
            </p>
            <p className="text-xs text-stone-400 mt-1">JPG, PNG, WEBP</p>
          </div>
        )}
      </div>

      {picker}
    </div>
  )
}
