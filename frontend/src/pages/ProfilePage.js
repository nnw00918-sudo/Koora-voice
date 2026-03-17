import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, Mail, Calendar, LogOut } from 'lucide-react';

const ProfilePage = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-md mx-auto min-h-screen">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button
              data-testid="back-btn"
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              size="icon"
              className="hover:bg-slate-800 text-slate-400"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Button>
            <h1 className="text-xl font-cairo font-bold text-white flex-1 text-right">
              الملف الشخصي
            </h1>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative inline-block mb-4">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-32 h-32 rounded-full ring-4 ring-lime-400 mx-auto"
              />
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center ring-4 ring-slate-950">
                <div className="w-3 h-3 bg-slate-950 rounded-full"></div>
              </div>
            </div>
            <h2 className="text-2xl font-cairo font-bold text-white mb-1">
              {user.username}
            </h2>
            <p className="text-slate-400 font-almarai text-sm">عضو نشط</p>
          </motion.div>

          {/* User Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-400/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-sky-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-xs text-slate-500 font-almarai mb-1">البريد الإلكتروني</p>
                  <p className="text-white font-almarai" dir="ltr" style={{textAlign: 'right'}}>{user.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-lime-400/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-lime-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-xs text-slate-500 font-almarai mb-1">تاريخ الانضمام</p>
                  <p className="text-white font-almarai">{formatDate(user.created_at)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-3xl font-chivo font-bold text-lime-400 mb-1">0</p>
              <p className="text-sm text-slate-400 font-almarai">المتابعون</p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4 text-center">
              <p className="text-3xl font-chivo font-bold text-sky-400 mb-1">0</p>
              <p className="text-sm text-slate-400 font-almarai">المتابعة</p>
            </div>
          </motion.div>

          {/* Logout Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              data-testid="logout-profile-btn"
              onClick={onLogout}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 font-cairo font-bold py-6 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5 ml-2" strokeWidth={2} />
              تسجيل الخروج
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;