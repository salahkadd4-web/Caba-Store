'use client'

/**
 * Panneau de marque des pages de compte (connexion, inscription, finalisation),
 * visible à partir de 1024 px : logo, une phrase, trois vrais produits du
 * catalogue et les points clés de la page.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { RotateCcw, Truck, Wallet, type LucideIcon } from 'lucide-react'
import CabaLogo from '@/components/CabaLogo'
import { useI18n } from '@/components/I18nProvider'

type Point = { icon: LucideIcon; text: string }

export default function AuthBrandPanel({ title, points }: { title?: string; points?: Point[] }) {
  const { t } = useI18n()
  const [images, setImages] = useState<string[]>([])

  // Trois produits du catalogue, chargés seulement quand le panneau est affiché (desktop)
  useEffect(() => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return
    let annule = false
    fetch('/api/produits/search')
      .then(r => (r.ok ? r.json() : []))
      .then((produits: { images: string[] }[]) => {
        if (!annule) setImages(produits.map(p => p.images[0]).filter(Boolean).slice(0, 3))
      })
      .catch(() => {})
    return () => { annule = true }
  }, [])

  const liste: Point[] = points ?? [Truck, Wallet, RotateCcw].map((icon, i) => ({ icon, text: t.home.trust[i].title }))

  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-between gap-10 bg-stone-900 dark:bg-stone-950 text-stone-100 p-12 xl:p-16 border-e border-stone-800">
      <Link href="/" className="flex items-center gap-2.5 w-max">
        <CabaLogo className="w-9 h-11 text-orange-500" />
        <span className="text-xl font-semibold tracking-tight">
          Caba<span className="text-orange-500">Store</span>
        </span>
      </Link>

      {/* Rien plutôt que des cases vides si le catalogue ne répond pas */}
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-4 max-w-md" aria-hidden="true">
          {images.map(src => (
            <div key={src} className="relative aspect-square rounded-2xl bg-white overflow-hidden">
              <Image src={src} alt="" fill sizes="160px" className="object-contain p-4" />
            </div>
          ))}
        </div>
      ) : <div />}

      <div className="space-y-5 max-w-md">
        <p className="text-3xl font-semibold leading-tight tracking-tight text-balance">
          {title ?? t.layout.footer.tagline}
        </p>
        <ul className="space-y-3">
          {liste.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-stone-300">
              <Icon className="w-5 h-5 shrink-0 text-orange-500" />
              <span className="text-[15px]">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
