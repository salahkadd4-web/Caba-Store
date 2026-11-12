import type fr from '../fr/mail'

const mail: typeof fr = {
  expires15: 'تنتهي صلاحية هذا الرمز خلال <strong>15 دقيقة</strong>.',
  reset: {
    subject: 'رمز إعادة تعيين كلمة المرور',
    title: 'إعادة تعيين كلمة المرور',
    yourCode: 'رمز إعادة التعيين الخاص بك هو:',
    ignore: 'إذا لم تطلب إعادة التعيين هذه، فتجاهل هذا البريد.',
  },
  confirm: {
    subject: 'أكّد تسجيلك',
    welcome: (prenom: string) => `مرحبًا ${prenom}!`,
    thanks: 'شكرًا لتسجيلك في متجرنا.',
    yourCode: 'رمز التأكيد الخاص بك هو:',
    ignore: 'إذا لم تقم بإنشاء حساب، فتجاهل هذا البريد.',
  },
  identity: {
    subject: 'رمز التأكيد — تعديل الملف الشخصي',
    hello: (prenom: string) => `مرحبًا ${prenom}،`,
    requested: 'لقد طلبت تعديل ملفك الشخصي.',
    yourCode: 'رمز التأكيد الخاص بك هو:',
    ignore: 'إذا لم تكن أنت من قام بهذا الطلب، فتجاهل هذا البريد.',
    userFallback: 'المستخدم',
  },
  billing: {
    hello: (prenom: string) => `مرحبًا ${prenom}،`,
    reminderSubject: (n: number) => `كابا ستور — بقي لك ${n} يوم لتسديد فاتورتك`,
    reminderTitle: (n: number) => `بقي لك ${n} يوم`,
    reminderIntro: (shop: string) =>
      `تذكير بسيط لمتجر <strong>${shop}</strong>: لديك فاتورة كابا ستور مستحقة الدفع.`,
    reminderNote: 'يمكنك الدفع عبر تحويل بنكي أو بريدي (CCP) أو نقدًا لدى الإدارة. تبقى منتجاتك معروضة حتى تاريخ الاستحقاق.',
    amountDue: 'المبلغ المستحق',
    dueDate: 'يُدفع قبل',
    daysLeft: 'الأيام المتبقية',
    days: (n: number) => `${n} يوم`,
    blockedSubject: 'كابا ستور — تم تجميد حسابك كبائع',
    blockedIntro: (shop: string) =>
      `انقضى أجل الدفع لمتجر <strong>${shop}</strong>: لم تعد منتجاتك معروضة.`,
    blockedNote: 'بمجرد أن تؤكد الإدارة دفعتك، يُرفع التجميد عن حسابك وتعود منتجاتك للظهور.',
    seeDetails: 'عرض اشتراكي',
    footer: 'كابا ستور • يُرسل هذا البريد تلقائيًا، يرجى عدم الرد.',
  },
}

export default mail
