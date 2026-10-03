import type fr from '../fr/password'

const password: typeof fr = {
  rules: {
    length: 'At least 8 characters',
    upper: 'At least one uppercase letter',
    lower: 'At least one lowercase letter',
    number: 'At least one number',
    special: 'At least one special character',
  },
}

export default password
