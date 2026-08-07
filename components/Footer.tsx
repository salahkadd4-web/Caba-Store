import Link from 'next/link'
import { auth } from '@/auth'
import CabaLogo from '@/components/CabaLogo'
import { Mail, Phone, MapPin, ShieldCheck, Truck, RotateCcw } from 'lucide-react'

const navLinks = [
  { href: '/produits',   label: 'Produits' },
  { href: '/categories', label: 'Catégories' },
  { href: '/recherche',  label: 'Recherche' },
]

const accountLinks = [
  { href: '/connexion',   label: 'Connexion' },
  { href: '/inscription', label: 'Inscription' },
]

const supportLinks = [
  { href: '/mes-retours',   label: 'Retours' },
  { href: '/mes-commandes', label: 'Mes commandes' },
  { href: '/favoris',       label: 'Mes favoris' },
]

export default async function Footer() {
  const session = await auth()

  return (
    <footer className="bg-stone-900 dark:bg-black text-stone-300 border-t border-stone-800">
      {/* ── Bandeau garanties ── */}
      <div className="bg-stone-950 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
          {[
            { Icon: Truck,       title: 'Livraison 48h',    desc: 'Partout en Algérie' },
            { Icon: ShieldCheck, title: 'Paiement sécurisé', desc: 'Payez à la livraison' },
            { Icon: RotateCcw,   title: 'Retours gratuits',  desc: '14 jours pour changer d’avis' },
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
            Vos produits préférés, livrés rapidement partout en Algérie.
          </p>
        </div>

        {/* Navigation */}
        <FooterColumn title="Navigation" links={navLinks} />

        {/* Support */}
        <FooterColumn title="Support" links={supportLinks} />

        {/* Compte ou contact */}
        {session?.user ? (
          <FooterContact />
        ) : (
          <FooterColumn title="Mon compte" links={accountLinks} />
        )}
      </div>

      {/* ── Bas de page ── */}
      <div className="border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} CabaStore. Tous droits réservés.</p>
          <p>Fait avec soin en Algérie.</p>
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

function FooterContact() {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-4">Contact</h4>
      <ul className="space-y-2.5 text-sm text-stone-400">
        <li className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-orange-400 shrink-0" />
          <a href="mailto:contact@caba-store.com" className="hover:text-orange-400 transition-colors">cabastoredz31@gmail.com</a>
        </li>
        <li className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-orange-400 shrink-0" />
          <span>+213 6 71 86 07 85</span>
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
          <span>Algérie</span>
        </li>
      </ul>
    </div>
  )
}
