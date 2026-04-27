import React from 'react';

const SupportPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-lime-400 mb-6">الدعم الفني</h1>
        <p className="text-slate-400 mb-8">نحن هنا لمساعدتك!</p>
        
        <section className="mb-8 bg-slate-800/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">📧 تواصل معنا</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            للحصول على الدعم الفني أو الإبلاغ عن مشكلة، يرجى التواصل معنا عبر:
          </p>
          <a href="mailto:support@kooravoice.com" className="text-lime-400 text-lg font-bold hover:underline">
            support@kooravoice.com
          </a>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">❓ الأسئلة الشائعة</h2>
          
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h3 className="font-bold text-lime-400 mb-2">كيف أنشئ غرفة صوتية؟</h3>
              <p className="text-slate-300">
                من الصفحة الرئيسية، اضغط على زر "إنشاء غرفة"، ثم أدخل اسم الغرفة واختر الإعدادات المناسبة.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4">
              <h3 className="font-bold text-lime-400 mb-2">كيف أشترك في الباقات المميزة؟</h3>
              <p className="text-slate-300">
                اذهب إلى صفحة "المتجر" واختر الباقة المناسبة لك. الاشتراكات المتاحة: شهري ($9.99)، 6 أشهر ($49.99)، سنوي ($99.99).
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4">
              <h3 className="font-bold text-lime-400 mb-2">كيف ألغي اشتراكي؟</h3>
              <p className="text-slate-300">
                يمكنك إلغاء اشتراكك من إعدادات حساب App Store الخاص بك:
                الإعدادات → Apple ID → الاشتراكات → صوت الكورة → إلغاء الاشتراك
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4">
              <h3 className="font-bold text-lime-400 mb-2">الصوت لا يعمل في الغرفة؟</h3>
              <p className="text-slate-300">
                تأكد من منح التطبيق صلاحية الوصول للميكروفون من إعدادات جهازك. 
                كما تأكد من أن الميكروفون غير مكتوم في التطبيق.
              </p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4">
              <h3 className="font-bold text-lime-400 mb-2">كيف أبلغ عن مستخدم مسيء؟</h3>
              <p className="text-slate-300">
                اضغط على اسم المستخدم ← اختر "الإبلاغ" ← حدد سبب الإبلاغ. 
                سيقوم فريقنا بمراجعة البلاغ واتخاذ الإجراء المناسب.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">🔊 حول التطبيق</h2>
          <p className="text-slate-300 leading-relaxed">
            صوت الكورة هو تطبيق اجتماعي للمحادثات الصوتية والمرئية حول كرة القدم. 
            يتيح لك إنشاء غرف صوتية، التفاعل مع المشجعين الآخرين، ومشاهدة البث المباشر للمباريات.
          </p>
          <ul className="text-slate-300 mt-4 space-y-2">
            <li>✅ غرف صوتية مباشرة</li>
            <li>✅ بث مباشر للمباريات</li>
            <li>✅ دردشة نصية</li>
            <li>✅ متابعة المستخدمين</li>
            <li>✅ شارات وتخصيصات</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">📱 روابط مهمة</h2>
          <div className="space-y-3">
            <a href="/privacy" className="block text-lime-400 hover:underline">
              سياسة الخصوصية
            </a>
            <a href="/terms" className="block text-lime-400 hover:underline">
              شروط الاستخدام
            </a>
          </div>
        </section>

        <div className="border-t border-slate-700 pt-6 mt-8">
          <p className="text-slate-500 text-sm">© 2026 صوت الكورة - Koora Voice. جميع الحقوق محفوظة.</p>
          <p className="text-slate-500 text-sm mt-2">الإصدار: 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
