import SearchBar from '@/components/client/SearchBar'
import { getI18n } from '@/lib/i18n/server'

export default async function RecherchePage() {
  const { t } = await getI18n()
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-6">{t.layout.nav.search}</h1>
      <SearchBar />
    </div>
  )
}