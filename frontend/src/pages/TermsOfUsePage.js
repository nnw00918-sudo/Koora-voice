import React from 'react';

const TermsOfUsePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-lime-400 mb-6">شروط الاستخدام</h1>
        <p className="text-slate-400 mb-8">آخر تحديث: أبريل 2026</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">1. قبول الشروط</h2>
          <p className="text-slate-300 leading-relaxed">
            باستخدامك لتطبيق "صوت الكورة" (Koora Voice)، فإنك توافق على الالتزام بهذه الشروط والأحكام. 
            إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام التطبيق.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">2. وصف الخدمة</h2>
          <p className="text-slate-300 leading-relaxed">
            صوت الكورة هو تطبيق اجتماعي للمحادثات الصوتية والمرئية حول كرة القدم. 
            يتيح للمستخدمين إنشاء غرف صوتية، المشاركة في المحادثات، ومشاهدة البث المباشر.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">3. الاشتراكات والدفع</h2>
          <ul className="text-slate-300 space-y-3 list-disc list-inside">
            <li><strong>الاشتراك الشهري:</strong> $9.99 شهرياً - يتجدد تلقائياً كل شهر</li>
            <li><strong>اشتراك 6 أشهر:</strong> $49.99 - يتجدد تلقائياً كل 6 أشهر</li>
            <li><strong>الاشتراك السنوي:</strong> $99.99 سنوياً - يتجدد تلقائياً كل سنة</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mt-4">
            سيتم خصم المبلغ من حساب iTunes الخاص بك عند تأكيد الشراء. 
            يتجدد الاشتراك تلقائياً ما لم يتم إلغاؤه قبل 24 ساعة على الأقل من نهاية الفترة الحالية.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">4. إلغاء الاشتراك</h2>
          <p className="text-slate-300 leading-relaxed">
            يمكنك إلغاء اشتراكك في أي وقت من خلال إعدادات حساب iTunes/App Store الخاص بك. 
            سيظل اشتراكك نشطاً حتى نهاية فترة الفوترة الحالية.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">5. قواعد السلوك</h2>
          <ul className="text-slate-300 space-y-2 list-disc list-inside">
            <li>يمنع نشر محتوى مسيء أو غير لائق</li>
            <li>يمنع التحرش أو التنمر على المستخدمين الآخرين</li>
            <li>يمنع انتحال شخصية الآخرين</li>
            <li>يمنع نشر محتوى ينتهك حقوق الملكية الفكرية</li>
            <li>يمنع استخدام التطبيق لأغراض غير قانونية</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">6. المحتوى الصوتي والمرئي</h2>
          <p className="text-slate-300 leading-relaxed">
            يستخدم التطبيق تقنية Agora للمحادثات الصوتية والمرئية في الوقت الفعلي. 
            أنت مسؤول عن المحتوى الذي تشاركه في الغرف الصوتية.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">7. حقوق الملكية الفكرية</h2>
          <p className="text-slate-300 leading-relaxed">
            جميع حقوق الملكية الفكرية للتطبيق ومحتواه مملوكة لـ "صوت الكورة". 
            لا يجوز نسخ أو توزيع أي جزء من التطبيق دون إذن كتابي.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">8. إخلاء المسؤولية</h2>
          <p className="text-slate-300 leading-relaxed">
            يتم تقديم التطبيق "كما هو" دون أي ضمانات. 
            لا نتحمل المسؤولية عن أي أضرار ناتجة عن استخدام التطبيق.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">9. التعديلات</h2>
          <p className="text-slate-300 leading-relaxed">
            نحتفظ بالحق في تعديل هذه الشروط في أي وقت. 
            سيتم إخطارك بأي تغييرات جوهرية عبر التطبيق أو البريد الإلكتروني.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">10. الاتصال بنا</h2>
          <p className="text-slate-300 leading-relaxed">
            للأسئلة أو الاستفسارات حول شروط الاستخدام، يرجى التواصل معنا عبر:
          </p>
          <p className="text-lime-400 mt-2">support@kooravoice.com</p>
        </section>

        <div className="border-t border-slate-700 pt-6 mt-8">
          <p className="text-slate-500 text-sm">© 2026 صوت الكورة - Koora Voice. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
