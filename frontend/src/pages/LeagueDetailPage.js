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
  ChevronRight,
  ArrowRight,
  Users,
  Zap,
  Award
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
      // Fetch league info
      const leaguesRes = await axios.get(`${API}/football/leagues`);
      const leagueInfo = leaguesRes.data.leagues.find(l => l.id === parseInt(leagueId));
      setLeague(leagueInfo);

      // Fetch all data in parallel
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

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  // Group fixtures by round/date
  const groupedFixtures = fixtures.reduce((acc, match) => {
    const dateKey = match.date?.substring(0, 10) || 'upcoming';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(match);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] pb-8" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
        
        <div className="relative px-4 pt-6 pb-4">
          {/* Back Button */}
          <button 
            onClick={() => navigate('/matches')}
            className="flex items-center gap-2 text-white/60 mb-4 hover:text-white"
          >
            <ArrowRight className="w-5 h-5" />
            <span>رجوع</span>
          </button>

          {/* League Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-4xl">
              {league?.flag || '⚽'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-cairo">{league?.name}</h1>
              <p className="text-amber-500/70">موسم 2025-2026</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-4">
          <div className="flex gap-1 overflow-x-auto hide-scrollbar">
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
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-cairo font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
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
                  <div key={date} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                      <span className="text-amber-400 font-bold">{formatDate(date)}</span>
                    </div>
                    <div className="divide-y divide-white/5">
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
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/40 text-xs border-b border-white/10 bg-white/5">
                        <th className="py-3 px-3 text-right">#</th>
                        <th className="py-3 px-3 text-right">الفريق</th>
                        <th className="py-3 px-2 text-center">لعب</th>
                        <th className="py-3 px-2 text-center">ف</th>
                        <th className="py-3 px-2 text-center">ت</th>
                        <th className="py-3 px-2 text-center">خ</th>
                        <th className="py-3 px-2 text-center">+/-</th>
                        <th className="py-3 px-3 text-center">نقاط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team) => (
                        <tr
                          key={team.rank}
                          className={`border-b border-white/5 ${
                            team.rank <= 4 ? 'bg-emerald-500/5' :
                            team.rank >= standings.length - 2 ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                              team.rank === 1 ? 'bg-amber-500 text-black' :
                              team.rank <= 4 ? 'bg-emerald-500/30 text-emerald-400' :
                              team.rank >= standings.length - 2 ? 'bg-red-500/30 text-red-400' :
                              'text-white/50'
                            }`}>
                              {team.rank}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <img src={team.logo} alt="" className="w-5 h-5" />
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
              className="space-y-3"
            >
              {scorers.length > 0 ? (
                scorers.map((scorer, i) => (
                  <PlayerCard key={i} player={scorer} type="goals" />
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
              className="space-y-3"
            >
              {assists.length > 0 ? (
                assists.map((player, i) => (
                  <PlayerCard key={i} player={player} type="assists" />
                ))
              ) : (
                <EmptyState message="صانعي الأهداف غير متوفرين" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
    <div className={`p-4 ${isLive ? 'bg-red-500/5' : ''}`}>
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
              <img src={match.home_team?.logo} alt="" className="w-5 h-5" />
              <span className={`text-sm ${isFinished && match.home_team?.score > match.away_team?.score ? 'text-white font-bold' : 'text-white/70'}`}>
                {match.home_team?.name}
              </span>
            </div>
            {!isScheduled && (
              <span className={`text-lg font-bold ${match.home_team?.score > match.away_team?.score ? 'text-white' : 'text-white/50'}`}>
                {match.home_team?.score}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={match.away_team?.logo} alt="" className="w-5 h-5" />
              <span className={`text-sm ${isFinished && match.away_team?.score > match.home_team?.score ? 'text-white font-bold' : 'text-white/70'}`}>
                {match.away_team?.name}
              </span>
            </div>
            {!isScheduled && (
              <span className={`text-lg font-bold ${match.away_team?.score > match.home_team?.score ? 'text-white' : 'text-white/50'}`}>
                {match.away_team?.score}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Player Card
const PlayerCard = ({ player, type }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/5 rounded-2xl border border-white/10 p-4 flex items-center gap-4"
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
      player.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
      player.rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
      player.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
      'bg-white/10 text-white'
    }`}>
      {player.rank}
    </div>
    <img src={player.logo} alt="" className="w-12 h-12 rounded-full border-2 border-white/10" />
    <div className="flex-1 min-w-0">
      <p className="text-white font-bold truncate">{player.player}</p>
      <p className="text-white/50 text-sm">{player.team}</p>
    </div>
    <div className="text-center">
      <p className={`text-2xl font-bold ${type === 'goals' ? 'text-amber-400' : 'text-emerald-400'}`}>
        {type === 'goals' ? player.goals : player.assists}
      </p>
      <p className="text-white/40 text-xs">{type === 'goals' ? 'هدف' : 'تمريرة'}</p>
    </div>
  </motion.div>
);

// Empty State
const EmptyState = ({ message }) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
      <Trophy className="w-8 h-8 text-white/20" />
    </div>
    <p className="text-white/40">{message}</p>
  </div>
);

export default LeagueDetailPage;
