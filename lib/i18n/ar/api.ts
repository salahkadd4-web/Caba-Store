import type fr from '../fr/api'

const api: typeof fr = {
  unauthorized: 'غير مصرّح',
  unauthenticated: 'غير مسجّل الدخول',
  invalidRequest: 'طلب غير صالح',
  forbidden: 'الوصول مرفوض',
  notFound: 'غير موجود',
  serverError: 'خطأ في الخادم',
  invalidData: 'بيانات غير صالحة',
  userNotFound: 'المستخدم غير موجود',
  lastNameRequired: 'اللقب مطلوب',
  firstNameRequired: 'الاسم مطلوب',
  passwordRequiredToConfirm: 'كلمة المرور مطلوبة لتأكيد التعديلات',
  wrongPassword: 'كلمة المرور غير صحيحة',
  confirmationCodeRequired: 'رمز التأكيد مطلوب',
  codeInvalidOrExpired: 'الرمز غير صحيح أو منتهي الصلاحية',
  phoneAlreadyUsed: 'هذا الرقم مستخدم بالفعل',
  profileUpdated: 'تم تحديث الملف الشخصي',
}

export default api
