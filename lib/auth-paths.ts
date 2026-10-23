/** Pages de compte (connexion, inscription et ses étapes, mot de passe oublié). */
export function isAuthPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return (
    pathname.startsWith('/connexion') ||
    pathname.startsWith('/inscription') ||
    pathname.startsWith('/recuperer-mot-de-passe')
  )
}
