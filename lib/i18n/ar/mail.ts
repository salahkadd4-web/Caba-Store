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
  subscription: {
    thresholds: {
      '25': { titre: '📅 تذكير بالاشتراك — يتبقى 75%', urgence: 'للعلم' },
      '50': { titre: '⏳ تذكير بالاشتراك — يتبقى 50%', urgence: 'في منتصف مدة اشتراكك' },
      '75': { titre: '⚠️ اشتراكك يقترب من الانتهاء — يتبقى 25%', urgence: 'فكّر في التجديد' },
      '90': { titre: '🚨 اشتراكك على وشك الانتهاء — يتبقى 10%', urgence: 'إجراء عاجل مطلوب' },
    },
    adminLevel: 'مستوى المشرف',
    levelPerMonth: (label: string, price: string) => `${label} — ${price}/شهريًا`,
    hello: 'مرحبًا',
    approaching: (shop: string, level: string) =>
      `يقترب اشتراك متجرك <strong>${shop}</strong> (<strong>${level}</strong>) من تاريخ انتهائه.`,
    subscription: 'الاشتراك',
    expirationDate: 'تاريخ الانتهاء',
    daysLeft: 'الأيام المتبقية',
    days: (n: number) => `${n} يوم`,
    hiddenWarning: 'دون تجديد، ستُخفى منتجاتك من المتجر <strong>فور انتهاء اشتراكك</strong>.',
    renew: 'تجديد اشتراكي',
    footer: 'كابا ستور • يُرسل هذا البريد تلقائيًا، يرجى عدم الرد.',
  },
}

export default mail
