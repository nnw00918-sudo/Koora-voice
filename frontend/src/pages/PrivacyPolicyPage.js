import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-lime-400 mb-6">سياسة الخصوصية</h1>
        <p className="text-slate-400 mb-8">آخر تحديث: مارس 2026</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">1. المقدمة</h2>
          <p className="text-slate-300 leading-relaxed">
            مرحباً بك في تطبيق "صوت الكورة" (Koora Voice). نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. 
            توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية معلوماتك.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">2. المعلومات التي نجمعها</h2>
          <ul className="text-slate-300 space-y-2 list-disc list-inside">
            <li>معلومات الحساب: البريد الإلكتروني، اسم المستخدم</li>
            <li>معلومات الملف الشخصي: الصورة، السيرة الذاتية</li>
            <li>بيانات الاستخدام: الغرف التي تنضم إليها، الرسائل</li>
            <li>معلومات الجهاز: نوع الجهاز، نظام التشغيل</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">3. كيف نستخدم معلوماتك</h2>
          <ul className="text-slate-300 space-y-2 list-disc list-inside">
            <li>تقديم خدمات التطبيق وتحسينها</li>
            <li>تمكين التواصل بين المستخدمين</li>
            <li>إرسال إشعارات مهمة</li>
            <li>ضمان أمان المنصة</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">4. مشاركة المعلومات</h2>
          <p className="text-slate-300 leading-relaxed">
            نحن لا نبيع أو نشارك معلوماتك الشخصية مع أطراف ثالثة لأغراض تسويقية. 
            قد نشارك المعلومات فقط مع مزودي الخدمات الضروريين لتشغيل التطبيق.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">5. أمان البيانات</h2>
          <p className="text-slate-300 leading-relaxed">
            نستخدم إجراءات أمنية متقدمة لحماية بياناتك، بما في ذلك التشفير والخوادم الآمنة.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">6. حقوقك</h2>
          <ul className="text-slate-300 space-y-2 list-disc list-inside">
            <li>الوصول إلى بياناتك</li>
            <li>تصحيح المعلومات غير الدقيقة</li>
            <li>حذف حسابك وبياناتك</li>
            <li>تقييد معالجة بياناتك</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">7. الاتصال بنا</h2>
          <p className="text-slate-300 leading-relaxed">
            إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى التواصل معنا عبر البريد الإلكتروني:
          </p>
          <a href="mailto:support@kooravoice.com" className="text-lime-400 font-bold hover:underline">
            support@kooravoice.com
          </a>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">8. روابط مهمة</h2>
          <div className="space-y-3">
            <a href="/terms" className="block text-lime-400 hover:underline">
              شروط الاستخدام
            </a>
            <a href="/support" className="block text-lime-400 hover:underline">
              الدعم الفني
            </a>
          </div>
        </section>

        <div className="border-t border-slate-700 pt-6 mt-8">
          <p className="text-slate-500 text-sm">© 2026 صوت الكورة - Koora Voice. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
