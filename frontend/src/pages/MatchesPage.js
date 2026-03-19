import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Home, Trophy, Settings, Calendar, Clock } from 'lucide-react';

const MatchesPage = ({ user }) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [selectedDay, setSelectedDay] = useState(0);

  const isRTL = language === 'ar';

  const days = [
    { ar: 'اليوم', en: 'Today' },
    { ar: 'غداً', en: 'Tomorrow' },
    { ar: 'الأربعاء', en: 'Wednesday' },
    { ar: 'الخميس', en: 'Thursday' }
  ];

  const matches = [
    {
      id: 1,
      league: { ar: 'الدوري الإنجليزي', en: 'Premier League' },
      leagueIcon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      homeTeam: { ar: 'مانشستر يونايتد', en: 'Manchester United' },
      awayTeam: { ar: 'ليفربول', en: 'Liverpool' },
      homeScore: null,
      awayScore: null,
      time: '22:00',
      status: 'upcoming'
    },
    {
      id: 2,
      league: { ar: 'الدوري الإسباني', en: 'La Liga' },
      leagueIcon: '🇪🇸',
      homeTeam: { ar: 'ريال مدريد', en: 'Real Madrid' },
      awayTeam: { ar: 'برشلونة', en: 'Barcelona' },
      homeScore: 2,
      awayScore: 1,
      time: '20:00',
      status: 'live'
    },
    {
      id: 3,
      league: { ar: 'الدوري السعودي', en: 'Saudi League' },
      leagueIcon: '🇸🇦',
      homeTeam: { ar: 'الهلال', en: 'Al-Hilal' },
      awayTeam: { ar: 'النصر', en: 'Al-Nassr' },
      homeScore: 3,
      awayScore: 3,
      time: '19:30',
      status: 'finished'
    },
    {
      id: 4,
      league: { ar: 'دوري أبطال أوروبا', en: 'Champions League' },
      leagueIcon: '🏆',
      homeTeam: { ar: 'بايرن ميونخ', en: 'Bayern Munich' },
      awayTeam: { ar: 'باريس سان جيرمان', en: 'Paris Saint-Germain' },
      homeScore: null,
      awayScore: null,
      time: '23:00',
      status: 'upcoming'
    }
  ];

  const getStatusBadge = (status, time) => {
    switch (status) {
      case 'live':
        return (
          <div className="flex items-center gap-1 bg-red-500 px-2 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <span className="text-white text-xs font-cairo font-bold">{t('live')}</span>
          </div>
        );
      case 'finished':
        return (
          <span className="bg-gray-600 text-white px-2 py-1 rounded-full text-xs font-cairo">{t('finished')}</span>
        );
      default:
        return (
          <span className="bg-lime-400/20 text-lime-400 px-2 py-1 rounded-full text-xs font-cairo">{time}</span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="w-6 h-6 text-slate-400" />
            <h1 className="text-xl font-cairo font-bold text-white">{t('matchesTitle')}</h1>
            <Trophy className="w-6 h-6 text-lime-400" />
          </div>
        </div>

        {/* Days Filter */}
        <div className="p-4">
          <div className={`flex gap-2 overflow-x-auto hide-scrollbar pb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className={`px-4 py-2 rounded-full font-cairo font-bold whitespace-nowrap transition-all ${
                  selectedDay === index
                    ? 'bg-lime-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {isRTL ? day.ar : day.en}
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
              <div className={`flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xl">{match.leagueIcon}</span>
                  <span className="text-sm text-slate-300 font-almarai">
                    {isRTL ? match.league.ar : match.league.en}
                  </span>
                </div>
                {getStatusBadge(match.status, match.time)}
              </div>

              {/* Match Content */}
              <div className="p-4">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {/* Home Team */}
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <span className="text-2xl">⚽</span>
                    </div>
                    <p className="text-white font-cairo font-bold text-sm">
                      {isRTL ? match.homeTeam.ar : match.homeTeam.en}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="px-6">
                    {match.status === 'upcoming' ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span className="font-chivo font-bold text-lg">{match.time}</span>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                    <p className="text-white font-cairo font-bold text-sm">
                      {isRTL ? match.awayTeam.ar : match.awayTeam.en}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 z-50">
        <div className={`max-w-[600px] mx-auto flex justify-around p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Home className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('home')}</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-lime-400"
          >
            <Trophy className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('matches')}</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Settings className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-almarai">{t('settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchesPage;
