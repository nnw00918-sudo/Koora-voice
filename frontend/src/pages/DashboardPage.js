import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLanguage } from '../contexts/LanguageContext';
import BottomNavigation from '../components/BottomNavigation';
import { 
  Users, 
  LogOut, 
  Shield, 
  Home, 
  Trophy, 
  Settings, 
  MessageSquare, 
  User, 
  Lock, 
  Unlock, 
  Search, 
  X, 
  UserPlus, 
  Check, 
  Key,
  Mic,
  Radio,
  Flame,
  Sparkles,
  Crown,
  Play,
  Zap,
  Mail
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DashboardPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState({});
  const [joiningRoom, setJoiningRoom] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [selectedRoomForPin, setSelectedRoomForPin] = useState(null);
  const [sportsNews, setSportsNews] = useState([
    { type: 'result', icon: '⚽', text: 'جاري تحميل الأخبار...' }
  ]);
  const [newsLoading, setNewsLoading] = useState(true);

  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRooms();
    fetchCategories();
  }, [selectedCategory]);

  // Sports News Ticker Data - Fetch from API
  useEffect(() => {
    const fetchSportsNews = async () => {
      setNewsLoading(true);
      try {
        const response = await axios.get(`${API}/football/news/ticker`);
        console.log('News response:', response.data);
        if (response.data?.news && response.data.news.length > 0) {
          const formattedNews = response.data.news.map(item => ({
            type: item.type,
            icon: item.icon,
            text: isRTL ? item.text : (item.text_en || item.text)
          }));
          setSportsNews(formattedNews);
        } else {
          // Use fallback if no news
          setSportsNews([
            { type: 'result', icon: '⚽', text: 'الهلال 1-0 الفتح - دوري روشن' },
            { type: 'transfer', icon: '🔄', text: 'رسمياً: انتقال مبابي إلى ريال مدريد' },
            { type: 'result', icon: '⚽', text: 'ليفربول 1-1 توتنهام - الدوري الإنجليزي' },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch sports news:', error);
        // Fallback to static news
        const fallbackNews = [
          { type: 'transfer', icon: '🔄', text: isRTL ? 'رسمياً: انتقال مبابي إلى ريال مدريد بصفقة تاريخية' : 'Official: Mbappé joins Real Madrid in historic deal' },
          { type: 'result', icon: '⚽', text: isRTL ? 'الهلال 3-1 النصر في ديربي الرياض' : 'Al-Hilal 3-1 Al-Nassr in Riyadh Derby' },
          { type: 'coach', icon: '🎙️', text: isRTL ? 'أنشيلوتي: نحن جاهزون لدوري الأبطال' : 'Ancelotti: We are ready for Champions League' },
          { type: 'news', icon: '📰', text: isRTL ? 'فيفا يعلن عن تغييرات جديدة في قوانين التسلل' : 'FIFA announces new offside rule changes' },
          { type: 'transfer', icon: '🔄', text: isRTL ? 'برشلونة يقترب من ضم لامين يامال' : 'Barcelona close to signing Lamine Yamal' },
          { type: 'result', icon: '⚽', text: isRTL ? 'ليفربول 2-0 مانشستر سيتي' : 'Liverpool 2-0 Manchester City' },
          { type: 'coach', icon: '🎙️', text: isRTL ? 'غوارديولا: سنعود أقوى الموسم القادم' : 'Guardiola: We will come back stronger next season' },
          { type: 'news', icon: '📰', text: isRTL ? 'السعودية تستضيف كأس العالم 2034' : 'Saudi Arabia to host World Cup 2034' },
        ];
        setSportsNews(fallbackNews);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchSportsNews();
    // Refresh news every 2 minutes
    const interval = setInterval(fetchSportsNews, 120000);
    return () => clearInterval(interval);
  }, [isRTL]);

  useEffect(() => {
    let result = rooms;
    
    // Filter by room type
    if (statusFilter === 'diwaniya') {
      result = result.filter(room => room.room_type === 'diwaniya');
    } else if (statusFilter === 'main') {
      // 'main' shows only non-diwaniya rooms
      result = result.filter(room => room.room_type !== 'diwaniya');
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(room => 
        room.title?.toLowerCase().includes(query) ||
        room.description?.toLowerCase().includes(query) ||
        room.owner?.username?.toLowerCase().includes(query)
      );
    }
    
    setFilteredRooms(result);
  }, [statusFilter, searchQuery, rooms]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchRooms = async () => {
    try {
      const params = selectedCategory ? { category: selectedCategory } : {};
      const response = await axios.get(`${API}/rooms`, { params });
      setRooms(response.data);
      
      if (token) {
        const membershipPromises = response.data.map(async (room) => {
          try {
            const memberRes = await axios.get(`${API}/rooms/${room.id}/membership/check`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return { roomId: room.id, ...memberRes.data };
          } catch {
            return { roomId: room.id, is_member: false, role: null };
          }
        });
        const membershipResults = await Promise.all(membershipPromises);
        const statusMap = {};
        membershipResults.forEach(m => {
          statusMap[m.roomId] = { is_member: m.is_member, role: m.role };
        });
        setMembershipStatus(statusMap);
      }
    } catch (error) {
      toast.error(isRTL ? 'فشل تحميل الغرف' : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMembership = async (roomId, e) => {
    e.stopPropagation();
    setJoiningRoom(roomId);
    try {
      await axios.post(`${API}/rooms/${roomId}/membership/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم الانضمام للغرفة بنجاح!' : 'Joined room successfully!');
      setMembershipStatus(prev => ({
        ...prev,
        [roomId]: { is_member: true, role: 'member' }
      }));
      fetchRooms();
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل الانضمام' : 'Failed to join'));
    } finally {
      setJoiningRoom(null);
    }
  };

  const handleRoomClick = async (roomId, pin = null) => {
    const membership = membershipStatus[roomId];
    const room = rooms.find(r => r.id === roomId);
    
    if (room?.is_closed) {
      if (user.role === 'owner') {
        try {
          await axios.post(`${API}/rooms/${roomId}/join`, { pin: null }, { headers: { Authorization: `Bearer ${token}` } });
          navigate(`/room/${roomId}`);
          return;
        } catch (error) {
          toast.error(error.response?.data?.detail || 'فشل الدخول');
          return;
        }
      }
      
      if (!pin) {
        setSelectedRoomForPin(room);
        setShowPinModal(true);
        setPinInput('');
        return;
      }
      
      try {
        await axios.post(`${API}/rooms/${roomId}/join`, { pin }, { headers: { Authorization: `Bearer ${token}` } });
        setShowPinModal(false);
        setPinInput('');
        setSelectedRoomForPin(null);
        navigate(`/room/${roomId}`);
        return;
      } catch (error) {
        toast.error(error.response?.data?.detail || 'الرمز السري غير صحيح');
        return;
      }
    }
    
    if (!membership?.is_member && user.role !== 'owner' && room?.owner_id !== user.id) {
      toast.error(isRTL ? 'يجب أن تنضم للغرفة أولاً' : 'You must join the room first');
      return;
    }
    navigate(`/room/${roomId}`);
  };

  const handlePinSubmit = () => {
    if (selectedRoomForPin && pinInput.length === 4) {
      handleRoomClick(selectedRoomForPin.id, pinInput);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Stadium Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Pitch lines */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-lime-400" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-lime-400" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-lime-400 rounded-full" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 border-b border-lime-400 rounded-b-full" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 border-t border-lime-400 rounded-t-full" />
        </div>
        
        {/* Glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-lime-400/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-transparent backdrop-blur-xl border-b border-lime-500/20 p-4 sticky top-0 z-40">
          <div className={`flex items-center justify-between ${isRTL ? '' : 'flex-row-reverse'}`}>
            <div className={`flex items-center gap-3 ${isRTL ? '' : 'flex-row-reverse'}`}>
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-12 h-12 rounded-full ring-2 ring-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.3)]"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-lime-400 rounded-full border-2 border-slate-900 animate-pulse" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-white font-cairo font-bold text-lg">{user.username}</p>
                <p className="text-xs text-lime-400 font-almarai flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  {t('online')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {user.role === 'owner' && (
                <Button
                  data-testid="admin-dashboard-btn"
                  onClick={() => navigate('/admin')}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-lime-500/20 text-lime-400 rounded-xl"
                  title={t('controlPanel')}
                >
                  <Shield className="w-5 h-5" strokeWidth={1.5} />
                </Button>
              )}
              <Button
                data-testid="logout-btn"
                onClick={onLogout}
                variant="ghost"
                size="icon"
                className="hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl"
              >
                <LogOut className="w-5 h-5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="p-4 pt-6">
          <div className={`flex items-center justify-between ${isRTL ? '' : 'flex-row-reverse'}`}>
            {user?.role === 'owner' ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => navigate('/create-room')}
                  className="bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-950 font-cairo font-black px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(163,230,53,0.3)] flex items-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  {t('createRoom')}
                </Button>
              </motion.div>
            ) : (
              <div></div>
            )}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowSearch(!showSearch)}
                variant="ghost"
                size="icon"
                className={`rounded-xl ${showSearch ? 'bg-lime-500/20 text-lime-400' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Search className="w-5 h-5" />
              </Button>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h2 className="text-3xl font-cairo font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-300 via-lime-400 to-emerald-400">
                  {t('liveRooms')}
                </h2>
                <p className="text-xs text-slate-500 font-almarai flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" />
                  {isRTL ? 'استاد رقمي مفتوح' : 'Digital Stadium Open'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 pb-4 overflow-hidden"
            >
              <div className={`relative flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} w-5 h-5 text-lime-400`} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRTL ? 'ابحث عن غرفة...' : 'Search rooms...'}
                  className={`w-full bg-slate-900/80 border border-lime-500/30 rounded-2xl py-4 ${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} text-white font-almarai placeholder-slate-500 focus:outline-none focus:border-lime-400/70 focus:ring-2 focus:ring-lime-400/20 transition-all touch-action-auto`}
                  autoFocus
                  data-testid="search-rooms-input"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`absolute ${isRTL ? 'left-4' : 'right-4'} text-slate-500 hover:text-lime-400 transition-colors`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-3 text-sm text-lime-400/70 font-almarai ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {isRTL 
                    ? `تم العثور على ${filteredRooms.length} غرفة`
                    : `Found ${filteredRooms.length} rooms`
                  }
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sports News Ticker */}
        <div className="px-4 pb-3">
          <div className="relative overflow-hidden bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 border border-lime-500/30 rounded-2xl">
            {/* Live Badge */}
            <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center">
              <div className="flex items-center gap-1.5 bg-gradient-to-l from-red-600 to-red-500 px-3 py-4 rounded-l-2xl shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-xs font-cairo font-bold">أخبار</span>
              </div>
            </div>
            
            {/* Scrolling News - Using marquee style */}
            <div className="py-3 pr-20 pl-4 overflow-hidden">
              <marquee behavior="scroll" direction="right" scrollamount="3">
                <div className="inline-flex gap-8">
                  {sportsNews.map((news, index) => (
                    <span key={index} className="inline-flex items-center gap-2 text-sm">
                      <span className="text-base">{news.icon}</span>
                      <span className={`font-almarai ${
                        news.type === 'live' ? 'text-red-400 font-bold' :
                        news.type === 'transfer' ? 'text-sky-400' :
                        news.type === 'result' ? 'text-lime-400' :
                        news.type === 'coach' ? 'text-amber-400' :
                        'text-purple-400'
                      }`}>
                        {news.text}
                      </span>
                      <span className="text-lime-500/30 mx-4">|</span>
                    </span>
                  ))}
                </div>
              </marquee>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="px-4 pb-6">
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStatusFilter('main')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${
                statusFilter === 'main'
                  ? 'bg-sky-500/90 text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isRTL ? 'الأساسي' : 'Main'}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {rooms.filter(r => r.room_type !== 'diwaniya').length}
              </span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStatusFilter('diwaniya')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${
                statusFilter === 'diwaniya'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              <Crown className="w-4 h-4" />
              {isRTL ? 'الدوانيه' : 'Diwaniya'}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {rooms.filter(r => r.room_type === 'diwaniya').length}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Rooms Feed */}
        <div className="px-4 pb-24">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-72 bg-slate-900/50 rounded-3xl animate-pulse border border-slate-800/50"></div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-lime-500/20 to-emerald-500/20 flex items-center justify-center border border-lime-500/20">
                <Mic className="w-12 h-12 text-lime-400/50" />
              </div>
              <p className="text-slate-500 font-almarai text-lg mb-2">
                {statusFilter === 'diwaniya' 
                  ? (isRTL ? 'لا توجد دوانيه الآن' : 'No diwaniya rooms right now')
                  : (isRTL ? 'لا توجد غرف أساسية' : 'No main rooms available')
                }
              </p>
              <p className="text-slate-600 font-almarai text-sm mb-6">
                {isRTL ? 'كن أول من يبدأ البث!' : 'Be the first to start streaming!'}
              </p>
              {user?.role === 'owner' && (
                <Button
                  onClick={() => navigate('/create-room')}
                  className="bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-950 font-cairo font-bold px-8 py-3 rounded-2xl shadow-[0_0_30px_rgba(163,230,53,0.3)]"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  {t('beFirst')}
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="space-y-5">
              {filteredRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="relative bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 hover:border-lime-500/50 rounded-3xl overflow-hidden transition-all group cursor-pointer shadow-[0_4px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(163,230,53,0.15)]"
                  onClick={() => handleRoomClick(room.id)}
                  data-testid={`room-card-${room.id}`}
                >
                  {/* Cover Image */}
                  <div className="relative h-40 sm:h-48 overflow-hidden">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                    
                    {/* Live Badge */}
                    {room.is_live && !room.is_closed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)]`}
                      >
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        <span className="text-white font-cairo font-bold text-sm">{t('live')}</span>
                      </motion.div>
                    )}
                    
                    {/* Closed Badge - Only show when room is actually closed */}
                    {room.is_closed && (
                      <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]`}>
                        <Lock className="w-4 h-4 text-white" />
                        <span className="text-white font-cairo font-bold text-sm">{isRTL ? 'مغلقة' : 'Closed'}</span>
                      </div>
                    )}
                    
                    {/* Participants Count */}
                    <div className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-2 rounded-full border border-white/10`}>
                      <Users className="w-4 h-4 text-lime-400" strokeWidth={2} />
                      <span className="text-white font-chivo font-bold text-sm">{room.participant_count || 0}</span>
                    </div>
                    
                    {/* Member Count Badge */}
                    <div className={`absolute bottom-3 ${isRTL ? 'right-3' : 'left-3'} flex items-center gap-2 bg-violet-500/80 backdrop-blur-md px-3 py-2 rounded-full`}>
                      <UserPlus className="w-4 h-4 text-white" strokeWidth={2} />
                      <span className="text-white font-chivo font-bold text-sm">{room.member_count || 1}</span>
                      <span className="text-white/70 text-xs">{isRTL ? 'عضو' : 'members'}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5">
                    {/* Category & Membership Status */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-500/20 text-lime-400 text-xs font-cairo font-bold border border-lime-500/30">
                        <Zap className="w-3 h-3" />
                        {room.category}
                      </span>
                      {membershipStatus[room.id]?.is_member && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-cairo border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          {isRTL ? 'عضو' : 'Member'}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className={`text-xl sm:text-2xl font-cairo font-black text-white mb-2 ${isRTL ? 'text-right' : 'text-left'} line-clamp-2 group-hover:text-lime-100 transition-colors`}>
                      {room.title}
                    </h3>

                    {/* Description */}
                    <p className={`text-sm text-slate-400 font-almarai mb-4 ${isRTL ? 'text-right' : 'text-left'} line-clamp-2`}>
                      {room.description}
                    </p>

                    {/* Host & Join Button */}
                    <div className={`flex items-center justify-end ${isRTL ? '' : 'flex-row-reverse'}`}>
                      {/* Join/Enter Button */}
                      {room.is_closed && user.role !== 'owner' ? (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRoomClick(room.id);
                            }}
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-cairo font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                          >
                            <Key className="w-4 h-4" />
                            {isRTL ? 'أدخل الرمز' : 'Enter PIN'}
                          </Button>
                        </motion.div>
                      ) : membershipStatus[room.id]?.is_member || user.role === 'owner' || room.owner_id === user.id ? (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRoomClick(room.id);
                            }}
                            className="bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-950 font-cairo font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(163,230,53,0.3)]"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            {isRTL ? 'دخول' : 'Enter'}
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={(e) => handleJoinMembership(room.id, e)}
                            disabled={joiningRoom === room.id}
                            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-cairo font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                          >
                            {joiningRoom === room.id ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                {isRTL ? 'انضمام' : 'Join'}
                              </>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-lime-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation isRTL={isRTL} />

      {/* PIN Entry Modal */}
      <AnimatePresence>
        {showPinModal && selectedRoomForPin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-3xl p-8 w-full max-w-sm border border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.2)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 bg-gradient-to-br from-orange-500/30 to-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/30"
                >
                  <Lock className="w-10 h-10 text-orange-400" />
                </motion.div>
                <h3 className="text-2xl font-cairo font-black text-white mb-2">
                  {isRTL ? 'الغرفة مغلقة' : 'Room Locked'}
                </h3>
                <p className="text-slate-400 font-almarai text-sm">
                  {isRTL 
                    ? `أدخل الرمز السري للدخول إلى "${selectedRoomForPin.title}"`
                    : `Enter PIN to access "${selectedRoomForPin.title}"`
                  }
                </p>
              </div>

              {/* PIN Input */}
              <div className="mb-8">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="• • • •"
                  className="bg-slate-800/80 border-slate-600 text-white text-center text-4xl tracking-[1.5em] font-bold py-5 rounded-2xl focus:border-orange-500/50 focus:ring-orange-500/20"
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                    setSelectedRoomForPin(null);
                  }}
                  variant="outline"
                  className="flex-1 bg-transparent border-slate-600 text-white hover:bg-slate-800 rounded-xl py-3 font-cairo"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  onClick={handlePinSubmit}
                  disabled={pinInput.length !== 4}
                  className="flex-1 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-950 font-cairo font-bold rounded-xl py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  {isRTL ? 'دخول' : 'Enter'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
