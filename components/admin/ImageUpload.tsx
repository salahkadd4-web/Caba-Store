'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { FolderOpen } from 'lucide-react'

interface ImageUploadProps {
  value: string        // URL actuelle
  onChange: (url: string) => void
  label?: string
}

export default function ImageUpload({ value, onChange, label = 'Image' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 hover:border-purple-400 rounded-xl p-4 cursor-pointer transition-colors text-center"
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
                  <p className="text-white text-sm">Upload en cours...</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">Cliquez pour changer</p>
          </div>
        ) : (
          <div className="py-6">
            <p className="text-3xl mb-2"><FolderOpen className="w-6 h-6" /></p>
            <p className="text-sm text-gray-500">
              {uploading ? 'Upload en cours...' : 'Cliquez pour choisir une image'}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}