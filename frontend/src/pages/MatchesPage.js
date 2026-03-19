import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, Trophy, Settings, Calendar, Clock } from 'lucide-react';

const MatchesPage = ({ user }) => {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState('اليوم');

  const days = ['اليوم', 'غداً', 'الأربعاء', 'الخميس'];

  // مباريات تجريبية
  const matches = [
    {
      id: 1,
      league: 'الدوري الإنجليزي',
      leagueIcon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      homeTeam: 'مانشستر يونايتد',
      awayTeam: 'ليفربول',
      homeScore: null,
      awayScore: null,
      time: '22:00',
      status: 'upcoming'
    },
    {
      id: 2,
      league: 'الدوري الإسباني',
      leagueIcon: '🇪🇸',
      homeTeam: 'ريال مدريد',
      awayTeam: 'برشلونة',
      homeScore: 2,
      awayScore: 1,
      time: '20:00',
      status: 'live'
    },
    {
      id: 3,
      league: 'الدوري السعودي',
      leagueIcon: '🇸🇦',
      homeTeam: 'الهلال',
      awayTeam: 'النصر',
      homeScore: 3,
      awayScore: 3,
      time: '19:30',
      status: 'finished'
    },
    {
      id: 4,
      league: 'دوري أبطال أوروبا',
      leagueIcon: '🏆',
      homeTeam: 'بايرن ميونخ',
      awayTeam: 'باريس سان جيرمان',
      homeScore: null,
      awayScore: null,
      time: '23:00',
      status: 'upcoming'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return (
          <div className="flex items-center gap-1 bg-red-500 px-2 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span className="text-white text-xs font-cairo font-bold">مباشر</span>
          </div>
        );
      case 'finished':
        return (
          <span className="bg-gray-600 text-white px-2 py-1 rounded-full text-xs font-cairo">انتهت</span>
        );
      default:
        return (
          <span className="bg-lime-400/20 text-lime-400 px-2 py-1 rounded-full text-xs font-cairo">{matches.find(m => m.status === status)?.time}</span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <Trophy className="w-6 h-6 text-lime-400" />
            <h1 className="text-xl font-cairo font-bold text-white">المباريات</h1>
            <Calendar className="w-6 h-6 text-slate-400" />
          </div>
        </div>

        {/* Days Filter */}
        <div className="p-4">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-full font-cairo font-bold whitespace-nowrap transition-all ${
                  selectedDay === day
                    ? 'bg-lime-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Matches List */}
        <div className="px-4 space-y-4">
          {matches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden"
            >
              {/* League Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{match.leagueIcon}</span>
                  <span className="text-sm text-slate-300 font-almarai">{match.league}</span>
                </div>
                {getStatusBadge(match.status)}
              </div>

              {/* Match Content */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  {/* Home Team */}
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <span className="text-2xl">⚽</span>
                    </div>
                    <p className="text-white font-cairo font-bold text-sm">{match.homeTeam}</p>
                  </div>

                  {/* Score */}
                  <div className="px-6">
                    {match.status === 'upcoming' ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span className="font-chivo font-bold text-lg">{match.time}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className={`text-3xl font-chivo font-bold ${match.status === 'live' ? 'text-lime-400' : 'text-white'}`}>
                          {match.homeScore}
                        </span>
                        <span className="text-slate-500 text-xl">-</span>
                        <span className={`text-3xl font-chivo font-bold ${match.status === 'live' ? 'text-lime-400' : 'text-white'}`}>
                          {match.awayScore}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <span className="text-2xl">⚽</span>
                    </div>
                    <p className="text-white font-cairo font-bold text-sm">{match.awayTeam}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 z-50">
        <div className="max-w-[600px] mx-auto flex justify-around p-4">
          <button
            onClick={() => navigate('/settings')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Settings className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">الإعدادات</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-lime-400"
          >
            <Trophy className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">المباريات</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Home className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchesPage;
