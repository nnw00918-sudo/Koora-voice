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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { identifier: formData.identifier, password: formData.password }
        : { email: formData.email, password: formData.password, username: formData.username };

      const response = await axios.post(`${API}${endpoint}`, payload);
      const { access_token, user } = response.data;

      onLogin(user, access_token);
    } catch (error) {
      const message = error.response?.data?.detail || t('error');
      toast.error(message);
    } finally {
      setLoading(false);
    }
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

            <Button
              data-testid="submit-auth-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold text-lg py-6 rounded-xl shadow-[0_0_30px_rgba(163,230,53,0.3)] transition-all active:scale-95"
            >
              {loading ? (
                t('loading')
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
            </Button>
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
