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
  ChevronLeft,
  Star,
  RefreshCw,
  Users,
  BarChart3,
  Flame,
  X
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
  const [matchDetailTab, setMatchDetailTab] = useState('match');
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchLeagues();
    fetchTodayFixtures();
    fetchUpcomingFixtures();
    
    pollInterval.current = setInterval(() => {
      if (activeTab === 'today' || activeTab === 'live') {
        fetchTodayFixtures(true);
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

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'اليوم';
    if (date.toDateString() === tomorrow.toDateString()) return 'غداً';
    
    return date.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Group all fixtures by league for today view
  const allTodayMatches = Object.values(todayFixtures).flat();
  const liveMatches = allTodayMatches.filter(m => m.status === 'LIVE');
  const liveCount = liveMatches.length;

  // Group upcoming by date then by league
  const upcomingByDate = Object.entries(upcomingFixtures).map(([date, matches]) => {
    const byLeague = {};
    matches.forEach(m => {
      const leagueName = m.league?.name || 'Other';
      if (!byLeague[leagueName]) byLeague[leagueName] = { league: m.league, matches: [] };
      byLeague[leagueName].matches.push(m);
    });
    return { date, leagues: Object.values(byLeague) };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-10 h-10 text-green-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-20" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-white text-xl font-bold font-cairo">النتائج</h1>
          <div className="flex items-center gap-3">
            {liveCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-600/20 px-2 py-1 rounded">
                <Flame className="w-4 h-4 text-red-500" />
                <span className="text-red-500 text-sm font-bold">{liveCount}</span>
              </div>
            )}
            <button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Star className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex border-b border-[#2a2a2a]">
          {[
            { id: 'today', label: 'اليوم' },
            { id: 'tomorrow', label: 'غداً' },
            { id: 'standings', label: 'الترتيب' },
            { id: 'scorers', label: 'الهدافين' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-cairo font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'text-green-500 border-b-2 border-green-500' 
                  : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* League Filter for standings/scorers */}
      {(activeTab === 'standings' || activeTab === 'scorers') && (
        <div className="bg-[#1a1a1a] px-4 py-2 overflow-x-auto">
          <div className="flex gap-2">
            {leagues.map(league => (
              <button
                key={league.id}
                onClick={() => setSelectedLeague(league)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  selectedLeague?.id === league.id 
                    ? 'bg-green-600 text-white' 
                    : 'bg-[#2a2a2a] text-gray-300'
                }`}
              >
                <span>{league.flag}</span>
                <span>{league.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-0">
        {/* Today's Matches */}
        {activeTab === 'today' && (
          <div>
            {Object.keys(todayFixtures).length > 0 ? (
              Object.entries(todayFixtures).map(([leagueName, matches]) => (
                <LeagueSection 
                  key={leagueName} 
                  league={matches[0]?.league} 
                  matches={matches}
                  onMatchClick={setSelectedMatch}
                />
              ))
            ) : (
              <EmptyState message="لا توجد مباريات اليوم" />
            )}
          </div>
        )}

        {/* Tomorrow's Matches */}
        {activeTab === 'tomorrow' && (
          <div>
            {upcomingByDate.length > 0 ? (
              upcomingByDate.slice(0, 2).map(({ date, leagues }) => (
                <div key={date}>
                  <div className="bg-[#1a1a1a] px-4 py-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span className="text-white font-bold text-sm">{formatDate(date)}</span>
                    <span className="text-gray-500 text-xs">{date}</span>
                  </div>
                  {leagues.map(({ league, matches }) => (
                    <LeagueSection 
                      key={league?.id || Math.random()} 
                      league={league} 
                      matches={matches}
                      onMatchClick={setSelectedMatch}
                    />
                  ))}
                </div>
              ))
            ) : (
              <EmptyState message="لا توجد مباريات قادمة" />
            )}
          </div>
        )}

        {/* Standings */}
        {activeTab === 'standings' && (
          <div className="p-4">
            {standings.length > 0 ? (
              <div className="bg-[#1a1a1a] rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-[#2a2a2a]">
                      <th className="py-3 px-2 text-right w-8">#</th>
                      <th className="py-3 px-2 text-right">الفريق</th>
                      <th className="py-3 px-2 text-center w-8">لعب</th>
                      <th className="py-3 px-2 text-center w-8">+/-</th>
                      <th className="py-3 px-2 text-center w-10">نقاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, i) => (
                      <tr key={team.rank} className="border-b border-[#2a2a2a]/50">
                        <td className="py-2.5 px-2">
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                            team.rank <= 4 ? 'bg-green-600 text-white' :
                            team.rank >= standings.length - 2 ? 'bg-red-600 text-white' :
                            'text-gray-400'
                          }`}>
                            {team.rank}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <img src={team.logo} alt="" className="w-5 h-5" />
                            <span className="text-white text-xs">{team.team}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-400">{team.played}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={team.gd > 0 ? 'text-green-500' : team.gd < 0 ? 'text-red-500' : 'text-gray-400'}>
                            {team.gd > 0 ? '+' : ''}{team.gd}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-white font-bold">{team.points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="اختر دوري لعرض الترتيب" />
            )}
          </div>
        )}

        {/* Scorers */}
        {activeTab === 'scorers' && (
          <div className="p-4 space-y-2">
            {scorers.length > 0 ? (
              scorers.map((scorer, i) => (
                <div key={i} className="bg-[#1a1a1a] rounded-lg p-3 flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    scorer.rank === 1 ? 'bg-amber-500 text-black' :
                    scorer.rank === 2 ? 'bg-gray-400 text-black' :
                    scorer.rank === 3 ? 'bg-amber-700 text-white' :
                    'bg-[#2a2a2a] text-white'
                  }`}>
                    {scorer.rank}
                  </span>
                  <img src={scorer.logo} alt="" className="w-10 h-10 rounded-full bg-[#2a2a2a]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{scorer.player}</p>
                    <p className="text-gray-500 text-xs">{scorer.team}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-500">{scorer.goals}</p>
                    <p className="text-[10px] text-gray-500">هدف</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="اختر دوري لعرض الهدافين" />
            )}
          </div>
        )}
      </div>

      {/* Match Detail Modal */}
      <AnimatePresence>
        {selectedMatch && (
          <MatchDetailModal 
            match={selectedMatch} 
            onClose={() => setSelectedMatch(null)}
            activeTab={matchDetailTab}
            setActiveTab={setMatchDetailTab}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// League Section Component
const LeagueSection = ({ league, matches, onMatchClick }) => {
  return (
    <div className="border-b border-[#2a2a2a]">
      {/* League Header */}
      <div className="bg-[#1a1a1a] px-4 py-2.5 flex items-center gap-2">
        <span className="text-lg">{league?.flag || '⚽'}</span>
        <span className="text-white text-sm font-medium">{league?.name || 'دوري'}</span>
        <ChevronLeft className="w-4 h-4 text-gray-500 mr-auto" />
      </div>

      {/* Matches */}
      <div className="bg-[#0d0d0d]">
        {matches.map((match, i) => (
          <MatchRow key={match.id} match={match} onClick={() => onMatchClick(match)} />
        ))}
      </div>
    </div>
  );
};

// Match Row Component (365 Style)
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
      className={`px-4 py-3 flex items-center border-b border-[#1a1a1a] cursor-pointer hover:bg-[#1a1a1a]/50 transition-colors ${
        isLive ? 'bg-red-900/10' : ''
      }`}
    >
      {/* Time Column */}
      <div className="w-12 text-center flex-shrink-0">
        {isLive ? (
          <div className="flex flex-col items-center">
            <span className="text-red-500 text-[10px] font-bold">LIVE</span>
            <span className="text-red-500 text-sm font-bold">{match.minute}'</span>
          </div>
        ) : isFinished ? (
          <span className="text-gray-500 text-xs">FT</span>
        ) : (
          <span className="text-white text-sm">{formatTime(match.date)}</span>
        )}
      </div>

      {/* Teams Column */}
      <div className="flex-1 px-3">
        {/* Home Team */}
        <div className="flex items-center gap-2 mb-1.5">
          <img src={match.home_team.logo} alt="" className="w-5 h-5" />
          <span className={`text-sm ${
            isFinished && match.home_team.score > match.away_team.score 
              ? 'text-white font-bold' 
              : 'text-gray-300'
          }`}>
            {match.home_team.name}
          </span>
        </div>
        {/* Away Team */}
        <div className="flex items-center gap-2">
          <img src={match.away_team.logo} alt="" className="w-5 h-5" />
          <span className={`text-sm ${
            isFinished && match.away_team.score > match.home_team.score 
              ? 'text-white font-bold' 
              : 'text-gray-300'
          }`}>
            {match.away_team.name}
          </span>
        </div>
      </div>

      {/* Score Column */}
      <div className="w-8 text-center flex-shrink-0">
        {!isScheduled && (
          <>
            <div className={`text-sm font-bold ${
              match.home_team.score > match.away_team.score ? 'text-white' : 'text-gray-500'
            }`}>
              {match.home_team.score ?? '-'}
            </div>
            <div className={`text-sm font-bold ${
              match.away_team.score > match.home_team.score ? 'text-white' : 'text-gray-500'
            }`}>
              {match.away_team.score ?? '-'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Match Detail Modal
const MatchDetailModal = ({ match, onClose, activeTab, setActiveTab }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';

  const tabs = [
    { id: 'match', label: 'المباراة' },
    { id: 'lineup', label: 'التشكيل' },
    { id: 'stats', label: 'إحصائيات' },
    { id: 'h2h', label: 'وجهاً لوجه' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-50"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="absolute inset-x-0 bottom-0 top-0 bg-[#0d0d0d] overflow-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a1a] z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={onClose}>
              <X className="w-6 h-6 text-white" />
            </button>
            <span className="text-white font-bold">{match.league?.name}</span>
            <Star className="w-5 h-5 text-gray-500" />
          </div>

          {/* Match Header */}
          <div className="px-4 py-6 text-center">
            <div className="flex items-center justify-center gap-6">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <img src={match.home_team.logo} alt="" className="w-16 h-16 mx-auto mb-2" />
                <p className="text-white text-sm font-medium">{match.home_team.name}</p>
              </div>

              {/* Score */}
              <div className="px-4">
                {isLive || isFinished ? (
                  <div className="flex items-center gap-2">
                    <span className="text-4xl font-bold text-white">{match.home_team.score}</span>
                    <span className="text-2xl text-gray-500">-</span>
                    <span className="text-4xl font-bold text-white">{match.away_team.score}</span>
                  </div>
                ) : (
                  <span className="text-2xl text-gray-500">VS</span>
                )}
                {isLive && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500 text-sm font-bold">{match.minute}'</span>
                  </div>
                )}
                {isFinished && (
                  <p className="text-gray-500 text-sm mt-2">انتهت</p>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <img src={match.away_team.logo} alt="" className="w-16 h-16 mx-auto mb-2" />
                <p className="text-white text-sm font-medium">{match.away_team.name}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#2a2a2a]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-xs font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'text-green-500 border-b-2 border-green-500' 
                    : 'text-gray-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'match' && (
            <div className="space-y-4">
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <h3 className="text-white font-bold mb-3">معلومات المباراة</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">الدوري</span>
                    <span className="text-white">{match.league?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الملعب</span>
                    <span className="text-white">{match.venue || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">التاريخ</span>
                    <span className="text-white">{new Date(match.date).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lineup' && (
            <div className="text-center py-10">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">التشكيل غير متوفر حالياً</p>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="text-center py-10">
              <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">الإحصائيات غير متوفرة حالياً</p>
            </div>
          )}

          {activeTab === 'h2h' && (
            <div className="text-center py-10">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">المواجهات السابقة غير متوفرة حالياً</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Empty State Component
const EmptyState = ({ message }) => (
  <div className="text-center py-16">
    <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-3" />
    <p className="text-gray-500 text-sm">{message}</p>
  </div>
);

export default MatchesPage;
