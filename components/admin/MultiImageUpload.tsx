'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useI18n } from '@/components/I18nProvider'
import { usePhotoPicker } from '@/components/PhotoPicker'
import { FolderOpen, X } from 'lucide-react'

interface MultiImageUploadProps {
  values: string[]
  onChange: (urls: string[]) => void
  label?: string
}

export default function MultiImageUpload({ values, onChange, label }: MultiImageUploadProps) {
  const { t } = useI18n()
  const u = t.pm.upload
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files: File[]) => {
    setUploading(true)
    try {
      const uploadedUrls: string[] = []

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (res.ok) {
          uploadedUrls.push(data.url)
        }
      }

      onChange([...values, ...uploadedUrls])
    } catch {
      console.error('Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  const { open, picker } = usePhotoPicker({ onFiles: handleFiles, multiple: true })

  const removeImage = (index: number) => {
    const newValues = values.filter((_, i) => i !== index)
    onChange(newValues)
  }

  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">{label ?? u.images}</label>

      {/* Images existantes */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {values.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative w-full h-24">
                <Image
                  src={url}
                  alt={`image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 33vw, 200px"
                  className="object-cover rounded-lg border border-stone-200 dark:border-stone-700"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 end-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              ><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Zone upload */}
      <div
        onClick={open}
        className="border-2 border-dashed border-stone-300 dark:border-stone-600 hover:border-orange-400 rounded-xl p-4 cursor-pointer transition-colors text-center flex flex-col items-center text-stone-400"
      >
        <FolderOpen className="w-6 h-6 mb-1" />
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {uploading ? u.uploading : u.clickToAdd}
        </p>
        <p className="text-xs text-stone-400 mt-1">{u.multipleAllowed}</p>
      </div>

      {picker}
    </div>
  )
}
