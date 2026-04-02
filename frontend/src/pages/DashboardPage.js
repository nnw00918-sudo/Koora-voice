import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLanguage, LanguageToggle } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
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
  Mail,
  Star
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Memoized Room Card for better performance
const RoomCard = memo(({ room, user, membershipStatus, favoriteLoading, onEnterRoom, onToggleFavorite, isRTL, t }) => {
  const isMember = membershipStatus[room.id];
  const isFavLoading = favoriteLoading[room.id];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-lime-500/30 transition-all duration-300 group"
    >
      {/* Room Image */}
      <div className="relative h-36 overflow-hidden">
        <img 
          src={room.image || `https://picsum.photos/seed/${room.id}/400/200`}
          alt={room.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        
        {/* Live indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-lime-500/20 border border-lime-500/30 text-lime-400 text-xs font-bold">
            <Users className="w-3 h-3" />
            {room.participant_count || 0}
          </span>
        </div>
        
        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(room.id); }}
          disabled={isFavLoading}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
            room.is_favorite 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'bg-slate-800/50 text-slate-400 hover:text-amber-400'
          }`}
        >
          <Star className={`w-4 h-4 ${room.is_favorite ? 'fill-current' : ''}`} />
        </button>
      </div>
      
      {/* Room Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 text-[10px] font-bold">
              {room.room_type === 'sports' ? (isRTL ? '⚽ رياضة' : '⚽ Sports') : (isRTL ? '🎙️ عام' : '🎙️ General')}
            </span>
            {isMember && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center gap-1">
                <Check className="w-3 h-3" />
                {isRTL ? 'عضو' : 'Member'}
              </span>
            )}
          </div>
        </div>
        
        <h3 className="text-white font-cairo font-bold text-base mb-1 truncate">{room.title}</h3>
        <p className="text-slate-400 text-xs mb-3">
          <Users className="w-3 h-3 inline mr-1" />
          {room.members_count || 0} {isRTL ? 'عضو' : 'members'}
        </p>
        
        <Button
          onClick={() => onEnterRoom(room)}
          className="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-400 hover:to-green-400 text-slate-900 font-cairo font-bold rounded-xl py-2 text-sm"
        >
          <Play className="w-4 h-4 mr-1" />
          {isRTL ? 'دخول' : 'Enter'}
        </Button>
      </div>
    </motion.div>
  );
});

RoomCard.displayName = 'RoomCard';

const DashboardPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { isDarkMode } = useSettings();
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
  const [favoriteLoading, setFavoriteLoading] = useState({});
  const [sportsNews, setSportsNews] = useState([
    { type: 'result', icon: '⚽', text: 'جاري تحميل الأخبار...' }
  ]);
  const [newsLoading, setNewsLoading] = useState(true);

  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');

  // Memoized fetch functions
  const fetchRooms = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data);
      setFilteredRooms(response.data);
      
      // Fetch membership status for all rooms in parallel
      const membershipPromises = response.data.map(room => 
        axios.get(`${API}/rooms/${room.id}/membership`, { 
          headers: { Authorization: `Bearer ${token}` } 
        }).catch(() => ({ data: { is_member: false } }))
      );
      
      const membershipResults = await Promise.all(membershipPromises);
      const statusMap = {};
      response.data.forEach((room, index) => {
        statusMap[room.id] = membershipResults[index]?.data?.is_member || false;
      });
      setMembershipStatus(statusMap);
    } catch (error) {
      console.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchCategories();
  }, [fetchRooms, fetchCategories]);

  // Sports News Ticker Data - Fetch from API (local + football)
  useEffect(() => {
    const fetchSportsNews = async () => {
      setNewsLoading(true);
      try {
        // Fetch only local news (added by owner and news reporters)
        const response = await axios.get(`${API}/news/ticker`).catch(() => ({ data: { news: [] } }));
        
        const localNews = (response.data?.news || []).map(item => ({
          type: item.type,
          icon: item.icon === 'red_circle' ? '🔴' : 
                item.icon === 'soccer' ? '⚽' :
                item.icon === 'arrows_counterclockwise' ? '🔄' :
                item.icon === 'studio_microphone' ? '🎙️' :
                item.icon === 'newspaper' ? '📰' : item.icon,
          text: item.text,
          priority: item.priority || 1
        }));
        
        if (localNews.length > 0) {
          setSportsNews(localNews);
        } else {
          // Show message when no news
          setSportsNews([
            { type: 'info', icon: '📢', text: 'لا توجد أخبار حالياً - أضف خبر من إدارة الأخبار' }
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch news:', error);
        setSportsNews([
          { type: 'info', icon: '📢', text: 'لا توجد أخبار حالياً' }
        ]);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchSportsNews();
    // Refresh news every 30 seconds
    const interval = setInterval(fetchSportsNews, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let result = rooms;
    
    // Filter by room type
    if (statusFilter === 'diwaniya') {
      result = result.filter(room => room.room_type === 'diwaniya');
    } else if (statusFilter === 'main') {
      // 'main' shows only non-diwaniya rooms
      result = result.filter(room => room.room_type !== 'diwaniya');
    } else if (statusFilter === 'favorites') {
      // 'favorites' shows only favorited rooms
      result = result.filter(room => room.is_favorite);
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
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل الانضمام' : 'Failed to join'));
    } finally {
      setJoiningRoom(null);
    }
  };

  // Toggle favorite room
  const toggleFavorite = async (roomId, e) => {
    e.stopPropagation();
    setFavoriteLoading(prev => ({ ...prev, [roomId]: true }));
    try {
      const res = await axios.post(`${API}/rooms/${roomId}/favorite`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setRooms(prev => prev.map(room => 
        room.id === roomId 
          ? { ...room, is_favorite: res.data.is_favorite }
          : room
      ));
      
      toast.success(res.data.message);
    } catch (error) {
      toast.error(isRTL ? 'فشل في تحديث المفضلة' : 'Failed to update favorite');
    } finally {
      setFavoriteLoading(prev => ({ ...prev, [roomId]: false }));
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
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Stadium Background Effects */}
      {isDarkMode && (
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
      )}

      <div className="relative z-10 max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className={`backdrop-blur-xl p-4 sticky top-0 z-40 ${isDarkMode ? 'bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-transparent border-b border-lime-500/20' : 'bg-white/95 border-b border-gray-200'}`}>
          <div className={`flex items-center justify-between ${isRTL ? '' : 'flex-row-reverse'}`}>
            <div className={`flex items-center gap-3 ${isRTL ? '' : 'flex-row-reverse'}`}>
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className={`w-12 h-12 rounded-full ring-2 ${isDarkMode ? 'ring-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.3)]' : 'ring-lime-500'}`}
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 animate-pulse ${isDarkMode ? 'bg-lime-400 border-slate-900' : 'bg-lime-500 border-white'}`} />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className={`font-cairo font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.username}</p>
                <p className={`text-xs font-almarai flex items-center gap-1 ${isDarkMode ? 'text-lime-400' : 'text-lime-600'}`}>
                  <Radio className="w-3 h-3" />
                  {t('online')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Language Toggle */}
              <LanguageToggle className="!bg-slate-800/50 hover:!bg-slate-700/50 !text-slate-300" />
              
              {/* Badges Button */}
              <Button
                data-testid="badges-btn"
                onClick={() => navigate('/badges')}
                variant="ghost"
                size="icon"
                className="hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded-xl"
                title={isRTL ? 'الشارات والمستويات' : 'Badges & Levels'}
              >
                <Trophy className="w-5 h-5" strokeWidth={1.5} />
              </Button>
              
              {/* News Management Button - for news_editor, admin, owner */}
              {['news_editor', 'admin', 'owner'].includes(user?.role) && (
                <Button
                  data-testid="news-management-btn"
                  onClick={() => navigate('/news-management')}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-xl"
                  title={t('manageNews')}
                >
                  <Zap className="w-5 h-5" strokeWidth={1.5} />
                </Button>
              )}
              <Button
                data-testid="logout-btn"
                onClick={onLogout}
                variant="ghost"
                size="icon"
                className="hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl"
                title={t('logout')}
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
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStatusFilter('favorites')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all ${
                statusFilter === 'favorites'
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
              }`}
            >
              <Star className="w-4 h-4" />
              {isRTL ? 'المفضلة' : 'Favorites'}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {rooms.filter(r => r.is_favorite).length}
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
                {statusFilter === 'favorites' ? <Star className="w-12 h-12 text-yellow-400/50" /> : <Mic className="w-12 h-12 text-lime-400/50" />}
              </div>
              <p className="text-slate-500 font-almarai text-lg mb-2">
                {statusFilter === 'diwaniya' 
                  ? (isRTL ? 'لا توجد دوانيه الآن' : 'No diwaniya rooms right now')
                  : statusFilter === 'favorites'
                  ? (isRTL ? 'لا توجد غرف مفضلة' : 'No favorite rooms')
                  : (isRTL ? 'لا توجد غرف أساسية' : 'No main rooms available')
                }
              </p>
              <p className="text-slate-600 font-almarai text-sm mb-6">
                {statusFilter === 'favorites' 
                  ? (isRTL ? 'اضغط على النجمة لإضافة غرفة للمفضلة' : 'Click the star to add a room to favorites')
                  : (isRTL ? 'كن أول من يبدأ البث!' : 'Be the first to start streaming!')
                }
              </p>
              {user?.role === 'owner' && statusFilter !== 'favorites' && (
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
            <div className="grid grid-cols-2 gap-4">
              {filteredRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="relative bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/50 backdrop-blur-xl border border-slate-700/50 hover:border-lime-500/50 rounded-2xl overflow-hidden transition-all group cursor-pointer shadow-[0_4px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_40px_rgba(163,230,53,0.15)]"
                  onClick={() => handleRoomClick(room.id)}
                  data-testid={`room-card-${room.id}`}
                >
                  {/* Cover Image */}
                  <div className="relative h-24 sm:h-28 overflow-hidden">
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
                        className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} flex items-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 px-2 py-1 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                        <span className="text-white font-cairo font-bold text-xs">{t('live')}</span>
                      </motion.div>
                    )}
                    
                    {/* Closed Badge */}
                    {room.is_closed && (
                      <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'} flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-1 rounded-full`}>
                        <Lock className="w-3 h-3 text-white" />
                        <span className="text-white font-cairo font-bold text-xs">{isRTL ? 'مغلقة' : 'Closed'}</span>
                      </div>
                    )}
                    
                    {/* Participants Count */}
                    <div className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'} flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10`}>
                      <Users className="w-3 h-3 text-lime-400" strokeWidth={2} />
                      <span className="text-white font-chivo font-bold text-xs">{room.participant_count || 0}</span>
                    </div>
                    
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => toggleFavorite(room.id, e)}
                      disabled={favoriteLoading[room.id]}
                      className={`absolute bottom-2 ${isRTL ? 'left-2' : 'right-2'} w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                        room.is_favorite 
                          ? 'bg-yellow-500/80 text-white' 
                          : 'bg-black/60 text-slate-400 hover:text-yellow-400 border border-white/10'
                      }`}
                      data-testid={`favorite-btn-${room.id}`}
                    >
                      {favoriteLoading[room.id] ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Star className={`w-3.5 h-3.5 ${room.is_favorite ? 'fill-current' : ''}`} />
                      )}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3">
                    {/* Category */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-lime-500/20 text-lime-400 text-[10px] font-cairo font-bold border border-lime-500/30">
                        <Zap className="w-2.5 h-2.5" />
                        {room.category}
                      </span>
                      {membershipStatus[room.id]?.is_member && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-cairo border border-emerald-500/30">
                          <Check className="w-2.5 h-2.5" />
                          {isRTL ? 'عضو' : 'Member'}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className={`text-xs sm:text-sm font-cairo font-bold text-white mb-1 ${isRTL ? 'text-right' : 'text-left'} line-clamp-1 group-hover:text-lime-100 transition-colors`}>
                      {room.title}
                    </h3>

                    {/* Members Count */}
                    <div className={`flex items-center gap-1 mb-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                      <UserPlus className="w-3 h-3 text-violet-400" strokeWidth={2} />
                      <span className="text-violet-400 font-chivo font-bold text-xs">{room.member_count || 1}</span>
                      <span className="text-slate-500 text-[10px]">{isRTL ? 'عضو' : 'members'}</span>
                    </div>

                    {/* Join Button */}
                    <div className="w-full">
                      {room.is_closed && user.role !== 'owner' ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoomClick(room.id);
                          }}
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-cairo font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                        >
                          <Key className="w-3 h-3" />
                          {isRTL ? 'رمز' : 'PIN'}
                        </Button>
                      ) : membershipStatus[room.id]?.is_member || user.role === 'owner' || room.owner_id === user.id ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRoomClick(room.id);
                          }}
                          className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-950 font-cairo font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          {isRTL ? 'دخول' : 'Enter'}
                        </Button>
                      ) : (
                        <Button
                          onClick={(e) => handleJoinMembership(room.id, e)}
                          disabled={joiningRoom === room.id}
                          className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-cairo font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                        >
                          {joiningRoom === room.id ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3" />
                              {isRTL ? 'انضمام' : 'Join'}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
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
