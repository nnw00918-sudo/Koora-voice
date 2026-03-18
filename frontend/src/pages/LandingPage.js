import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Radio, Users, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      {/* Hero Section */}
      <div className="relative max-w-[600px] mx-auto min-h-screen flex flex-col">
        {/* Background Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-lime-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-6"
          >
            {/* Logo/Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-lime-400/20 border-2 border-lime-400 mb-4">
              <Radio className="w-10 h-10 text-lime-400" strokeWidth={1.5} />
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-cairo font-black text-white leading-tight">
              كورة فيرس
            </h1>
            <p className="text-lg text-slate-300 font-almarai leading-relaxed max-w-sm mx-auto">
              الاستاد الرقمي لمحبي كرة القدم. انضم للغرف الصوتية، ناقش، حلل، وشارك شغفك
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 mt-8 max-w-sm mx-auto">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-lg p-4 text-center"
              >
                <Radio className="w-6 h-6 text-lime-400 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-slate-300 font-almarai">غرف صوتية</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-lg p-4 text-center"
              >
                <MessageCircle className="w-6 h-6 text-sky-400 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-slate-300 font-almarai">دردشة مباشرة</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-lg p-4 text-center"
              >
                <Users className="w-6 h-6 text-lime-400 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-slate-300 font-almarai">مجتمع رياضي</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-lg p-4 text-center"
              >
                <TrendingUp className="w-6 h-6 text-sky-400 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-slate-300 font-almarai">تحليلات</p>
              </motion.div>
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="pt-8"
            >
              <Button
                data-testid="get-started-btn"
                onClick={() => navigate('/auth')}
                className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold text-lg px-10 py-6 rounded-xl shadow-[0_0_30px_rgba(163,230,53,0.3)] hover:shadow-[0_0_40px_rgba(163,230,53,0.5)] transition-all active:scale-95"
              >
                ابدأ الآن
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center pb-8 px-6">
          <p className="text-sm text-slate-500 font-almarai">
            © 2026 كورة فيرس. جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;