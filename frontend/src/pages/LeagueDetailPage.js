import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Trophy, 
  Calendar,
  TrendingUp,
  Target,
  Loader2,
  ArrowRight,
  Award,
  Flame,
  Star,
  Zap
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LeagueDetailPage = () => {
  const navigate = useNavigate();
  const { leagueId } = useParams();
  const [league, setLeague] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [assists, setAssists] = useState([]);
  const [activeTab, setActiveTab] = useState('fixtures');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeagueData();
  }, [leagueId]);

  const fetchLeagueData = async () => {
    setLoading(true);
    try {
      const leaguesRes = await axios.get(`${API}/football/leagues`);
      const leagueInfo = leaguesRes.data.leagues.find(l => l.id === parseInt(leagueId));
      setLeague(leagueInfo);

      const [fixturesRes, standingsRes, scorersRes, assistsRes] = await Promise.all([
        axios.get(`${API}/football/league/${leagueId}/fixtures`),
        axios.get(`${API}/football/standings/${leagueId}`),
        axios.get(`${API}/football/scorers/${leagueId}`),
        axios.get(`${API}/football/assists/${leagueId}`)
      ]);

      setFixtures(fixturesRes.data.fixtures || []);
      setStandings(standingsRes.data.standings || []);
      setScorers(scorersRes.data.scorers || []);
      setAssists(assistsRes.data.assists || []);
    } catch (error) {
      console.error('Failed to fetch league data:', error);
    }
    setLoading(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
  };

  const groupedFixtures = fixtures.reduce((acc, match) => {
    const dateKey = match.date?.substring(0, 10) || 'upcoming';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(match);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-lime-400" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-lime-400" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-lime-400 rounded-full" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-lime-500/30 to-emerald-500/30 flex items-center justify-center border border-lime-500/30">
            <Loader2 className="w-10 h-10 text-lime-400 animate-spin" />
          </div>
          <p className="text-lime-400 font-cairo font-bold">جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-8 relative overflow-hidden" dir="rtl">
      {/* Stadium Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-lime-400" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-lime-400" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-lime-400 rounded-full" />
        </div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-lime-500/10 via-lime-500/5 to-transparent" />
          
          <div className="relative px-4 pt-6 pb-4">
            {/* Back Button */}
            <motion.button 
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/matches')}
              className="flex items-center gap-2 text-lime-400 mb-6 hover:text-lime-300 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              <span className="font-cairo font-bold">رجوع</span>
            </motion.button>

            {/* League Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-8"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-lime-500/20 to-emerald-500/20 flex items-center justify-center text-5xl border border-lime-500/30 shadow-[0_0_30px_rgba(163,230,53,0.2)]">
                  {league?.flag || '⚽'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5 text-slate-900" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-lime-400 to-emerald-400 font-cairo">
                  {league?.name}
                </h1>
                <p className="text-lime-400/70 font-almarai flex items-center gap-2 mt-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  موسم 2025-2026
                </p>
              </div>
            </motion.div>
          </div>

          {/* Tabs */}
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar bg-slate-900/50 p-2 rounded-2xl border border-slate-700/50">
              {[
                { id: 'fixtures', label: 'المباريات', icon: Calendar },
                { id: 'standings', label: 'الترتيب', icon: TrendingUp },
                { id: 'scorers', label: 'الهدافين', icon: Target },
                { id: 'assists', label: 'صانعي الأهداف', icon: Award },
              ].map(tab => (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-cairo font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-900 shadow-[0_0_20px_rgba(163,230,53,0.3)]'
                      : 'text-slate-400 hover:text-lime-400 hover:bg-slate-800/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4">
          <AnimatePresence mode="wait">
            {/* Fixtures */}
            {activeTab === 'fixtures' && (
              <motion.div
                key="fixtures"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {Object.keys(groupedFixtures).length > 0 ? (
                  Object.entries(groupedFixtures).map(([date, matches]) => (
                    <div key={date} className="bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden">
                      <div className="px-5 py-4 bg-lime-500/10 border-b border-lime-500/20">
                        <span className="text-lime-400 font-cairo font-bold flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(date)}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-700/30">
                        {matches.map(match => (
                          <MatchRow key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="لا توجد مباريات" />
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
                  <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/50 rounded-3xl border border-slate-700/50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-400 text-xs border-b border-slate-700/50 bg-slate-800/30">
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
                          {standings.map((team) => (
                            <motion.tr
                              key={team.rank}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: team.rank * 0.02 }}
                              className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors ${
                                team.rank <= 4 ? 'bg-emerald-500/5' :
                                team.rank >= standings.length - 2 ? 'bg-red-500/5' : ''
                              }`}
                            >
                              <td className="py-3 px-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                  team.rank === 1 ? 'bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(163,230,53,0.4)]' :
                                  team.rank <= 4 ? 'bg-emerald-500/20 text-emerald-400' :
                                  team.rank >= standings.length - 2 ? 'bg-red-500/20 text-red-400' :
                                  'text-slate-400'
                                }`}>
                                  {team.rank}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-3">
                                  <img src={team.logo} alt="" className="w-7 h-7" />
                                  <span className="text-white font-cairo text-sm">{team.team}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center text-slate-400">{team.played}</td>
                              <td className="py-3 px-2 text-center text-emerald-400 font-bold">{team.won}</td>
                              <td className="py-3 px-2 text-center text-slate-500">{team.draw}</td>
                              <td className="py-3 px-2 text-center text-red-400">{team.lost}</td>
                              <td className="py-3 px-2 text-center">
                                <span className={`font-bold ${team.gd > 0 ? 'text-emerald-400' : team.gd < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                  {team.gd > 0 ? '+' : ''}{team.gd}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-lime-400 font-black text-lg">{team.points}</span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <EmptyState message="الترتيب غير متوفر" />
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
                {scorers.length > 0 ? (
                  scorers.map((scorer, i) => (
                    <PlayerCard key={i} player={scorer} type="goals" index={i} />
                  ))
                ) : (
                  <EmptyState message="الهدافين غير متوفرين" />
                )}
              </motion.div>
            )}

            {/* Top Assists */}
            {activeTab === 'assists' && (
              <motion.div
                key="assists"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {assists.length > 0 ? (
                  assists.map((player, i) => (
                    <PlayerCard key={i} player={player} type="assists" index={i} />
                  ))
                ) : (
                  <EmptyState message="صانعي الأهداف غير متوفرين" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Match Row
const MatchRow = ({ match }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`p-5 ${isLive ? 'bg-red-500/5' : ''} hover:bg-slate-800/30 transition-colors`}
    >
      <div className="flex items-center gap-4">
        <div className="w-16 text-center flex-shrink-0">
          {isLive ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-orange-500 px-3 py-1 rounded-full mb-1 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-[10px] font-bold">LIVE</span>
              </div>
              <span className="text-red-400 font-bold text-lg">{match.minute}'</span>
            </div>
          ) : isFinished ? (
            <span className="text-slate-500 text-sm font-cairo">انتهت</span>
          ) : (
            <span className="text-lime-400 font-bold text-sm">{formatTime(match.date)}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img src={match.home_team?.logo} alt="" className="w-7 h-7" />
              <span className={`font-cairo ${isFinished && match.home_team?.score > match.away_team?.score ? 'text-white font-bold' : 'text-slate-300'}`}>
                {match.home_team?.name}
              </span>
            </div>
            {!isScheduled && (
              <span className={`text-2xl font-black ${match.home_team?.score > match.away_team?.score ? 'text-lime-400' : 'text-slate-500'}`}>
                {match.home_team?.score}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={match.away_team?.logo} alt="" className="w-7 h-7" />
              <span className={`font-cairo ${isFinished && match.away_team?.score > match.home_team?.score ? 'text-white font-bold' : 'text-slate-300'}`}>
                {match.away_team?.name}
              </span>
            </div>
            {!isScheduled && (
              <span className={`text-2xl font-black ${match.away_team?.score > match.home_team?.score ? 'text-lime-400' : 'text-slate-500'}`}>
                {match.away_team?.score}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Player Card
const PlayerCard = ({ player, type, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/50 rounded-2xl border border-slate-700/50 p-5 flex items-center gap-4 hover:border-lime-500/30 transition-all group"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
      player.rank === 1 ? 'bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-900 shadow-[0_0_20px_rgba(163,230,53,0.4)]' :
      player.rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900' :
      player.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
      'bg-slate-800/80 text-slate-400'
    }`}>
      {player.rank === 1 && <Star className="w-5 h-5 mr-1" />}
      {player.rank}
    </div>
    <div className="relative">
      <img src={player.logo} alt="" className="w-14 h-14 rounded-full border-2 border-slate-700 group-hover:border-lime-500/50 transition-colors" />
      {player.rank === 1 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-lime-400 rounded-full flex items-center justify-center">
          <Zap className="w-3 h-3 text-slate-900" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white font-cairo font-bold truncate text-lg">{player.player}</p>
      <p className="text-slate-500 text-sm">{player.team}</p>
    </div>
    <div className="text-center px-4 py-2 rounded-xl bg-slate-800/50">
      <p className={`text-3xl font-black ${type === 'goals' ? 'text-lime-400' : 'text-emerald-400'}`}>
        {type === 'goals' ? player.goals : player.assists}
      </p>
      <p className="text-slate-500 text-xs font-cairo">{type === 'goals' ? 'هدف' : 'تمريرة'}</p>
    </div>
  </motion.div>
);

// Empty State
const EmptyState = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-20"
  >
    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-lime-500/20 to-emerald-500/20 flex items-center justify-center border border-lime-500/20">
      <Trophy className="w-12 h-12 text-lime-400/30" />
    </div>
    <p className="text-slate-500 font-cairo text-lg">{message}</p>
  </motion.div>
);

export default LeagueDetailPage;
