import Link from 'next/link'
import { auth } from '@/auth'
import CabaLogo from '@/components/CabaLogo'
import { Mail, Phone, MapPin, ShieldCheck, Truck, RotateCcw } from 'lucide-react'
import { getI18n } from '@/lib/i18n/server'
import type { Dictionary } from '@/lib/i18n'

export default async function Footer() {
  const [session, { t }] = await Promise.all([auth(), getI18n()])
  const f = t.layout.footer

  const navLinks = [
    { href: '/produits',   label: t.layout.nav.products },
    { href: '/categories', label: t.layout.nav.categories },
    { href: '/recherche',  label: t.layout.nav.search },
  ]

  const accountLinks = [
    { href: '/connexion',   label: f.login },
    { href: '/inscription', label: f.register },
  ]

  const supportLinks = [
    { href: '/mes-retours',   label: f.returns },
    { href: '/mes-commandes', label: f.myOrders },
    { href: '/favoris',       label: f.myFavorites },
  ]

  return (
    <footer className="bg-stone-900 dark:bg-black text-stone-300 border-t border-stone-800">
      {/* ── Bandeau garanties ── */}
      <div className="bg-stone-950 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-start">
          {[
            { Icon: Truck,       title: f.delivery48,     desc: f.deliveryDesc },
            { Icon: ShieldCheck, title: f.securePayment,  desc: f.securePaymentDesc },
            { Icon: RotateCcw,   title: f.freeReturns,    desc: f.freeReturnsDesc },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="w-9 h-9 rounded-full bg-orange-950/40 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-100">{title}</p>
                <p className="text-xs text-stone-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Corps footer ── */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">

        {/* Identité */}
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-4 group">
            <CabaLogo className="h-9 w-9 text-orange-400 transition-transform group-hover:scale-105" />
            <span className="text-lg font-semibold tracking-tight text-white">
              Caba<span className="text-orange-400">Store</span>
            </span>
          </Link>
          <p className="text-sm text-stone-400 leading-relaxed">
            {f.tagline}
          </p>
        </div>

        {/* Navigation */}
        <FooterColumn title={f.navigation} links={navLinks} />

        {/* Support */}
        <FooterColumn title={f.support} links={supportLinks} />

        {/* Compte ou contact */}
        {session?.user ? (
          <FooterContact f={f} />
        ) : (
          <FooterColumn title={f.myAccount} links={accountLinks} />
        )}
      </div>

      {/* ── Bas de page ── */}
      <div className="border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} {f.rights}</p>
          <p>{f.madeIn}</p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(l => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-stone-400 hover:text-orange-400 transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FooterContact({ f }: { f: Dictionary['layout']['footer'] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-4">{f.contact}</h4>
      <ul className="space-y-2.5 text-sm text-stone-400">
        <li className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-orange-400 shrink-0" />
          <a href="mailto:contact@caba-store.com" className="hover:text-orange-400 transition-colors">cabastoredz31@gmail.com</a>
        </li>
        <li className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-orange-400 shrink-0" />
          <span dir="ltr">+213 6 71 86 07 85</span>
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
          <span>{f.algeria}</span>
        </li>
      </ul>
    </div>
  )
}
