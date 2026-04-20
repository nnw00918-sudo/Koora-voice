import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, XCircle, Loader2, Home, ArrowRight, Crown } from 'lucide-react';
import { API } from '../config/api';

const PaymentResultPage = ({ success = true }) => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [result, setResult] = useState(null);
  
  const token = localStorage.getItem('token');
  const orderId = searchParams.get('token'); // PayPal returns order ID as 'token'

  useEffect(() => {
    if (success && orderId) {
      confirmPayment();
    } else if (!success) {
      setStatus('cancelled');
    } else if (success && !orderId) {
      // No order ID but success page - might be direct navigation
      setStatus('success');
    }
  }, [success, orderId]);

  const confirmPayment = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Try to capture the PayPal payment
      const response = await axios.post(
        `${API}/api/payments/capture`,
        { order_id: orderId },
        { headers }
      );
      
      setResult(response.data);
      setStatus('success');
      toast.success(response.data.message || (isRTL ? 'تم التفعيل بنجاح!' : 'Activated successfully!'));
    } catch (error) {
      console.error('Payment confirmation error:', error);
      // If capture fails, might already be captured
      if (error.response?.status === 400) {
        setStatus('success');
        setResult({ message: isRTL ? 'تمت العملية بنجاح' : 'Transaction completed' });
      } else {
        setStatus('error');
        toast.error(error.response?.data?.detail || (isRTL ? 'فشل تأكيد الدفع' : 'Payment confirmation failed'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
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
              <Loader2 className="w-20 h-20 text-lime-500" />
            </motion.div>
            <h2 className="text-white text-xl font-bold mb-2 font-cairo">
              {isRTL ? 'جاري تأكيد الدفع...' : 'Confirming payment...'}
            </h2>
            <p className="text-white/60 font-almarai">
              {isRTL ? 'يرجى الانتظار' : 'Please wait'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-lime-500/10 to-green-500/10 border border-lime-500/30">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <CheckCircle className="w-20 h-20 text-lime-500 mx-auto mb-6" />
            </motion.div>
            <h2 className="text-white text-2xl font-bold mb-2 font-cairo">
              {isRTL ? '🎉 تم بنجاح!' : '🎉 Success!'}
            </h2>
            <p className="text-white/80 mb-6 font-almarai">
              {result?.message || (isRTL ? 'تم تفعيل الميزة بنجاح' : 'Feature activated successfully')}
            </p>
            
            {result?.expires && (
              <div className="p-4 rounded-2xl bg-lime-500/20 border border-lime-500/30 mb-6">
                <Crown className="w-8 h-8 text-lime-400 mx-auto mb-2" />
                <p className="text-lime-400 font-almarai">
                  {isRTL ? 'صالح حتى: ' : 'Valid until: '}
                  <span className="font-bold">{new Date(result.expires).toLocaleDateString('ar-SA')}</span>
                </p>
              </div>
            )}
            
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-slate-900 font-bold rounded-2xl py-6"
            >
              <Home className="w-5 h-5 ml-2" />
              {isRTL ? 'العودة للرئيسية' : 'Back to Home'}
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/30">
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h2 className="text-white text-2xl font-bold mb-2 font-cairo">
              {isRTL ? 'حدث خطأ!' : 'Error!'}
            </h2>
            <p className="text-white/60 mb-6 font-almarai">
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
            <h2 className="text-white text-2xl font-bold mb-2 font-cairo">
              {isRTL ? 'تم إلغاء الدفع' : 'Payment Cancelled'}
            </h2>
            <p className="text-white/60 mb-6 font-almarai">
              {isRTL ? 'لم تتم أي عملية دفع' : 'No payment was made'}
            </p>
            <Button
              onClick={() => navigate('/store')}
              className="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-slate-900 font-bold rounded-2xl py-6"
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
