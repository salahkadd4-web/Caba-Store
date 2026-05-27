import { auth }     from '@/auth'
import { redirect } from 'next/navigation'

/**
 * Layout (client) — auth-guard serveur.
 * Toutes les routes du groupe (favoris, panier, commandes, retours, profil)
 * nécessitent une session active. Un utilisateur non connecté est redirigé
 * vers /connexion sans aucun flash côté client.
 *
 * Les admins et vendeurs connectés ont aussi accès (ils ont un compte client).
 */
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/connexion')
  }

  return <>{children}</>
}
