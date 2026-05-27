export default function AdminLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-xl bg-stone-200 dark:bg-stone-700" />
        <div className="h-8 w-24 rounded-xl bg-stone-200 dark:bg-stone-700" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-stone-200 dark:bg-stone-700" />
            <div className="h-3 w-16 rounded bg-stone-200 dark:bg-stone-700" />
            <div className="h-7 w-12 rounded bg-stone-200 dark:bg-stone-700" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
        <div className="bg-stone-50 dark:bg-stone-800/60 px-5 py-3.5 flex gap-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-24 rounded bg-stone-200 dark:bg-stone-700" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-t border-stone-100 dark:border-stone-800 px-5 py-4 flex gap-8 items-center">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-4 w-32 rounded bg-stone-200 dark:bg-stone-700" />
              <div className="h-3 w-24 rounded bg-stone-100 dark:bg-stone-800" />
            </div>
            <div className="h-6 w-16 rounded-full bg-stone-200 dark:bg-stone-700" />
            <div className="h-4 w-20 rounded bg-stone-200 dark:bg-stone-700" />
            <div className="h-4 w-20 rounded bg-stone-200 dark:bg-stone-700" />
            <div className="h-4 w-12 rounded bg-stone-200 dark:bg-stone-700" />
          </div>
        ))}
      </div>
    </div>
  )
}
