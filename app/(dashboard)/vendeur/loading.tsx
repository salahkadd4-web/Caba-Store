export default function VendeurLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-xl bg-stone-200 dark:bg-stone-700" />
        <div className="h-9 w-24 rounded-xl bg-stone-200 dark:bg-stone-700" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="h-3 w-14 rounded bg-stone-200 dark:bg-stone-700" />
            <div className="h-8 w-10 rounded bg-stone-200 dark:bg-stone-700" />
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-t border-stone-100 dark:border-stone-800 first:border-t-0 px-5 py-4 flex gap-4 items-center">
            <div className="w-14 h-14 rounded-xl bg-stone-200 dark:bg-stone-700 shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 w-32 rounded bg-stone-200 dark:bg-stone-700" />
              <div className="h-3 w-20 rounded bg-stone-100 dark:bg-stone-800" />
            </div>
            <div className="h-6 w-16 rounded-full bg-stone-200 dark:bg-stone-700" />
          </div>
        ))}
      </div>
    </div>
  )
}
