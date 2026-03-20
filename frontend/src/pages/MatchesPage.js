import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Trophy, 
  Clock, 
  Calendar,
  TrendingUp,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Radio,
  Star,
  Filter
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MatchesPage = () => {
  const [leagues, setLeagues] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [activeTab, setActiveTab] = useState('live'); // live, upcoming, finished, standings, scorers
  const [loading, setLoading] = useState(true);
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchLeagues();
    fetchMatches();
    
    // Poll for live updates every 30 seconds
    pollInterval.current = setInterval(() => {
      if (activeTab === 'live') {
        fetchMatches();
      }
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

  const fetchMatches = async () => {
    try {
      const response = await axios.get(`${API}/football/matches`);
      setMatches(response.data.matches);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
      setLoading(false);
    }
  };

  const fetchStandings = async (leagueId) => {
    try {
      const response = await axios.get(`${API}/football/standings/${leagueId}`);
      setStandings(response.data.standings);
    } catch (error) {
      console.error('Failed to fetch standings:', error);
    }
  };

  const fetchScorers = async (leagueId) => {
    try {
      const response = await axios.get(`${API}/football/scorers/${leagueId}`);
      setScorers(response.data.scorers);
    } catch (error) {
      console.error('Failed to fetch scorers:', error);
    }
  };

  const filteredMatches = matches.filter(m => {
    if (activeTab === 'live') return m.status === 'LIVE';
    if (activeTab === 'upcoming') return m.status === 'SCHEDULED';
    if (activeTab === 'finished') return m.status === 'FINISHED';
    return true;
  }).filter(m => !selectedLeague || m.league.id === selectedLeague.id);

  const liveCount = matches.filter(m => m.status === 'LIVE').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950 pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-emerald-500/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white font-cairo">المباريات</h1>
                <p className="text-emerald-400 text-sm">نتائج مباشرة</p>
              </div>
            </div>
            {liveCount > 0 && (
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 bg-red-500/20 border border-red-500/50 px-3 py-1.5 rounded-full"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 font-bold text-sm">{liveCount} مباشر</span>
              </motion.div>
            )}
          </div>

          {/* League Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            <button
              onClick={() => setSelectedLeague(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-cairo font-bold transition-all ${
                !selectedLeague 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              الكل
            </button>
            {leagues.map((league) => (
              <button
                key={league.id}
                onClick={() => setSelectedLeague(league)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-cairo font-bold transition-all ${
                  selectedLeague?.id === league.id 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <span>{league.flag}</span>
                <span className="hidden sm:inline">{league.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex border-b border-white/10">
            {[
              { id: 'live', label: 'مباشر', icon: Radio, color: 'red' },
              { id: 'upcoming', label: 'قادمة', icon: Calendar, color: 'blue' },
              { id: 'finished', label: 'منتهية', icon: Clock, color: 'gray' },
              { id: 'standings', label: 'الترتيب', icon: TrendingUp, color: 'emerald' },
              { id: 'scorers', label: 'الهدافين', icon: Target, color: 'amber' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-cairo font-bold transition-all border-b-2 ${
                  activeTab === tab.id 
                    ? `border-${tab.color}-500 text-${tab.color}-400` 
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Matches List */}
          {['live', 'upcoming', 'finished'].includes(activeTab) && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {filteredMatches.length > 0 ? (
                filteredMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-10 h-10 text-slate-500" />
                  </div>
                  <p className="text-slate-400 font-cairo">لا توجد مباريات</p>
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
              {selectedLeague ? (
                <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-emerald-500/20 overflow-hidden">
                  <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <img src={selectedLeague.logo} alt="" className="w-8 h-8" />
                    <h3 className="text-white font-cairo font-bold">{selectedLeague.name}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-white/10">
                          <th className="py-3 px-4 text-right">#</th>
                          <th className="py-3 px-4 text-right">الفريق</th>
                          <th className="py-3 px-2 text-center">لعب</th>
                          <th className="py-3 px-2 text-center">فاز</th>
                          <th className="py-3 px-2 text-center">تعادل</th>
                          <th className="py-3 px-2 text-center">خسر</th>
                          <th className="py-3 px-2 text-center hidden sm:table-cell">له</th>
                          <th className="py-3 px-2 text-center hidden sm:table-cell">عليه</th>
                          <th className="py-3 px-2 text-center">+/-</th>
                          <th className="py-3 px-4 text-center font-bold">نقاط</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team, index) => (
                          <motion.tr 
                            key={team.rank}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`border-b border-white/5 hover:bg-white/5 ${
                              team.rank <= 4 ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                team.rank === 1 ? 'bg-amber-500 text-black' :
                                team.rank <= 4 ? 'bg-emerald-500/20 text-emerald-400' :
                                'bg-slate-700 text-slate-300'
                              }`}>
                                {team.rank}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <img src={team.logo} alt="" className="w-6 h-6" />
                                <span className="text-white font-cairo">{team.team}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center text-slate-300">{team.played}</td>
                            <td className="py-3 px-2 text-center text-green-400">{team.won}</td>
                            <td className="py-3 px-2 text-center text-slate-400">{team.draw}</td>
                            <td className="py-3 px-2 text-center text-red-400">{team.lost}</td>
                            <td className="py-3 px-2 text-center text-slate-300 hidden sm:table-cell">{team.gf}</td>
                            <td className="py-3 px-2 text-center text-slate-300 hidden sm:table-cell">{team.ga}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={team.gd > 0 ? 'text-green-400' : team.gd < 0 ? 'text-red-400' : 'text-slate-400'}>
                                {team.gd > 0 ? '+' : ''}{team.gd}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-bold text-white bg-emerald-500/20 px-2 py-1 rounded">
                                {team.points}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
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
              className="space-y-4"
            >
              {selectedLeague ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <img src={selectedLeague.logo} alt="" className="w-8 h-8" />
                    <h3 className="text-white font-cairo font-bold">{selectedLeague.name} - الهدافين</h3>
                  </div>
                  {scorers.map((scorer, index) => (
                    <motion.div
                      key={scorer.rank}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-slate-900/50 backdrop-blur rounded-xl border border-amber-500/20 p-4 flex items-center gap-4"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        scorer.rank === 1 ? 'bg-amber-500 text-black' :
                        scorer.rank === 2 ? 'bg-slate-400 text-black' :
                        scorer.rank === 3 ? 'bg-amber-700 text-white' :
                        'bg-slate-700 text-white'
                      }`}>
                        {scorer.rank}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-cairo font-bold">{scorer.player}</p>
                        <p className="text-slate-400 text-sm">{scorer.team}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-400">{scorer.goals}</p>
                        <p className="text-xs text-slate-500">هدف</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400">{scorer.assists}</p>
                        <p className="text-xs text-slate-500">تمريرة</p>
                      </div>
                    </motion.div>
                  ))}
                </>
              ) : (
                <div className="text-center py-16">
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

// Match Card Component
const MatchCard = ({ match }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-900/50 backdrop-blur rounded-2xl border overflow-hidden ${
        isLive ? 'border-red-500/50 shadow-lg shadow-red-500/10' : 
        isFinished ? 'border-slate-700/50' : 
        'border-emerald-500/20'
      }`}
    >
      {/* League Header */}
      <div className="px-4 py-2 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{match.league.flag}</span>
          <span className="text-slate-400 text-sm font-cairo">{match.league.name}</span>
        </div>
        {isLive && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-sm font-bold">{match.minute}'</span>
          </div>
        )}
        {isScheduled && (
          <span className="text-emerald-400 text-sm">{formatDate(match.date)}</span>
        )}
        {isFinished && (
          <span className="text-slate-500 text-sm">انتهت</span>
        )}
      </div>

      {/* Match Content */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex-1 text-center">
            <img 
              src={match.home_team.logo} 
              alt={match.home_team.name}
              className="w-16 h-16 mx-auto mb-2 object-contain"
            />
            <p className="text-white font-cairo font-bold text-sm">{match.home_team.name}</p>
          </div>

          {/* Score */}
          <div className="px-6">
            {isScheduled ? (
              <div className="text-center">
                <p className="text-slate-500 text-sm">VS</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold ${
                  match.home_team.score > match.away_team.score ? 'text-emerald-400' : 'text-white'
                }`}>
                  {match.home_team.score}
                </span>
                <span className="text-slate-500">-</span>
                <span className={`text-3xl font-bold ${
                  match.away_team.score > match.home_team.score ? 'text-emerald-400' : 'text-white'
                }`}>
                  {match.away_team.score}
                </span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center">
            <img 
              src={match.away_team.logo} 
              alt={match.away_team.name}
              className="w-16 h-16 mx-auto mb-2 object-contain"
            />
            <p className="text-white font-cairo font-bold text-sm">{match.away_team.name}</p>
          </div>
        </div>

        {/* Venue */}
        <p className="text-center text-slate-500 text-xs mt-3">{match.venue}</p>
      </div>
    </motion.div>
  );
};

export default MatchesPage;
