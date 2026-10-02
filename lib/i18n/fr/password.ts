/** Règles de mot de passe (inscription, profil, réinitialisation). */
const password = {
  rules: {
    length: 'Au moins 8 caractères',
    upper: 'Au moins une lettre majuscule',
    lower: 'Au moins une lettre minuscule',
    number: 'Au moins un chiffre',
    special: 'Au moins un caractère spécial',
  },
}

export default password
