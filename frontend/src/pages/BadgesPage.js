import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLanguage, LanguageToggle } from '../contexts/LanguageContext';
import { BACKEND_URL, API } from '../config/api';
import {
  Trophy,
  Medal,
  Star,
  Gift,
  MessageSquare,
  Clock,
  Users,
  ChevronRight,
  ArrowRight,
  Crown,
  Zap,
  Target,
  Award,
  Shield
} from 'lucide-react';

const BadgesPage = ({ user: propUser }) => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [allBadges, setAllBadges] = useState({ team: [], level: [], achievement: [] });
  const [userBadges, setUserBadges] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [levelProgress, setLevelProgress] = useState(null);
  const [activeTab, setActiveTab] = useState('badges'); // badges, leaderboard, stats
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem('token');
  
  // Get user from prop or localStorage
  const [user, setUser] = useState(() => {
    if (propUser) return propUser;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    return null;
  });

  // Update user if propUser changes
  useEffect(() => {
    if (propUser && propUser.id !== user?.id) {
      setUser(propUser);
    }
  }, [propUser]);
  
  // Debug logging
  useEffect(() => {
    console.log('BadgesPage mounted, user:', user?.id, 'propUser:', propUser?.id);
  }, []);

  useEffect(() => {
    console.log('User changed, fetching data:', user?.id);
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) {
      return;
    }
    try {
      setLoading(true);
      console.log('Fetching badges data for user:', user.id);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [badgesRes, userBadgesRes, statsRes, leaderboardRes] = await Promise.all([
        axios.get(`${API}/badges/all`),
        axios.get(`${API}/badges/user/${user.id}`),
        axios.get(`${API}/badges/stats/${user.id}`),
        axios.get(`${API}/badges/leaderboard?limit=20`)
      ]);
      
      setAllBadges(badgesRes.data.badges);
      setUserBadges(userBadgesRes.data.badges || []);
      setSelectedTeam(userBadgesRes.data.selected_team_badge);
      setLevelProgress(userBadgesRes.data.level_progress);
      setUserStats(statsRes.data);
      setLeaderboard(leaderboardRes.data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching badges data:', error);
      toast.error(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (badgeId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/badges/select-team`, { team_badge_id: badgeId }, { headers });
      toast.success(isRTL ? 'تم اختيار الفريق' : 'Team selected');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل اختيار الفريق' : 'Failed to select team'));
    }
  };

  const userBadgeIds = userBadges.map(b => b.id);

  // Show loading while data is being fetched
  if (loading || !levelProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowRight className={`w-5 h-5 text-white ${isRTL ? '' : 'rotate-180'}`} />
          </button>
          <h1 className="font-cairo font-bold text-lg text-white">{isRTL ? 'الشارات والمستويات' : 'Badges & Levels'}</h1>
          <LanguageToggle />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* Level Progress Card */}
        {levelProgress && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{levelProgress.level}</span>
                </div>
                <div>
                  <p className="text-white/60 text-sm">{isRTL ? 'المستوى' : 'Level'}</p>
                  <p className="text-white font-bold text-xl">{user.username}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-violet-300 text-sm">{isRTL ? 'النقاط' : 'XP'}</p>
                <p className="text-white font-bold text-xl">{levelProgress.current_xp.toLocaleString()}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-4 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress.percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-white/60">{levelProgress.progress_xp} / {levelProgress.needed_xp}</span>
              <span className="text-violet-300">{levelProgress.percentage}%</span>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mt-6 p-1 bg-white/5 rounded-2xl">
          {['badges', 'leaderboard', 'stats'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl font-cairo font-bold text-sm transition-all ${
                activeTab === tab 
                  ? 'bg-violet-500 text-white' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab === 'badges' && (isRTL ? 'الشارات' : 'Badges')}
              {tab === 'leaderboard' && (isRTL ? 'المتصدرين' : 'Leaderboard')}
              {tab === 'stats' && (isRTL ? 'الإحصائيات' : 'Stats')}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'badges' && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mt-6 space-y-6"
            >
              {/* Team Badges */}
              <div>
                <h2 className="text-white font-cairo font-bold text-lg mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  {isRTL ? 'شارات الفرق' : 'Team Badges'}
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {allBadges.team.map((badge) => (
                    <motion.button
                      key={badge.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectTeam(badge.id)}
                      className={`p-4 rounded-2xl border transition-all ${
                        selectedTeam?.id === badge.id
                          ? 'bg-emerald-500/20 border-emerald-500'
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <p className="text-white text-xs font-cairo truncate">{isRTL ? badge.name : badge.name_en}</p>
                      {selectedTeam?.id === badge.id && (
                        <div className="mt-1 w-2 h-2 bg-emerald-400 rounded-full mx-auto" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Level Badges */}
              <div>
                <h2 className="text-white font-cairo font-bold text-lg mb-4 flex items-center gap-2">
                  <Medal className="w-5 h-5 text-amber-400" />
                  {isRTL ? 'شارات المستوى' : 'Level Badges'}
                </h2>
                <div className="space-y-3">
                  {allBadges.level.map((badge) => {
                    const isUnlocked = (levelProgress?.level || 1) >= (badge.min_level || 999);
                    return (
                      <div
                        key={badge.id}
                        className={`p-4 rounded-2xl border flex items-center gap-4 ${
                          isUnlocked
                            ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/50'
                            : 'bg-white/5 border-white/10 opacity-50'
                        }`}
                      >
                        <div className="text-4xl">{badge.icon}</div>
                        <div className="flex-1">
                          <p className="text-white font-bold">{isRTL ? badge.name : badge.name_en}</p>
                          <p className="text-white/60 text-sm">{isRTL ? `المستوى ${badge.min_level}+` : `Level ${badge.min_level}+`}</p>
                        </div>
                        {isUnlocked ? (
                          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                            <Star className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                            <span className="text-white/40 text-xs">{badge.min_level}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Achievement Badges */}
              <div>
                <h2 className="text-white font-cairo font-bold text-lg mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-violet-400" />
                  {isRTL ? 'شارات الإنجازات' : 'Achievement Badges'}
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {allBadges.achievement.map((badge) => {
                    const isUnlocked = userBadgeIds.includes(badge.id);
                    return (
                      <motion.div
                        key={badge.id}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-2xl border text-center ${
                          isUnlocked
                            ? 'bg-violet-500/10 border-violet-500/50'
                            : 'bg-white/5 border-white/10 opacity-40'
                        }`}
                      >
                        <div className={`text-3xl mb-2 ${isUnlocked ? '' : 'grayscale'}`}>{badge.icon}</div>
                        <p className="text-white text-xs font-cairo">{isRTL ? badge.name : badge.name_en}</p>
                        <p className="text-white/40 text-[10px] mt-1">{badge.description}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mt-6 space-y-3"
            >
              {/* Top 3 */}
              <div className="flex justify-center gap-4 mb-6">
                {leaderboard.slice(0, 3).map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`text-center ${index === 0 ? 'order-2' : index === 1 ? 'order-1' : 'order-3'}`}
                  >
                    <div className={`relative ${index === 0 ? 'scale-110' : ''}`}>
                      <div className={`w-16 h-16 rounded-full border-2 overflow-hidden ${
                        index === 0 ? 'border-amber-400' : index === 1 ? 'border-gray-400' : 'border-orange-400'
                      }`}>
                        {player.avatar ? (
                          <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                            <span className="text-white font-bold">{player.username?.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-500 text-white' : index === 1 ? 'bg-gray-400 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <p className="text-white text-sm font-bold mt-3">{player.username}</p>
                    <p className="text-violet-300 text-xs">{player.xp.toLocaleString()} XP</p>
                  </motion.div>
                ))}
              </div>

              {/* Rest of leaderboard */}
              {leaderboard.slice(3).map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (index + 3) * 0.05 }}
                  className={`p-4 rounded-2xl border flex items-center gap-4 ${
                    player.id === user.id 
                      ? 'bg-violet-500/20 border-violet-500/50' 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-white/60 font-bold">{player.rank}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {player.avatar ? (
                      <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <span className="text-white text-sm">{player.username?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold">{player.username}</p>
                    <p className="text-white/60 text-sm">{isRTL ? `المستوى ${player.level}` : `Level ${player.level}`}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-violet-300 font-bold">{player.xp.toLocaleString()}</p>
                    <p className="text-white/40 text-xs">XP</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'stats' && userStats && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mt-6 space-y-4"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <StatsCard 
                  icon={<MessageSquare className="w-6 h-6" />}
                  color="violet"
                  label={isRTL ? 'الرسائل المرسلة' : 'Messages Sent'}
                  value={userStats.stats.messages_sent}
                />
                <StatsCard 
                  icon={<Gift className="w-6 h-6" />}
                  color="pink"
                  label={isRTL ? 'الهدايا المرسلة' : 'Gifts Sent'}
                  value={userStats.stats.gifts_sent}
                />
                <StatsCard 
                  icon={<Star className="w-6 h-6" />}
                  color="amber"
                  label={isRTL ? 'الهدايا المستلمة' : 'Gifts Received'}
                  value={userStats.stats.gifts_received}
                />
                <StatsCard 
                  icon={<Users className="w-6 h-6" />}
                  color="emerald"
                  label={isRTL ? 'الغرف المنشأة' : 'Rooms Created'}
                  value={userStats.stats.rooms_created}
                />
                <StatsCard 
                  icon={<Clock className="w-6 h-6" />}
                  color="blue"
                  label={isRTL ? 'ساعات التواجد' : 'Hours Online'}
                  value={userStats.stats.total_hours}
                />
                <StatsCard 
                  icon={<Award className="w-6 h-6" />}
                  color="rose"
                  label={isRTL ? 'الشارات' : 'Badges'}
                  value={userStats.badges_count}
                />
              </div>

              {/* XP Sources Info */}
              <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  {isRTL ? 'كيف تكسب النقاط؟' : 'How to earn XP?'}
                </h3>
                <div className="space-y-3">
                  {[
                    { action: isRTL ? 'إرسال رسالة' : 'Send message', xp: 2 },
                    { action: isRTL ? 'الحصول على رد' : 'Get a reply', xp: 5 },
                    { action: isRTL ? 'إرسال هدية' : 'Send gift', xp: 10 },
                    { action: isRTL ? 'استلام هدية' : 'Receive gift', xp: 5 },
                    { action: isRTL ? 'دقيقة في الغرفة' : 'Minute in room', xp: 1 },
                    { action: isRTL ? 'تسجيل دخول يومي' : 'Daily login', xp: 20 },
                    { action: isRTL ? 'إنشاء غرفة' : 'Create room', xp: 50 },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-white/70 text-sm">{item.action}</span>
                      <span className="text-amber-400 font-bold">+{item.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/90 backdrop-blur-xl border-t border-white/10 py-4 px-6">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-2xl"
          >
            {isRTL ? 'العودة للرئيسية' : 'Back to Home'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ icon, color, label, value }) => {
  const colorClasses = {
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    rose: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400',
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br border ${colorClasses[color]}`}>
      <div className={colorClasses[color].split(' ').pop()}>{icon}</div>
      <p className="text-white font-bold text-2xl mt-2">{value.toLocaleString()}</p>
      <p className="text-white/60 text-sm">{label}</p>
    </div>
  );
};

export default BadgesPage;
