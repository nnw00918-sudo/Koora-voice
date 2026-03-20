import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toHijri } from 'hijri-converter';
import { 
  Trophy, 
  Calendar,
  TrendingUp,
  Target,
  Loader2,
  ChevronLeft,
  RefreshCw,
  MapPin,
  Users,
  BarChart3,
  X,
  Zap,
  Home,
  MessageCircle,
  User,
  Mic
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MatchesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [leagues, setLeagues] = useState([]);
  const [fixtures, setFixtures] = useState({});
  const [standings, setStandings] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [activeTab, setActiveTab] = useState('matches');
  const [loading, setLoading] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(7); // Start at today
  const pollInterval = useRef(null);
  const calendarRef = useRef(null);

  // Generate calendar dates - 30 days (7 past + 23 future)
  const getCalendarDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = -7; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const calendarDates = getCalendarDates();
  const todayIndex = 7; // Index of today in the array

  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchLeagues();
    fetchFixturesForDate(calendarDates[selectedDateIndex]);
    
    // Scroll to today in calendar
    setTimeout(() => {
      if (calendarRef.current) {
        const todayButton = calendarRef.current.children[7]; // Index 7 is today
        if (todayButton) {
          todayButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    }, 100);
    
    pollInterval.current = setInterval(() => {
      if (activeTab === 'matches') {
        fetchFixturesForDate(calendarDates[selectedDateIndex], true);
      }
    }, 60000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  useEffect(() => {
    fetchFixturesForDate(calendarDates[selectedDateIndex]);
  }, [selectedDateIndex]);

  useEffect(() => {
    if (selectedLeague && (activeTab === 'standings' || activeTab === 'scorers')) {
      if (activeTab === 'standings') {
        fetchStandings(selectedLeague.id);
      } else {
        fetchScorers(selectedLeague.id);
      }
    }
  }, [selectedLeague, activeTab]);

  const fetchLeagues = async () => {
    try {
      const response = await axios.get(`${API}/football/leagues`);
      setLeagues(response.data.leagues);
      if (response.data.leagues.length > 0) {
        setSelectedLeague(response.data.leagues[0]);
      }
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
    }
  };

  const fetchFixturesForDate = async (date, silent = false) => {
    if (!silent) setLoadingFixtures(true);
    try {
      const dateStr = formatDateForAPI(date);
      const response = await axios.get(`${API}/football/fixtures/date/${dateStr}`);
      setFixtures(response.data.fixtures || {});
    } catch (error) {
      console.error('Failed to fetch fixtures:', error);
      setFixtures({});
    }
    setLoadingFixtures(false);
    setLoading(false);
  };

  const fetchStandings = async (leagueId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/football/standings/${leagueId}`);
      setStandings(response.data.standings || []);
    } catch (error) {
      console.error('Failed to fetch standings:', error);
      setStandings([]);
    }
    setLoading(false);
  };

  const fetchScorers = async (leagueId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/football/scorers/${leagueId}`);
      setScorers(response.data.scorers || []);
    } catch (error) {
      console.error('Failed to fetch scorers:', error);
      setScorers([]);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'matches') {
      await fetchFixturesForDate(calendarDates[selectedDateIndex]);
    } else if (activeTab === 'standings' && selectedLeague) {
      await fetchStandings(selectedLeague.id);
    } else if (activeTab === 'scorers' && selectedLeague) {
      await fetchScorers(selectedLeague.id);
    }
    setRefreshing(false);
  };

  const handleDateSelect = (index) => {
    setSelectedDateIndex(index);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'standings' && selectedLeague) {
      fetchStandings(selectedLeague.id);
    } else if (tabId === 'scorers' && selectedLeague) {
      fetchScorers(selectedLeague.id);
    }
  };

  const handleLeagueSelect = (league) => {
    setSelectedLeague(league);
    if (activeTab === 'standings') {
      fetchStandings(league.id);
    } else if (activeTab === 'scorers') {
      fetchScorers(league.id);
    }
  };

  const allMatches = Object.values(fixtures).flat();
  const liveCount = allMatches.filter(m => m.status === 'LIVE').length;

  const formatDayName = (date, index) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((compareDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    if (diffDays === -1) return 'أمس';
    
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[date.getDay()];
  };

  // Convert to Hijri date
  const getHijriDate = (date) => {
    const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const hijriMonths = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 
      'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
      'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];
    return {
      day: hijri.hd,
      month: hijriMonths[hijri.hm - 1],
      year: hijri.hy
    };
  };

  // Format Gregorian month name in Arabic
  const getGregorianMonthName = (date) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[date.getMonth()];
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'الرئيسية', path: '/dashboard' },
    { id: 'threads', icon: MessageCircle, label: 'المنشورات', path: '/threads' },
    { id: 'rooms', icon: Mic, label: 'الغرف', path: '/dashboard' },
    { id: 'matches', icon: Trophy, label: 'المباريات', path: '/matches' },
    { id: 'profile', icon: User, label: 'حسابي', path: '/profile' },
  ];

  if (loading && !fixtures) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] flex items-center justify-center">
        <motion.div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-amber-500/70 font-cairo">جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] pb-24" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent" />
        
        <div className="relative px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white font-cairo">المباريات</h1>
              <p className="text-amber-500/70 text-sm">موسم 2025-2026</p>
            </div>
            <div className="flex items-center gap-3">
              {liveCount > 0 && (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-full"
                >
                  <Zap className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm font-bold">{liveCount} مباشر</span>
                </motion.div>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
              >
                <RefreshCw className={`w-5 h-5 text-amber-500 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>
          </div>

          {/* Date Selector */}
          {activeTab === 'matches' && (
            <div className="mb-4">
              {/* Current Date Display - Gregorian & Hijri */}
              <div className="text-center mb-4 py-3 bg-white/5 rounded-2xl border border-white/10">
                {(() => {
                  const selectedDate = calendarDates[selectedDateIndex];
                  const hijri = getHijriDate(selectedDate);
                  return (
                    <>
                      <p className="text-amber-400 font-bold text-lg">
                        {selectedDate.getDate()} {getGregorianMonthName(selectedDate)} {selectedDate.getFullYear()}م
                      </p>
                      <p className="text-white/60 text-sm mt-1">
                        {hijri.day} {hijri.month} {hijri.year}هـ
                      </p>
                    </>
                  );
                })()}
              </div>
              
              {/* Date Buttons */}
              <div ref={calendarRef} className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {calendarDates.map((date, i) => {
                  const hijri = getHijriDate(date);
                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDateSelect(i)}
                      className={`flex-shrink-0 w-20 py-3 rounded-2xl text-center transition-all ${
                        i === selectedDateIndex
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <p className={`text-[10px] mb-0.5 ${
                        i === selectedDateIndex ? 'text-black/70' : 'text-white/50'
                      }`}>
                        {formatDayName(date, i)}
                      </p>
                      <p className={`text-lg font-bold ${
                        i === selectedDateIndex ? 'text-black' : 'text-white'
                      }`}>
                        {date.getDate()}
                      </p>
                      <p className={`text-[10px] ${
                        i === selectedDateIndex ? 'text-black/60' : 'text-amber-500/70'
                      }`}>
                        {hijri.day} {hijri.month.slice(0, 4)}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
            {[
              { id: 'matches', label: 'المباريات', icon: Trophy },
              { id: 'standings', label: 'الترتيب', icon: TrendingUp },
              { id: 'scorers', label: 'الهدافين', icon: Target },
            ].map(tab => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-cairo font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* League Filter for standings/scorers */}
      {(activeTab === 'standings' || activeTab === 'scorers') && (
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {leagues.map(league => (
              <motion.button
                key={league.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleLeagueSelect(league)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedLeague?.id === league.id
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/50 text-amber-400'
                    : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{league.flag}</span>
                <span>{league.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4">
        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            {loadingFixtures ? (
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                <p className="text-white/40">جاري تحميل المباريات...</p>
              </div>
            ) : Object.keys(fixtures).length > 0 ? (
              Object.entries(fixtures).map(([leagueName, matches]) => (
                <LeagueCard
                  key={leagueName}
                  league={matches[0]?.league}
                  matches={matches}
                  onMatchClick={setSelectedMatch}
                  onLeagueClick={(leagueId) => navigate(`/league/${leagueId}`)}
                />
              ))
            ) : (
              <EmptyState message="لا توجد مباريات في هذا اليوم" />
            )}
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <div>
            {loading ? (
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                <p className="text-white/40">جاري تحميل الترتيب...</p>
              </div>
            ) : standings.length > 0 ? (
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-3xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center gap-3">
                  <img src={selectedLeague?.logo} alt="" className="w-8 h-8" />
                  <span className="text-white font-bold">{selectedLeague?.name}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/40 text-xs border-b border-white/10">
                        <th className="py-4 px-3 text-right">#</th>
                        <th className="py-4 px-3 text-right">الفريق</th>
                        <th className="py-4 px-2 text-center">لعب</th>
                        <th className="py-4 px-2 text-center">ف</th>
                        <th className="py-4 px-2 text-center">ت</th>
                        <th className="py-4 px-2 text-center">خ</th>
                        <th className="py-4 px-2 text-center">+/-</th>
                        <th className="py-4 px-3 text-center">نقاط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, i) => (
                        <tr
                          key={team.rank}
                          className={`border-b border-white/5 hover:bg-white/5 ${
                            team.rank <= 4 ? 'bg-emerald-500/5' :
                            team.rank >= standings.length - 2 ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                              team.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                              team.rank <= 4 ? 'bg-emerald-500/20 text-emerald-400' :
                              team.rank >= standings.length - 2 ? 'bg-red-500/20 text-red-400' :
                              'text-white/50'
                            }`}>
                              {team.rank}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <img src={team.logo} alt="" className="w-6 h-6" />
                              <span className="text-white text-xs">{team.team}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center text-white/60">{team.played}</td>
                          <td className="py-3 px-2 text-center text-emerald-400">{team.won}</td>
                          <td className="py-3 px-2 text-center text-white/40">{team.draw}</td>
                          <td className="py-3 px-2 text-center text-red-400">{team.lost}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={team.gd > 0 ? 'text-emerald-400' : team.gd < 0 ? 'text-red-400' : 'text-white/40'}>
                              {team.gd > 0 ? '+' : ''}{team.gd}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-white font-bold">{team.points}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState message="اختر دوري لعرض الترتيب" />
            )}
          </div>
        )}

        {/* Scorers Tab */}
        {activeTab === 'scorers' && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                <p className="text-white/40">جاري تحميل الهدافين...</p>
              </div>
            ) : scorers.length > 0 ? (
              scorers.map((scorer, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 p-4 flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    scorer.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                    scorer.rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                    scorer.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                    'bg-white/10 text-white'
                  }`}>
                    {scorer.rank}
                  </div>
                  <img src={scorer.logo} alt="" className="w-12 h-12 rounded-full border-2 border-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{scorer.player}</p>
                    <p className="text-white/50 text-sm">{scorer.team}</p>
                  </div>
                  <div className="text-center px-3 border-r border-white/10">
                    <p className="text-2xl font-bold text-amber-400">{scorer.goals}</p>
                    <p className="text-white/40 text-xs">أهداف</p>
                  </div>
                  <div className="text-center px-2">
                    <p className="text-xl font-bold text-emerald-400">{scorer.assists}</p>
                    <p className="text-white/40 text-xs">تمريرات</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <EmptyState message="اختر دوري لعرض الهدافين" />
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a1a]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.map(item => {
            const isActive = item.path === '/matches';
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl ${
                  isActive ? 'text-amber-500' : 'text-white/40'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Match Detail Modal */}
      <AnimatePresence>
        {selectedMatch && (
          <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// League Card
const LeagueCard = ({ league, matches, onMatchClick, onLeagueClick }) => (
  <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-3xl border border-white/10 overflow-hidden">
    <div 
      onClick={() => onLeagueClick && onLeagueClick(league?.id)}
      className="p-4 flex items-center gap-3 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
        {league?.flag || '⚽'}
      </div>
      <div className="flex-1">
        <h3 className="text-white font-bold">{league?.name || 'الدوري'}</h3>
        <p className="text-white/40 text-xs">{matches.length} مباراة</p>
      </div>
      <ChevronLeft className="w-5 h-5 text-amber-500" />
    </div>
    <div className="divide-y divide-white/5">
      {matches.map(match => (
        <MatchRow key={match.id} match={match} onClick={() => onMatchClick(match)} />
      ))}
    </div>
  </div>
);

// Match Row
const MatchRow = ({ match, onClick }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer hover:bg-white/5 transition-colors ${isLive ? 'bg-red-500/5' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 text-center flex-shrink-0">
          {isLive ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full mb-1">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-[10px] font-bold">LIVE</span>
              </div>
              <span className="text-red-400 font-bold text-sm">{match.minute}'</span>
            </div>
          ) : isFinished ? (
            <span className="text-white/40 text-sm">انتهت</span>
          ) : (
            <span className="text-amber-400 font-medium text-sm">{formatTime(match.date)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <img src={match.home_team.logo} alt="" className="w-6 h-6" />
              <span className={`text-sm ${isFinished && match.home_team.score > match.away_team.score ? 'text-white font-bold' : 'text-white/70'}`}>
                {match.home_team.name}
              </span>
            </div>
            {!isScheduled && (
              <span className={`text-lg font-bold ${match.home_team.score > match.away_team.score ? 'text-white' : 'text-white/50'}`}>
                {match.home_team.score}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={match.away_team.logo} alt="" className="w-6 h-6" />
              <span className={`text-sm ${isFinished && match.away_team.score > match.home_team.score ? 'text-white font-bold' : 'text-white/70'}`}>
                {match.away_team.name}
              </span>
            </div>
            {!isScheduled && (
              <span className={`text-lg font-bold ${match.away_team.score > match.home_team.score ? 'text-white' : 'text-white/50'}`}>
                {match.away_team.score}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Match Detail Modal
const MatchDetailModal = ({ match, onClose }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';

  // Convert to Hijri date for modal
  const getHijriDateForModal = (dateStr) => {
    const date = new Date(dateStr);
    const hijriMonths = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 
      'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
      'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
    ];
    try {
      const hijri = toHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
      return `${hijri.hd} ${hijriMonths[hijri.hm - 1]} ${hijri.hy}هـ`;
    } catch {
      return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg bg-gradient-to-br from-[#0d1025] to-[#0a0a1a] rounded-t-3xl border-t border-white/10 max-h-[80vh] overflow-hidden"
      >
        <div className="relative p-6 text-center border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          
          <p className="text-amber-500 text-sm mb-6">{match.league?.name}</p>
          
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <img src={match.home_team.logo} alt="" className="w-16 h-16 mx-auto mb-2" />
              <p className="text-white font-bold text-sm">{match.home_team.name}</p>
            </div>

            <div className="px-4">
              {isLive || isFinished ? (
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-white">{match.home_team.score}</span>
                  <span className="text-xl text-white/30">-</span>
                  <span className="text-4xl font-bold text-white">{match.away_team.score}</span>
                </div>
              ) : (
                <p className="text-amber-400 font-bold text-2xl">
                  {new Date(match.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {isLive && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 font-bold">{match.minute}'</span>
                </div>
              )}
              {isFinished && <p className="text-white/40 text-sm mt-2">انتهت</p>}
            </div>

            <div className="text-center">
              <img src={match.away_team.logo} alt="" className="w-16 h-16 mx-auto mb-2" />
              <p className="text-white font-bold text-sm">{match.away_team.name}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-white/60">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>{match.league?.name}</span>
          </div>
          <div className="flex items-center gap-3 text-white/60">
            <MapPin className="w-5 h-5 text-amber-500" />
            <span>{match.venue || 'غير محدد'}</span>
          </div>
          <div className="flex items-center gap-3 text-white/60">
            <Calendar className="w-5 h-5 text-amber-500" />
            <div className="flex flex-col">
              <span>{new Date(match.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}م</span>
              <span className="text-amber-400/70 text-sm">{getHijriDateForModal(match.date)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Empty State
const EmptyState = ({ message }) => (
  <div className="text-center py-16">
    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
      <Calendar className="w-10 h-10 text-white/20" />
    </div>
    <p className="text-white/40">{message}</p>
  </div>
);

export default MatchesPage;
