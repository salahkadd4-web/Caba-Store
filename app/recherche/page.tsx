import SearchBar from '@/components/client/SearchBar'

export default function RecherchePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-6">Recherche</h1>
      <SearchBar />
    </div>
  )
}