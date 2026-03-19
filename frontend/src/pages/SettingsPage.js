import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  Home, 
  Trophy, 
  Settings, 
  Bell, 
  Moon, 
  Volume2, 
  Shield, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  User,
  Lock,
  HelpCircle,
  Info,
  Globe
} from 'lucide-react';

const SettingsPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSetting } = useSettings();

  const isRTL = language === 'ar';
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner': return t('owner');
      case 'admin': return t('admin');
      case 'mod': return t('mod');
      default: return '';
    }
  };

  const settingsSections = [
    {
      title: t('account'),
      items: [
        { icon: User, label: t('profile'), onClick: () => navigate('/profile') },
        { icon: Lock, label: t('changePassword'), onClick: () => {} },
      ]
    },
    {
      title: t('preferences'),
      items: [
        { icon: Bell, label: t('notifications'), toggle: true, settingKey: 'notifications' },
        { icon: Moon, label: t('darkMode'), toggle: true, settingKey: 'darkMode' },
        { icon: Volume2, label: t('sounds'), toggle: true, settingKey: 'sounds' },
        { 
          icon: Globe, 
          label: t('language'), 
          isLanguage: true,
          currentLang: language === 'ar' ? t('arabic') : t('english')
        },
      ]
    },
    {
      title: t('support'),
      items: [
        { icon: HelpCircle, label: t('help'), onClick: () => {} },
        { icon: Info, label: t('aboutApp'), onClick: () => {} },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex items-center justify-center">
            <h1 className="text-xl font-cairo font-bold text-white">{t('settingsTitle')}</h1>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-2xl p-4"
          >
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <img
                src={user.avatar}
                alt={user.username}
                className="w-16 h-16 rounded-full ring-2 ring-lime-400"
              />
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h2 className="text-white font-cairo font-bold text-lg">{user.username}</h2>
                <p className="text-slate-400 text-sm font-almarai">{user.email}</p>
                {user.role !== 'user' && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs font-cairo">
                    {getRoleLabel(user.role)}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Settings Sections */}
        <div className="px-4 space-y-6">
          {settingsSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <h3 className={`text-slate-400 text-sm font-almarai mb-2 px-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {section.title}
              </h3>
              <div className="bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between p-4 ${
                      itemIndex !== section.items.length - 1 ? 'border-b border-slate-800' : ''
                    } ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    {item.toggle ? (
                      <>
                        <button
                          onClick={() => updateSetting(item.settingKey, !settings[item.settingKey])}
                          className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${
                            settings[item.settingKey] ? 'bg-lime-400' : 'bg-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            settings[item.settingKey] ? (isRTL ? '' : 'translate-x-5') : (isRTL ? 'translate-x-5' : '')
                          }`} />
                        </button>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <item.icon className="w-5 h-5 text-slate-400" />
                          <span className="text-white font-almarai">{item.label}</span>
                        </div>
                      </>
                    ) : item.isLanguage ? (
                      <button
                        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                        className={`w-full flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <ChevronIcon className="w-5 h-5 text-slate-500" />
                          <span className="text-lime-400 font-almarai text-sm">{item.currentLang}</span>
                        </div>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <item.icon className="w-5 h-5 text-slate-400" />
                          <span className="text-white font-almarai">{item.label}</span>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={item.onClick}
                        className={`w-full flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <ChevronIcon className="w-5 h-5 text-slate-500" />
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <item.icon className="w-5 h-5 text-slate-400" />
                          <span className="text-white font-almarai">{item.label}</span>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Admin Button */}
          {(user.role === 'admin' || user.role === 'owner') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => navigate('/admin')}
                className={`w-full bg-purple-500/20 border border-purple-500/50 rounded-2xl p-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <ChevronIcon className="w-5 h-5 text-purple-400" />
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Shield className="w-5 h-5 text-purple-400" />
                  <span className="text-purple-400 font-cairo font-bold">{t('controlPanel')}</span>
                </div>
              </button>
            </motion.div>
          )}

          {/* Logout Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={onLogout}
              className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-cairo font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 z-50">
        <div className={`max-w-[600px] mx-auto flex justify-around p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Home className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('home')}</span>
          </button>
          <button
            onClick={() => navigate('/matches')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Trophy className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('matches')}</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-lime-400"
          >
            <Settings className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
