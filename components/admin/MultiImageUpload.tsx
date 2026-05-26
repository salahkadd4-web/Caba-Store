'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { FolderOpen, X } from 'lucide-react'

interface MultiImageUploadProps {
  values: string[]
  onChange: (urls: string[]) => void
  label?: string
}

export default function MultiImageUpload({ values, onChange, label = 'Images' }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

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

  const removeImage = (index: number) => {
    const newValues = values.filter((_, i) => i !== index)
    onChange(newValues)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

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
                  className="object-cover rounded-lg border"
                />
              </div>
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              ><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Zone upload */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-xl p-4 cursor-pointer transition-colors text-center"
      >
        <p className="text-2xl mb-1"><FolderOpen className="w-6 h-6" /></p>
        <p className="text-sm text-gray-500">
          {uploading ? 'Upload en cours...' : 'Cliquez pour ajouter des images'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Plusieurs images possibles</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}