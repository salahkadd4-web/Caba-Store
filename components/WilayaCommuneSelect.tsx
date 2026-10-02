'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/components/I18nProvider'
import {
  WILAYAS, loadCommunes, normalizeWilayaCode, wilayaLabel, type CommunesByWilaya,
} from '@/lib/algeria'

/**
 * Sélecteurs Wilaya → Commune en cascade (données : public/Wilaya_Commune_{FR,AR}.json).
 * Le style est fourni par la page appelante pour rester cohérent avec ses autres champs.
 *
 * `wilaya` accepte un code ("16") ou une ancienne valeur texte ("Alger") ;
 * la valeur émise est toujours un code.
 */
export default function WilayaCommuneSelect({
  wilaya,
  commune,
  onChange,
  required = false,
  selectClassName,
  labelClassName,
  labelPrefix,
  className = 'grid grid-cols-1 sm:grid-cols-2 gap-5',
}: {
  wilaya: string
  commune: string
  onChange: (value: { wilaya: string; commune: string }) => void
  required?: boolean
  selectClassName: string
  labelClassName: string
  /** Icône ou élément affiché avant chaque libellé (optionnel). */
  labelPrefix?: React.ReactNode
  className?: string
}) {
  const { t, locale } = useI18n()
  const a = t.address
  const [communes, setCommunes] = useState<CommunesByWilaya | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadCommunes(locale)
      .then(data => { if (!cancelled) { setCommunes(data); setLoadError(false) } })
      .catch(() => { if (!cancelled) setLoadError(true) })
    return () => { cancelled = true }
  }, [locale])

  const code = normalizeWilayaCode(wilaya) ?? ''
  const list = code && communes ? communes[code] ?? [] : []
  // Commune enregistrée absente de la liste (autre langue, ancienne donnée) : on la garde visible.
  const extra = commune && !list.includes(commune) ? commune : null

  const required_ = required ? ' *' : ''

  return (
    <div className={className}>
      <div>
        <label className={labelClassName}>
          {labelPrefix}{a.wilaya}{required_}
        </label>
        <select
          value={code}
          required={required}
          onChange={e => onChange({ wilaya: e.target.value, commune: '' })}
          className={selectClassName}
        >
          <option value="">{a.selectWilaya}</option>
          {WILAYAS.map(w => (
            <option key={w.code} value={w.code}>{wilayaLabel(w, locale)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClassName}>
          {labelPrefix}{a.commune}{required_}
        </label>
        <select
          value={commune}
          required={required}
          disabled={!code || (!communes && !loadError)}
          onChange={e => onChange({ wilaya: code, commune: e.target.value })}
          className={`${selectClassName} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">
            {!code ? a.chooseWilayaFirst : loadError ? a.loadError : !communes ? t.common.loading : a.selectCommune}
          </option>
          {extra && <option value={extra}>{extra}</option>}
          {list.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  )
}
