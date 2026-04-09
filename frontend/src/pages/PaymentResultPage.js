import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, XCircle, Loader2, Home, ArrowRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentResultPage = ({ success = true }) => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [result, setResult] = useState(null);
  
  const token = localStorage.getItem('token');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (success && sessionId) {
      confirmPayment();
    } else if (!success) {
      setStatus('cancelled');
    }
  }, [success, sessionId]);

  const confirmPayment = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(
        `${API}/payments/coins/confirm-purchase?session_id=${sessionId}`,
        {},
        { headers }
      );
      
      setResult(response.data);
      setStatus('success');
      toast.success(response.data.message);
    } catch (error) {
      console.error('Payment confirmation error:', error);
      setStatus('error');
      toast.error(error.response?.data?.detail || 'فشل تأكيد الدفع');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        {status === 'processing' && (
          <div className="text-center p-8 rounded-3xl bg-white/5 border border-white/10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto mb-6"
            >
              <Loader2 className="w-20 h-20 text-amber-500" />
            </motion.div>
            <h2 className="text-white text-xl font-bold mb-2">
              {isRTL ? 'جاري تأكيد الدفع...' : 'Confirming payment...'}
            </h2>
            <p className="text-white/60">
              {isRTL ? 'يرجى الانتظار' : 'Please wait'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            </motion.div>
            <h2 className="text-white text-2xl font-bold mb-2">
              {isRTL ? '🎉 تم بنجاح!' : '🎉 Success!'}
            </h2>
            <p className="text-white/80 mb-6">
              {result?.message || (isRTL ? 'تمت العملية بنجاح' : 'Transaction completed')}
            </p>
            
            {result?.coins && (
              <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/30 mb-6">
                <p className="text-amber-400 text-lg">
                  {isRTL ? 'تم إضافة' : 'Added'} <span className="font-bold text-2xl">{result.coins}</span> {isRTL ? 'عملة' : 'coins'}
                </p>
              </div>
            )}
            
            {result?.vip_until && (
              <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/30 mb-6">
                <p className="text-amber-400">
                  {isRTL ? 'VIP حتى: ' : 'VIP until: '}
                  <span className="font-bold">{new Date(result.vip_until).toLocaleDateString('ar-SA')}</span>
                </p>
              </div>
            )}
            
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-2xl py-6"
            >
              <Home className="w-5 h-5 ml-2" />
              {isRTL ? 'العودة للرئيسية' : 'Back to Home'}
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/30">
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h2 className="text-white text-2xl font-bold mb-2">
              {isRTL ? 'حدث خطأ!' : 'Error!'}
            </h2>
            <p className="text-white/60 mb-6">
              {isRTL ? 'فشل تأكيد الدفع. يرجى المحاولة مرة أخرى.' : 'Payment confirmation failed. Please try again.'}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/store')}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-2xl py-6"
              >
                {isRTL ? 'المحاولة مرة أخرى' : 'Try Again'}
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-white/10 text-white hover:bg-white/20 rounded-2xl py-6"
              >
                {isRTL ? 'الرئيسية' : 'Home'}
              </Button>
            </div>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="text-center p-8 rounded-3xl bg-white/5 border border-white/10">
            <XCircle className="w-20 h-20 text-gray-500 mx-auto mb-6" />
            <h2 className="text-white text-2xl font-bold mb-2">
              {isRTL ? 'تم إلغاء الدفع' : 'Payment Cancelled'}
            </h2>
            <p className="text-white/60 mb-6">
              {isRTL ? 'لم تتم أي عملية دفع' : 'No payment was made'}
            </p>
            <Button
              onClick={() => navigate('/store')}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl py-6"
            >
              <ArrowRight className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2 rotate-180'}`} />
              {isRTL ? 'العودة للمتجر' : 'Back to Store'}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export const PaymentSuccessPage = () => <PaymentResultPage success={true} />;
export const PaymentCancelPage = () => <PaymentResultPage success={false} />;

export default PaymentResultPage;
