import type fr from '../fr/api'

const api: typeof fr = {
  unauthorized: 'Unauthorized',
  unauthenticated: 'Not signed in',
  invalidRequest: 'Invalid request',
  forbidden: 'Access denied',
  notFound: 'Not found',
  serverError: 'Server error',
  invalidData: 'Invalid data',
  userNotFound: 'User not found',
  lastNameRequired: 'Last name is required',
  firstNameRequired: 'First name is required',
  passwordRequiredToConfirm: 'Password is required to confirm the changes',
  wrongPassword: 'Incorrect password',
  confirmationCodeRequired: 'Confirmation code is required',
  codeInvalidOrExpired: 'Incorrect or expired code',
  phoneAlreadyUsed: 'This number is already in use',
  profileUpdated: 'Profile updated',
}

export default api
