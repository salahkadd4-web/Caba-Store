'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AndroidBackButton() {
  const router = useRouter()

  useEffect(() => {
    let App: typeof import('@capacitor/app').App | null = null

    const init = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app')
        App = CapApp

        App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
          if (canGoBack) {
            router.back()
          } else {
            App?.exitApp()
          }
        })
      } catch {
        // Pas sur mobile, on ignore
      }
    }

    init()

    return () => {
      App?.removeAllListeners()
    }
  }, [router])

  return null
}