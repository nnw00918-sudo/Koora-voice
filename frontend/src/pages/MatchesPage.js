import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Trophy, 
  Calendar,
  TrendingUp,
  Target,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Star,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  BarChart3,
  X,
  Flame,
  Zap
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MatchesPage = () => {
  const [leagues, setLeagues] = useState([]);
  const [todayFixtures, setTodayFixtures] = useState({});
  const [upcomingFixtures, setUpcomingFixtures] = useState({});
  const [standings, setStandings] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchLeagues();
    fetchTodayFixtures();
    fetchUpcomingFixtures();
    
    pollInterval.current = setInterval(() => {
      fetchTodayFixtures(true);
    }, 30000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  useEffect(() => {
    if (selectedLeague) {
      fetchStandings(selectedLeague.id);
      fetchScorers(selectedLeague.id);
    }
  }, [selectedLeague]);

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

  const fetchTodayFixtures = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(`${API}/football/fixtures/today`);
      setTodayFixtures(response.data.fixtures || {});
    } catch (error) {
      console.error('Failed to fetch today fixtures:', error);
    }
    if (!silent) setLoading(false);
  };

  const fetchUpcomingFixtures = async () => {
    try {
      const response = await axios.get(`${API}/football/fixtures/upcoming?days=7`);
      setUpcomingFixtures(response.data.fixtures || {});
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch upcoming fixtures:', error);
      setLoading(false);
    }
  };

  const fetchStandings = async (leagueId) => {
    try {
      const response = await axios.get(`${API}/football/standings/${leagueId}`);
      setStandings(response.data.standings || []);
    } catch (error) {
      console.error('Failed to fetch standings:', error);
    }
  };

  const fetchScorers = async (leagueId) => {
    try {
      const response = await axios.get(`${API}/football/scorers/${leagueId}`);
      setScorers(response.data.scorers || []);
    } catch (error) {
      console.error('Failed to fetch scorers:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTodayFixtures();
    await fetchUpcomingFixtures();
    setRefreshing(false);
  };

  const allMatches = Object.values(todayFixtures).flat();
  const liveCount = allMatches.filter(m => m.status === 'LIVE').length;

  // Generate calendar dates
  const getCalendarDates = () => {
    const dates = [];
    for (let i = -2; i <= 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDateShort = (date) => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[date.getDay()];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-amber-500/30 border-t-amber-500"
          />
          <p className="text-amber-500/70 font-cairo">جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] pb-24" dir="rtl">
      {/* Premium Header */}
      <div className="relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        
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
                  className="flex items-center gap-1.5 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 px-3 py-1.5 rounded-full"
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
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {getCalendarDates().map((date, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 w-16 py-3 rounded-2xl text-center transition-all ${
                  date.toDateString() === selectedDate.toDateString()
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <p className={`text-xs mb-1 ${
                  date.toDateString() === selectedDate.toDateString() ? 'text-black/70' : 'text-white/50'
                }`}>
                  {isToday(date) ? 'اليوم' : formatDateShort(date)}
                </p>
                <p className={`text-lg font-bold ${
                  date.toDateString() === selectedDate.toDateString() ? 'text-black' : 'text-white'
                }`}>
                  {date.getDate()}
                </p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Premium Tabs */}
        <div className="px-4 pb-4">
          <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
            {[
              { id: 'today', label: 'المباريات', icon: Trophy },
              { id: 'standings', label: 'الترتيب', icon: TrendingUp },
              { id: 'scorers', label: 'الهدافين', icon: Target },
            ].map(tab => (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
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

      {/* League Filter */}
      {(activeTab === 'standings' || activeTab === 'scorers') && (
        <div className="px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {leagues.map(league => (
              <motion.button
                key={league.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedLeague(league)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedLeague?.id === league.id
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/50 text-amber-400'
                    : 'bg-white/5 border border-white/10 text-white/70'
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
        <AnimatePresence mode="wait">
          {/* Matches */}
          {activeTab === 'today' && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {Object.keys(todayFixtures).length > 0 ? (
                Object.entries(todayFixtures).map(([leagueName, matches]) => (
                  <LeagueCard
                    key={leagueName}
                    league={matches[0]?.league}
                    matches={matches}
                    onMatchClick={setSelectedMatch}
                  />
                ))
              ) : (
                <EmptyState message="لا توجد مباريات اليوم" />
              )}
            </motion.div>
          )}

          {/* Standings */}
          {activeTab === 'standings' && (
            <motion.div
              key="standings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {standings.length > 0 ? (
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-3xl border border-white/10 overflow-hidden">
                  <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <img src={selectedLeague?.logo} alt="" className="w-8 h-8" />
                    <span className="text-white font-bold">{selectedLeague?.name}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-white/40 text-xs border-b border-white/10">
                          <th className="py-4 px-4 text-right">#</th>
                          <th className="py-4 px-4 text-right">الفريق</th>
                          <th className="py-4 px-2 text-center">لعب</th>
                          <th className="py-4 px-2 text-center">ف</th>
                          <th className="py-4 px-2 text-center">ت</th>
                          <th className="py-4 px-2 text-center">خ</th>
                          <th className="py-4 px-2 text-center">+/-</th>
                          <th className="py-4 px-4 text-center">نقاط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team, i) => (
                          <motion.tr
                            key={team.rank}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                              team.rank <= 4 ? 'bg-emerald-500/5' :
                              team.rank >= standings.length - 2 ? 'bg-red-500/5' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                team.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                                team.rank <= 4 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                team.rank >= standings.length - 2 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                'text-white/50'
                              }`}>
                                {team.rank}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img src={team.logo} alt="" className="w-7 h-7" />
                                <span className="text-white font-medium">{team.team}</span>
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
                            <td className="py-3 px-4 text-center">
                              <span className="text-white font-bold text-lg">{team.points}</span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <EmptyState message="اختر دوري لعرض الترتيب" />
              )}
            </motion.div>
          )}

          {/* Scorers */}
          {activeTab === 'scorers' && (
            <motion.div
              key="scorers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {scorers.length > 0 ? (
                scorers.map((scorer, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
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
                    <img src={scorer.logo} alt="" className="w-14 h-14 rounded-full border-2 border-white/10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{scorer.player}</p>
                      <p className="text-white/50 text-sm">{scorer.team}</p>
                    </div>
                    <div className="text-center px-3 border-r border-white/10">
                      <p className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                        {scorer.goals}
                      </p>
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
            </motion.div>
          )}
        </AnimatePresence>
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

// Premium League Card
const LeagueCard = ({ league, matches, onMatchClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-3xl border border-white/10 overflow-hidden"
    >
      {/* League Header */}
      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
          {league?.flag || '⚽'}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold">{league?.name || 'الدوري'}</h3>
          <p className="text-white/40 text-xs">{matches.length} مباراة</p>
        </div>
        <ChevronLeft className="w-5 h-5 text-white/30" />
      </div>

      {/* Matches */}
      <div className="divide-y divide-white/5">
        {matches.map(match => (
          <PremiumMatchRow key={match.id} match={match} onClick={() => onMatchClick(match)} />
        ))}
      </div>
    </motion.div>
  );
};

// Premium Match Row
const PremiumMatchRow = ({ match, onClick }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`p-4 cursor-pointer transition-all ${isLive ? 'bg-gradient-to-r from-red-500/5 to-transparent' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Time/Status */}
        <div className="w-16 text-center flex-shrink-0">
          {isLive ? (
            <div className="inline-flex flex-col items-center">
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full mb-1"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                <span className="text-red-400 text-[10px] font-bold">LIVE</span>
              </motion.div>
              <span className="text-red-400 font-bold">{match.minute}'</span>
            </div>
          ) : isFinished ? (
            <span className="text-white/40 text-sm">انتهت</span>
          ) : (
            <span className="text-amber-400 font-medium">{formatTime(match.date)}</span>
          )}
        </div>

        {/* Teams & Score */}
        <div className="flex-1 min-w-0">
          {/* Home */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <img src={match.home_team.logo} alt="" className="w-7 h-7" />
              <span className={`font-medium ${
                isFinished && match.home_team.score > match.away_team.score ? 'text-white' : 'text-white/70'
              }`}>
                {match.home_team.name}
              </span>
            </div>
            {!isScheduled && (
              <span className={`text-lg font-bold min-w-[24px] text-center ${
                match.home_team.score > match.away_team.score ? 'text-white' : 'text-white/50'
              }`}>
                {match.home_team.score}
              </span>
            )}
          </div>
          {/* Away */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={match.away_team.logo} alt="" className="w-7 h-7" />
              <span className={`font-medium ${
                isFinished && match.away_team.score > match.home_team.score ? 'text-white' : 'text-white/70'
              }`}>
                {match.away_team.name}
              </span>
            </div>
            {!isScheduled && (
              <span className={`text-lg font-bold min-w-[24px] text-center ${
                match.away_team.score > match.home_team.score ? 'text-white' : 'text-white/50'
              }`}>
                {match.away_team.score}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Premium Match Detail Modal
const MatchDetailModal = ({ match, onClose }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const [activeTab, setActiveTab] = useState('info');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg bg-gradient-to-br from-[#0d1025] to-[#0a0a1a] rounded-t-3xl sm:rounded-3xl border border-white/10 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-6 text-center border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          
          <p className="text-amber-500 text-sm mb-6">{match.league?.name}</p>
          
          <div className="flex items-center justify-center gap-6">
            {/* Home */}
            <div className="text-center">
              <img src={match.home_team.logo} alt="" className="w-20 h-20 mx-auto mb-2" />
              <p className="text-white font-bold text-sm">{match.home_team.name}</p>
            </div>

            {/* Score */}
            <div className="px-4">
              {isLive || isFinished ? (
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-bold text-white">{match.home_team.score}</span>
                  <span className="text-2xl text-white/30">-</span>
                  <span className="text-5xl font-bold text-white">{match.away_team.score}</span>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-amber-400 font-bold text-2xl">
                    {new Date(match.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
              {isLive && (
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="mt-3 flex items-center justify-center gap-2"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-red-400 font-bold">{match.minute}'</span>
                </motion.div>
              )}
              {isFinished && <p className="text-white/40 text-sm mt-2">انتهت المباراة</p>}
            </div>

            {/* Away */}
            <div className="text-center">
              <img src={match.away_team.logo} alt="" className="w-20 h-20 mx-auto mb-2" />
              <p className="text-white font-bold text-sm">{match.away_team.name}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {[
            { id: 'info', label: 'المباراة' },
            { id: 'stats', label: 'إحصائيات' },
            { id: 'lineup', label: 'التشكيل' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-white/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-60 overflow-y-auto">
          {activeTab === 'info' && (
            <div className="space-y-4">
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
                <span>{new Date(match.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>
          )}
          {activeTab === 'stats' && (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">الإحصائيات غير متوفرة</p>
            </div>
          )}
          {activeTab === 'lineup' && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">التشكيل غير متوفر</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Empty State
const EmptyState = ({ message }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-16"
  >
    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
      <Calendar className="w-10 h-10 text-white/20" />
    </div>
    <p className="text-white/40">{message}</p>
  </motion.div>
);

export default MatchesPage;
