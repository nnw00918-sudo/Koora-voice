import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, Lock, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { useLanguage, LanguageToggle } from '../contexts/LanguageContext';
import { API } from '../config/api';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password, 4: success
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(isRTL ? 'أدخل البريد الإلكتروني' : 'Enter your email');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      toast.success(response.data.message);
      
      // For testing - show the code (remove in production)
      if (response.data.code_hint) {
        toast.info(`${isRTL ? 'رمز التحقق' : 'Code'}: ${response.data.code_hint}`, { duration: 10000 });
      }
      
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast.error(isRTL ? 'رمز التحقق يجب أن يكون 6 أرقام' : 'Code must be 6 digits');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        email,
        code,
        new_password: newPassword
      });
      
      toast.success(t('passwordChanged'));
      setStep(4);
    } catch (error) {
      toast.error(error.response?.data?.detail || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageToggle />
      </div>

      {/* Back Button */}
      <div className={`absolute top-6 ${isRTL ? 'right-20' : 'left-6'} z-20`}>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          <span className="font-almarai">{t('backToLogin')}</span>
        </button>
      </div>

      <div className="relative max-w-[600px] mx-auto min-h-screen flex flex-col justify-center px-6 py-12">
        {/* Background Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-orange-400/10 rounded-full blur-3xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          {/* Step 1: Enter Email */}
          {step === 1 && (
            <>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-amber-400" />
                </div>
                <h1 className="text-3xl font-cairo font-black text-white mb-2">
                  {t('forgotPassword')}
                </h1>
                <p className="text-slate-400 font-almarai">
                  {t('enterEmail')}
                </p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-5">
                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className={`text-slate-300 font-almarai ${isRTL ? 'text-right' : 'text-left'} block`}>
                      {t('email')}
                    </Label>
                    <div className="relative">
                      <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-slate-500`} />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`bg-slate-900 border-slate-700 focus:border-amber-400 rounded-lg text-white ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} font-almarai`}
                        placeholder="example@email.com"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-cairo font-bold text-lg py-6 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all active:scale-95"
                >
                  {loading ? t('loading') : t('sendCode')}
                </Button>
              </form>
            </>
          )}

          {/* Step 2 & 3: Enter Code and New Password */}
          {(step === 2 || step === 3) && (
            <>
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-10 h-10 text-amber-400" />
                </div>
                <h1 className="text-3xl font-cairo font-black text-white mb-2">
                  {t('resetPassword')}
                </h1>
                <p className="text-slate-400 font-almarai">
                  {t('enterCode')}
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 space-y-5">
                  {/* Verification Code */}
                  <div className="space-y-2">
                    <Label htmlFor="code" className={`text-slate-300 font-almarai ${isRTL ? 'text-right' : 'text-left'} block`}>
                      {t('verificationCode')}
                    </Label>
                    <Input
                      id="code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="bg-slate-900 border-slate-700 focus:border-amber-400 rounded-lg text-white text-center text-2xl tracking-[0.5em] font-mono"
                      placeholder="000000"
                      maxLength={6}
                      required
                      dir="ltr"
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className={`text-slate-300 font-almarai ${isRTL ? 'text-right' : 'text-left'} block`}>
                      {t('newPassword')}
                    </Label>
                    <div className="relative">
                      <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-slate-500`} />
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`bg-slate-900 border-slate-700 focus:border-amber-400 rounded-lg text-white ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} font-almarai`}
                        placeholder="••••••••"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className={`text-slate-300 font-almarai ${isRTL ? 'text-right' : 'text-left'} block`}>
                      {t('confirmNewPassword')}
                    </Label>
                    <div className="relative">
                      <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-slate-500`} />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`bg-slate-900 border-slate-700 focus:border-amber-400 rounded-lg text-white ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} font-almarai`}
                        placeholder="••••••••"
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-cairo font-bold text-lg py-6 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all active:scale-95"
                >
                  {loading ? t('loading') : t('resetBtn')}
                </Button>
              </form>

              {/* Resend Code */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => setStep(1)}
                  className="text-slate-400 hover:text-amber-400 transition-colors font-almarai text-sm"
                >
                  {isRTL ? 'إعادة إرسال الرمز' : 'Resend code'}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-green-400" />
              </motion.div>
              
              <h1 className="text-3xl font-cairo font-black text-white mb-4">
                {t('passwordChanged')}
              </h1>
              
              <p className="text-slate-400 font-almarai mb-8">
                {isRTL ? 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة' : 'You can now login with your new password'}
              </p>
              
              <Button
                onClick={() => navigate('/login')}
                className="w-full max-w-xs bg-lime-400 hover:bg-lime-300 text-black font-cairo font-bold text-lg py-6 rounded-xl shadow-[0_0_30px_rgba(163,230,53,0.3)] transition-all active:scale-95"
              >
                {t('loginBtn')}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
