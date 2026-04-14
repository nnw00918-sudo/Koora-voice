import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { useLanguage, LanguageToggle } from '../contexts/LanguageContext';
import { API } from '../config/api';

const AuthPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',  // Can be email or username for login
    email: '',
    password: '',
    username: ''
  });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    setLoading(true);
    console.log('[AUTH] Starting login attempt...');
    console.log('[AUTH] API URL:', API);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { identifier: formData.identifier, password: formData.password }
        : { email: formData.email, password: formData.password, username: formData.username };

      console.log('[AUTH] Endpoint:', `${API}${endpoint}`);
      console.log('[AUTH] Payload:', JSON.stringify(payload));

      const response = await axios.post(`${API}${endpoint}`, payload);
      console.log('[AUTH] Response received:', response.status);
      
      const { access_token, user } = response.data;
      console.log('[AUTH] Login successful for user:', user?.username);

      onLogin(user, access_token);
    } catch (error) {
      console.error('[AUTH] Error:', error);
      console.error('[AUTH] Error response:', error.response?.data);
      const message = error.response?.data?.detail || t('error');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle button click/touch for iOS
  const handleButtonClick = (e) => {
    console.log('[AUTH] Button clicked/touched');
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(e);
  };

  return (
    <div className={`min-h-screen bg-slate-950 overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Language Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageToggle />
      </div>

      <div className="relative max-w-[600px] mx-auto min-h-screen flex flex-col justify-center px-6 py-12">
        {/* Background Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-lime-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-cairo font-black text-white mb-2">
              {isLogin ? t('loginTitle') : t('registerTitle')}
            </h1>
            <p className="text-slate-400 font-almarai">
              {isLogin ? t('loginSubtitle') : t('registerSubtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-6 space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username" className={`text-slate-300 font-almarai ${isRTL ? 'text-right' : 'text-left'} block`}>
                    {t('username')}
                  </Label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-slate-500`} strokeWidth={1.5} />
                    <Input
                      data-testid="username-input"
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className={`bg-slate-900 border-slate-700 focus:border-lime-400 rounded-lg text-white ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} font-almarai`}
                      placeholder={isRTL ? 'أدخل اسم المستخدم' : 'Enter username'}
                      required
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
              )}

              {isLogin ? (
                <div className="space-y-2">
                  <Label htmlFor="identifier" className={`text-slate-300 font-almarai ${isRTL ? 'text-right' : 'text-left'} block`}>
                    {t('emailOrUsername')}
                  </Label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-slate-500`} strokeWidth={1.5} />
                    <Input
                      data-testid="identifier-input"
                      id="identifier"
                      type="text"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      className={`bg-slate-900 border-slate-700 focus:border-lime-400 rounded-lg text-white ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} font-almarai`}
                      placeholder={isRTL ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email'}
                      required
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="email" className={`text-slate-300 font-almarai ${isRTL ? 'text-right' : 'text-left'} block`}>
                    {t('email')}
                  </Label>
                  <div className="relative">
                    <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-slate-500`} strokeWidth={1.5} />
                    <Input
                      data-testid="email-input"
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`bg-slate-900 border-slate-700 focus:border-lime-400 rounded-lg text-white ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} font-almarai`}
                      placeholder="example@email.com"
                      required
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className={`text-slate-300 font-almarai ${isRTL ? 'text-right' : 'text-left'} block`}>
                  {t('password')}
                </Label>
                <div className="relative">
                  <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-slate-500`} strokeWidth={1.5} />
                  <Input
                    data-testid="password-input"
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`bg-slate-900 border-slate-700 focus:border-lime-400 rounded-lg text-white ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} font-almarai`}
                    placeholder="••••••••"
                    required
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </div>
            </div>

            {/* Native button for better iOS compatibility */}
            <button
              data-testid="submit-auth-btn"
              type="button"
              disabled={loading}
              onClick={handleButtonClick}
              onTouchEnd={handleButtonClick}
              className="w-full bg-lime-400 hover:bg-lime-300 active:bg-lime-500 text-slate-950 font-cairo font-bold text-lg py-4 rounded-xl shadow-[0_0_30px_rgba(163,230,53,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                WebkitTapHighlightColor: 'rgba(163,230,53,0.3)',
                touchAction: 'manipulation',
                cursor: 'pointer',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitAppearance: 'none',
                appearance: 'none',
                minHeight: '56px'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  {t('loading')}
                </span>
              ) : isLogin ? (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-5 h-5" strokeWidth={2} />
                  {t('loginBtn')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="w-5 h-5" strokeWidth={2} />
                  {t('registerBtn')}
                </span>
              )}
            </button>
          </form>

          {/* Forgot Password Link */}
          {isLogin && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/forgot-password')}
                className="text-amber-400 hover:text-amber-300 transition-colors font-almarai text-sm"
              >
                {t('forgotPassword')}
              </button>
            </div>
          )}

          {/* Toggle */}
          <div className="mt-4 text-center">
            <button
              data-testid="toggle-auth-mode-btn"
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 hover:text-lime-400 transition-colors font-almarai"
            >
              {isLogin ? t('noAccount') + ' ' : t('hasAccount') + ' '}
              <span className="text-lime-400 font-bold">
                {isLogin ? t('createAccount') : t('loginHere')}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
