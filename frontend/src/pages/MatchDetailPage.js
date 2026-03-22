import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  ArrowRight, 
  Trophy, 
  Users, 
  Activity,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  User,
  Target,
  Repeat,
  AlertTriangle,
  Flag
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lineups');

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        const response = await axios.get(`${API}/api/football/match/${matchId}`);
        setMatchData(response.data);
      } catch (error) {
        console.error('Error fetching match details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchMatchDetails();
    }
  }, [matchId]);

  const tabs = [
    { id: 'lineups', label: 'التشكيلة', icon: Users },
    { id: 'stats', label: 'الإحصائيات', icon: Activity },
    { id: 'events', label: 'الأحداث', icon: Flag },
    { id: 'h2h', label: 'المواجهات', icon: Repeat }
  ];

  const getEventIcon = (type) => {
    switch (type) {
      case 'Goal': return <Target className="w-4 h-4 text-lime-400" />;
      case 'Card': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'subst': return <Repeat className="w-4 h-4 text-sky-400" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!matchData || !matchData.match) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-cairo">لم يتم العثور على المباراة</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-lime-500 text-slate-900 rounded-lg font-cairo font-bold"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  const { match, lineups, statistics, events, h2h } = matchData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-800 text-white"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-white font-cairo font-bold">تفاصيل المباراة</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Match Header Card */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 border border-slate-700/50">
        {/* League Info */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {match.league?.logo && (
            <img src={match.league.logo} alt="" className="w-6 h-6" />
          )}
          <span className="text-slate-400 font-cairo text-sm">{match.league?.name}</span>
        </div>

        {/* Teams and Score */}
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex-1 text-center">
            <img 
              src={match.home_team?.logo} 
              alt="" 
              className="w-16 h-16 mx-auto mb-2 object-contain"
            />
            <h3 className="text-white font-cairo font-bold">{match.home_team?.name}</h3>
          </div>

          {/* Score */}
          <div className="px-6">
            {match.status === 'SCHEDULED' ? (
              <div className="text-center">
                <p className="text-lime-400 font-bold text-lg font-cairo">
                  {formatTime(match.date)}
                </p>
                <p className="text-slate-500 text-xs font-cairo mt-1">
                  {formatDate(match.date)}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-white">
                  {match.home_team?.score ?? 0}
                </span>
                <span className="text-2xl text-slate-500">-</span>
                <span className="text-4xl font-bold text-white">
                  {match.away_team?.score ?? 0}
                </span>
              </div>
            )}
            
            {/* Status Badge */}
            <div className="mt-2 flex justify-center">
              {match.status === 'LIVE' ? (
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-cairo font-bold flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  مباشر {match.minute}'
                </span>
              ) : match.status === 'FINISHED' ? (
                <span className="bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-cairo">
                  انتهت
                </span>
              ) : (
                <span className="bg-lime-500/20 text-lime-400 px-3 py-1 rounded-full text-xs font-cairo">
                  قادمة
                </span>
              )}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center">
            <img 
              src={match.away_team?.logo} 
              alt="" 
              className="w-16 h-16 mx-auto mb-2 object-contain"
            />
            <h3 className="text-white font-cairo font-bold">{match.away_team?.name}</h3>
          </div>
        </div>

        {/* Venue */}
        {match.venue && (
          <div className="flex items-center justify-center gap-2 mt-4 text-slate-500">
            <MapPin className="w-4 h-4" />
            <span className="font-cairo text-sm">{match.venue}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mt-6 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cairo font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-lime-500 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 mt-4">
        <AnimatePresence mode="wait">
          {/* Lineups Tab */}
          {activeTab === 'lineups' && lineups && (
            <motion.div
              key="lineups"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Home Team Lineup */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <img src={lineups.home?.team?.logo || match.home_team?.logo} alt="" className="w-6 h-6" />
                    <span className="text-white font-cairo font-bold">{lineups.home?.team?.name || match.home_team?.name}</span>
                  </div>
                  <span className="text-lime-400 font-mono text-sm">{lineups.home?.formation}</span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-slate-500 text-xs font-cairo mb-2">التشكيلة الأساسية</p>
                  {lineups.home?.startXI?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-lime-500/20 text-lime-400 rounded-full flex items-center justify-center text-xs font-bold">
                          {item.player?.number}
                        </span>
                        <span className="text-white font-cairo text-sm">{item.player?.name}</span>
                      </div>
                      <span className="text-slate-500 text-xs">{item.player?.pos}</span>
                    </div>
                  ))}
                </div>

                {lineups.home?.substitutes && lineups.home.substitutes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-slate-500 text-xs font-cairo mb-2">البدلاء</p>
                    {lineups.home.substitutes.slice(0, 7).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-slate-700 text-slate-400 rounded-full flex items-center justify-center text-xs">
                            {item.player?.number}
                          </span>
                          <span className="text-slate-400 font-cairo text-sm">{item.player?.name}</span>
                        </div>
                        <span className="text-slate-600 text-xs">{item.player?.pos}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Away Team Lineup */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <img src={lineups.away?.team?.logo || match.away_team?.logo} alt="" className="w-6 h-6" />
                    <span className="text-white font-cairo font-bold">{lineups.away?.team?.name || match.away_team?.name}</span>
                  </div>
                  <span className="text-lime-400 font-mono text-sm">{lineups.away?.formation}</span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-slate-500 text-xs font-cairo mb-2">التشكيلة الأساسية</p>
                  {lineups.away?.startXI?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">
                          {item.player?.number}
                        </span>
                        <span className="text-white font-cairo text-sm">{item.player?.name}</span>
                      </div>
                      <span className="text-slate-500 text-xs">{item.player?.pos}</span>
                    </div>
                  ))}
                </div>

                {lineups.away?.substitutes && lineups.away.substitutes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-slate-500 text-xs font-cairo mb-2">البدلاء</p>
                    {lineups.away.substitutes.slice(0, 7).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-slate-700 text-slate-400 rounded-full flex items-center justify-center text-xs">
                            {item.player?.number}
                          </span>
                          <span className="text-slate-400 font-cairo text-sm">{item.player?.name}</span>
                        </div>
                        <span className="text-slate-600 text-xs">{item.player?.pos}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && statistics && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
            >
              <div className="space-y-4">
                {statistics.home?.map((stat, idx) => {
                  const awayStat = statistics.away?.[idx];
                  const homeValue = parseInt(String(stat.value).replace('%', '')) || 0;
                  const awayValue = parseInt(String(awayStat?.value).replace('%', '')) || 0;
                  const total = homeValue + awayValue || 1;
                  const homePercent = (homeValue / total) * 100;
                  
                  return (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span className="text-lime-400 font-bold text-sm">{stat.value}</span>
                        <span className="text-slate-400 font-cairo text-sm">{stat.type === 'Ball Possession' ? 'الاستحواذ' : 
                          stat.type === 'Total Shots' ? 'التسديدات' :
                          stat.type === 'Shots on Goal' ? 'على المرمى' :
                          stat.type === 'Corner Kicks' ? 'الركنيات' :
                          stat.type === 'Fouls' ? 'الأخطاء' :
                          stat.type === 'Yellow Cards' ? 'البطاقات الصفراء' :
                          stat.type === 'Red Cards' ? 'البطاقات الحمراء' :
                          stat.type === 'Passes' ? 'التمريرات' :
                          stat.type === 'Pass Accuracy' ? 'دقة التمرير' :
                          stat.type}</span>
                        <span className="text-purple-400 font-bold text-sm">{awayStat?.value}</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
                        <div 
                          className="bg-lime-500 transition-all duration-500"
                          style={{ width: `${homePercent}%` }}
                        />
                        <div 
                          className="bg-purple-500 transition-all duration-500"
                          style={{ width: `${100 - homePercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && events && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
            >
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        event.team?.name === match.home_team?.name 
                          ? 'bg-lime-500/10 border-r-2 border-lime-500' 
                          : 'bg-purple-500/10 border-l-2 border-purple-500'
                      }`}
                    >
                      <span className="text-white font-mono text-sm w-10">{event.time?.elapsed}'</span>
                      {getEventIcon(event.type)}
                      <div className="flex-1">
                        <p className="text-white font-cairo text-sm">{event.player?.name}</p>
                        {event.assist?.name && (
                          <p className="text-slate-500 text-xs font-cairo">
                            {event.type === 'subst' ? `بدل: ${event.assist.name}` : `مساعدة: ${event.assist.name}`}
                          </p>
                        )}
                      </div>
                      <span className="text-slate-500 text-xs font-cairo">{event.team?.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Flag className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 font-cairo">لا توجد أحداث بعد</p>
                </div>
              )}
            </motion.div>
          )}

          {/* H2H Tab */}
          {activeTab === 'h2h' && h2h && (
            <motion.div
              key="h2h"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <p className="text-slate-400 font-cairo text-sm mb-2">آخر المواجهات</p>
              {h2h.length > 0 ? (
                h2h.map((game, idx) => (
                  <div 
                    key={idx}
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
                  >
                    <div className="text-center text-slate-500 text-xs font-cairo mb-2">
                      {new Date(game.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={game.home_team?.logo} alt="" className="w-8 h-8" />
                        <span className="text-white font-cairo text-sm">{game.home_team?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 px-4">
                        <span className="text-white font-bold">{game.home_team?.score}</span>
                        <span className="text-slate-500">-</span>
                        <span className="text-white font-bold">{game.away_team?.score}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-cairo text-sm">{game.away_team?.name}</span>
                        <img src={game.away_team?.logo} alt="" className="w-8 h-8" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-slate-800/50 rounded-xl">
                  <Repeat className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 font-cairo">لا توجد مواجهات سابقة</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
