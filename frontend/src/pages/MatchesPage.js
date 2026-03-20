import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Trophy, 
  Clock, 
  Calendar,
  TrendingUp,
  Target,
  Loader2,
  Radio,
  ChevronDown,
  ChevronUp,
  RefreshCw
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
  const [expandedDates, setExpandedDates] = useState({});
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchLeagues();
    fetchTodayFixtures();
    fetchUpcomingFixtures();
    
    // Auto refresh every 60 seconds for live matches
    pollInterval.current = setInterval(() => {
      if (activeTab === 'today') {
        fetchTodayFixtures(true);
      }
    }, 60000);

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
      // Expand first 3 dates by default
      const dates = Object.keys(response.data.fixtures || {}).slice(0, 3);
      const expanded = {};
      dates.forEach(d => expanded[d] = true);
      setExpandedDates(expanded);
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
    if (activeTab === 'today') {
      await fetchTodayFixtures();
    } else if (activeTab === 'upcoming') {
      await fetchUpcomingFixtures();
    }
    setRefreshing(false);
  };

  const toggleDateExpand = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'اليوم';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'غداً';
    }
    
    return date.toLocaleDateString('ar-SA', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const liveCount = Object.values(todayFixtures).flat().filter(m => m.status === 'LIVE').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white font-cairo">المباريات</h1>
                <p className="text-emerald-400 text-xs">موسم 2025-2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {liveCount > 0 && (
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/50 px-2.5 py-1 rounded-full"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 font-bold text-xs">{liveCount} LIVE</span>
                </motion.div>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl">
            {[
              { id: 'today', label: 'اليوم', icon: Radio },
              { id: 'upcoming', label: 'القادمة', icon: Calendar },
              { id: 'standings', label: 'الترتيب', icon: TrendingUp },
              { id: 'scorers', label: 'الهدافين', icon: Target },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-cairo font-bold rounded-lg transition-all ${
                  activeTab === tab.id 
                    ? 'bg-emerald-500 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* League Filter for standings/scorers */}
        {(activeTab === 'standings' || activeTab === 'scorers') && (
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {leagues.map((league) => (
                <button
                  key={league.id}
                  onClick={() => setSelectedLeague(league)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-cairo font-bold transition-all ${
                    selectedLeague?.id === league.id 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{league.flag}</span>
                  <span>{league.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {/* Today's Fixtures */}
          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {Object.keys(todayFixtures).length > 0 ? (
                Object.entries(todayFixtures).map(([leagueName, matches]) => (
                  <div key={leagueName} className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-800">
                    <div className="px-4 py-3 bg-slate-800/50 flex items-center gap-2">
                      <span className="text-lg">{matches[0]?.league?.flag || '⚽'}</span>
                      <span className="text-white font-cairo font-bold text-sm">{leagueName}</span>
                      <span className="text-slate-500 text-xs mr-auto">{matches.length} مباراة</span>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                      {matches.map((match) => (
                        <MatchRow key={match.id} match={match} />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-cairo">لا توجد مباريات اليوم</p>
                  <p className="text-slate-500 text-sm mt-1">تحقق من المباريات القادمة</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Upcoming Fixtures */}
          {activeTab === 'upcoming' && (
            <motion.div
              key="upcoming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {Object.keys(upcomingFixtures).length > 0 ? (
                Object.entries(upcomingFixtures).map(([date, matches]) => (
                  <div key={date} className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-800">
                    <button
                      onClick={() => toggleDateExpand(date)}
                      className="w-full px-4 py-3 bg-slate-800/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                        <span className="text-white font-cairo font-bold">{formatDate(date)}</span>
                        <span className="text-slate-500 text-sm">{date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 text-sm font-bold">{matches.length} مباراة</span>
                        {expandedDates[date] ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {expandedDates[date] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="divide-y divide-slate-800/50"
                        >
                          {matches.map((match) => (
                            <MatchRow key={match.id} match={match} showLeague />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-cairo">لا توجد مباريات قادمة</p>
                </div>
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
              {selectedLeague && standings.length > 0 ? (
                <div className="bg-slate-900/50 rounded-xl overflow-hidden border border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 bg-slate-800/50 text-xs">
                          <th className="py-3 px-3 text-right">#</th>
                          <th className="py-3 px-3 text-right">الفريق</th>
                          <th className="py-3 px-2 text-center">لعب</th>
                          <th className="py-3 px-2 text-center">ف</th>
                          <th className="py-3 px-2 text-center">ت</th>
                          <th className="py-3 px-2 text-center">خ</th>
                          <th className="py-3 px-2 text-center hidden sm:table-cell">له</th>
                          <th className="py-3 px-2 text-center hidden sm:table-cell">عليه</th>
                          <th className="py-3 px-2 text-center">+/-</th>
                          <th className="py-3 px-3 text-center">نقاط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team, index) => (
                          <motion.tr 
                            key={team.rank}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`border-b border-slate-800/30 hover:bg-slate-800/30 ${
                              team.rank <= 4 ? 'bg-emerald-500/5' : 
                              team.rank >= standings.length - 2 ? 'bg-red-500/5' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                team.rank === 1 ? 'bg-amber-500 text-black' :
                                team.rank <= 4 ? 'bg-emerald-500/30 text-emerald-400' :
                                team.rank >= standings.length - 2 ? 'bg-red-500/30 text-red-400' :
                                'text-slate-400'
                              }`}>
                                {team.rank}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <img src={team.logo} alt="" className="w-5 h-5" />
                                <span className="text-white font-cairo text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{team.team}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-400">{team.played}</td>
                            <td className="py-2.5 px-2 text-center text-green-400">{team.won}</td>
                            <td className="py-2.5 px-2 text-center text-slate-400">{team.draw}</td>
                            <td className="py-2.5 px-2 text-center text-red-400">{team.lost}</td>
                            <td className="py-2.5 px-2 text-center text-slate-400 hidden sm:table-cell">{team.gf}</td>
                            <td className="py-2.5 px-2 text-center text-slate-400 hidden sm:table-cell">{team.ga}</td>
                            <td className="py-2.5 px-2 text-center">
                              <span className={team.gd > 0 ? 'text-green-400' : team.gd < 0 ? 'text-red-400' : 'text-slate-400'}>
                                {team.gd > 0 ? '+' : ''}{team.gd}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-bold text-white text-sm">{team.points}</span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-cairo">اختر دوري لعرض الترتيب</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Top Scorers */}
          {activeTab === 'scorers' && (
            <motion.div
              key="scorers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              {selectedLeague && scorers.length > 0 ? (
                scorers.map((scorer, index) => (
                  <motion.div
                    key={scorer.rank}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      scorer.rank === 1 ? 'bg-amber-500 text-black' :
                      scorer.rank === 2 ? 'bg-slate-400 text-black' :
                      scorer.rank === 3 ? 'bg-amber-700 text-white' :
                      'bg-slate-700 text-white'
                    }`}>
                      {scorer.rank}
                    </div>
                    <img src={scorer.logo} alt="" className="w-10 h-10 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-cairo font-bold text-sm truncate">{scorer.player}</p>
                      <p className="text-slate-500 text-xs">{scorer.team}</p>
                    </div>
                    <div className="text-center px-2">
                      <p className="text-xl font-bold text-amber-400">{scorer.goals}</p>
                      <p className="text-[10px] text-slate-500">هدف</p>
                    </div>
                    <div className="text-center px-2 border-r border-slate-700">
                      <p className="text-lg font-bold text-emerald-400">{scorer.assists}</p>
                      <p className="text-[10px] text-slate-500">تمريرة</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-16">
                  <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-cairo">اختر دوري لعرض الهدافين</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Match Row Component
const MatchRow = ({ match, showLeague = false }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`px-4 py-3 flex items-center gap-3 ${isLive ? 'bg-red-500/5' : ''}`}>
      {/* Time/Status */}
      <div className="w-14 text-center flex-shrink-0">
        {isLive ? (
          <div className="flex flex-col items-center">
            <span className="text-red-500 text-xs font-bold animate-pulse">LIVE</span>
            <span className="text-red-400 text-sm font-bold">{match.minute}'</span>
          </div>
        ) : isFinished ? (
          <span className="text-slate-500 text-xs">انتهت</span>
        ) : (
          <span className="text-slate-300 text-sm font-medium">{formatTime(match.date)}</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex-1 min-w-0">
        {showLeague && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs">{match.league?.flag}</span>
            <span className="text-slate-500 text-[10px]">{match.league?.name}</span>
          </div>
        )}
        
        {/* Home Team */}
        <div className="flex items-center gap-2 mb-1">
          <img src={match.home_team.logo} alt="" className="w-5 h-5" />
          <span className={`text-sm truncate ${
            isFinished && match.home_team.score > match.away_team.score ? 'text-white font-bold' : 'text-slate-300'
          }`}>
            {match.home_team.name}
          </span>
        </div>
        
        {/* Away Team */}
        <div className="flex items-center gap-2">
          <img src={match.away_team.logo} alt="" className="w-5 h-5" />
          <span className={`text-sm truncate ${
            isFinished && match.away_team.score > match.home_team.score ? 'text-white font-bold' : 'text-slate-300'
          }`}>
            {match.away_team.name}
          </span>
        </div>
      </div>

      {/* Score */}
      {(isLive || isFinished) && (
        <div className="w-10 text-center flex-shrink-0">
          <div className={`text-lg font-bold ${
            match.home_team.score > match.away_team.score ? 'text-white' : 'text-slate-400'
          }`}>
            {match.home_team.score}
          </div>
          <div className={`text-lg font-bold ${
            match.away_team.score > match.home_team.score ? 'text-white' : 'text-slate-400'
          }`}>
            {match.away_team.score}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchesPage;
