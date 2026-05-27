/**
 * Tokens de design partagés pour toutes les pages dashboard.
 * Palette : stone + orange (cohérente avec le côté client).
 */

// ─── Surfaces ──────────────────────────────────────────────────────────────────
export const card   = 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl'
export const cardSm = 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl'

// ─── Texte ─────────────────────────────────────────────────────────────────────
export const heading = 'text-xl md:text-2xl font-bold text-stone-800 dark:text-stone-100'
export const subtext = 'text-sm text-stone-500 dark:text-stone-400'
export const label   = 'text-xs font-medium text-stone-500 dark:text-stone-400'

// ─── Inputs / selects ──────────────────────────────────────────────────────────
export const inputCls =
  'w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 ' +
  'text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 ' +
  'rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ' +
  'dark:focus:ring-orange-500 transition'

export const selectCls =
  'border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 ' +
  'text-stone-700 dark:text-stone-200 rounded-xl px-3 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-orange-400 transition'

// ─── Boutons ───────────────────────────────────────────────────────────────────
export const btnPrimary =
  'bg-orange-700 hover:bg-orange-800 active:scale-95 text-white font-semibold ' +
  'px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50'

export const btnPrimaryPurple =
  'bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-semibold ' +
  'px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50'

export const btnPrimaryEmerald =
  'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold ' +
  'px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50'

export const btnSecondary =
  'border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 ' +
  'font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-stone-50 dark:hover:bg-stone-800 ' +
  'transition-all active:scale-95 disabled:opacity-50'

export const btnDanger =
  'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-semibold ' +
  'px-4 py-2.5 rounded-xl text-sm hover:bg-red-100 dark:hover:bg-red-900 ' +
  'transition-all active:scale-95'

export const btnDangerSolid =
  'bg-red-500 hover:bg-red-600 text-white font-semibold ' +
  'px-4 py-2.5 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50'

export const btnGhost =
  'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 ' +
  'hover:bg-stone-100 dark:hover:bg-stone-800 px-3 py-2 rounded-xl text-sm transition-all'

// ─── Tableaux ──────────────────────────────────────────────────────────────────
export const tableWrapper = `${card} overflow-hidden`
export const tableHead    = 'bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 font-semibold text-sm'
export const tableTh      = 'text-left px-5 py-3.5'
export const tableTd      = 'px-5 py-4'
export const tableRow     = 'border-t border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition'

// ─── Modales ───────────────────────────────────────────────────────────────────
export const modalOverlay = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4'
export const modalBox     = `bg-[#FAF7F2] dark:bg-stone-900 rounded-2xl shadow-2xl w-full border border-stone-200 dark:border-stone-800`

// ─── KPI cards ─────────────────────────────────────────────────────────────────
export const kpiCard =
  `${cardSm} p-4 flex flex-col gap-1 transition-all hover:border-stone-300 dark:hover:border-stone-600`
export const kpiCardDark =
  'bg-stone-900 dark:bg-stone-800 border border-stone-800 rounded-xl p-4 flex flex-col gap-1'

// ─── Badges statut commande ────────────────────────────────────────────────────
export const statutOrderColor: Record<string, string> = {
  EN_ATTENTE:     'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
  CONFIRMEE:      'bg-blue-100   dark:bg-blue-950   text-blue-700   dark:text-blue-300',
  EN_PREPARATION: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
  EXPEDIEE:       'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
  LIVREE:         'bg-green-100  dark:bg-green-950  text-green-700  dark:text-green-300',
  ANNULEE:        'bg-red-100    dark:bg-red-950    text-red-700    dark:text-red-300',
}

// ─── Separateur de section ─────────────────────────────────────────────────────
export const sectionHeading =
  'text-base font-bold text-stone-700 dark:text-stone-200 flex items-center gap-2 mb-3'

// ─── Toast ─────────────────────────────────────────────────────────────────────
export const toastCls =
  'fixed top-4 right-4 z-[100] bg-stone-900 dark:bg-stone-700 text-white text-sm ' +
  'px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2'

// ─── Loading placeholder ───────────────────────────────────────────────────────
export const loadingPage =
  'flex items-center justify-center py-20 text-stone-400 dark:text-stone-500 text-sm'
