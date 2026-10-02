import type fr from '../fr/password'

const password: typeof fr = {
  rules: {
    length: '8 أحرف على الأقل',
    upper: 'حرف كبير واحد على الأقل',
    lower: 'حرف صغير واحد على الأقل',
    number: 'رقم واحد على الأقل',
    special: 'رمز خاص واحد على الأقل',
  },
}

export default password
