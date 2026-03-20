import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, LogOut, Shield, Home, Trophy, Settings, MessageSquare, User, Lock, Unlock, Search, X, UserPlus, Check } from 'lucide-react';

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
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'live', 'closed'
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState({}); // {roomId: {is_member, role}}
  const [joiningRoom, setJoiningRoom] = useState(null);

  const isRTL = language === 'ar';
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRooms();
    fetchCategories();
  }, [selectedCategory]);

  // Filter rooms when statusFilter, searchQuery or rooms change
  useEffect(() => {
    let result = rooms;
    
    // Apply status filter
    if (statusFilter === 'live') {
      result = result.filter(room => room.is_live && !room.is_closed);
    } else if (statusFilter === 'closed') {
      result = result.filter(room => room.is_closed);
    }
    
    // Apply search filter
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
      
      // Check membership status for each room
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
      // Refresh rooms to get updated member count
      fetchRooms();
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل الانضمام' : 'Failed to join'));
    } finally {
      setJoiningRoom(null);
    }
  };

  const handleRoomClick = (roomId) => {
    const membership = membershipStatus[roomId];
    if (!membership?.is_member) {
      toast.error(isRTL ? 'يجب أن تنضم للغرفة أولاً' : 'You must join the room first');
      return;
    }
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className={`flex items-center justify-between ${isRTL ? '' : 'flex-row-reverse'}`}>
            <div className={`flex items-center gap-3 ${isRTL ? '' : 'flex-row-reverse'}`}>
              <img
                src={user.avatar}
                alt={user.username}
                className="w-10 h-10 rounded-full ring-2 ring-lime-400"
              />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-white font-cairo font-bold">{user.username}</p>
                <p className="text-xs text-slate-400 font-almarai">{t('online')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(user.role === 'admin' || user.role === 'owner') && (
                <Button
                  data-testid="admin-dashboard-btn"
                  onClick={() => navigate('/admin')}
                  variant="ghost"
                  size="icon"
                  className="hover:bg-slate-800 text-lime-400"
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
                className="hover:bg-slate-800 text-slate-400 hover:text-red-400"
              >
                <LogOut className="w-5 h-5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className={`p-4 flex items-center justify-between ${isRTL ? '' : 'flex-row-reverse'}`}>
          <Button
            onClick={() => navigate('/create-room')}
            className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold px-6 py-2 rounded-full"
          >
            {t('createRoom')}
          </Button>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowSearch(!showSearch)}
              variant="ghost"
              size="icon"
              className={`hover:bg-slate-800 ${showSearch ? 'text-lime-400' : 'text-slate-400'}`}
            >
              <Search className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-cairo font-black text-white">
              {t('liveRooms')}
            </h2>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-4 pb-4">
            <div className={`relative flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} w-5 h-5 text-slate-500`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'ابحث عن غرفة...' : 'Search rooms...'}
                className={`w-full bg-slate-800/80 border border-slate-700 rounded-xl py-3 ${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} text-white font-almarai placeholder-slate-500 focus:outline-none focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/50`}
                autoFocus
                data-testid="search-rooms-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute ${isRTL ? 'left-4' : 'right-4'} text-slate-500 hover:text-white`}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className={`mt-2 text-sm text-slate-500 font-almarai ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL 
                  ? `تم العثور على ${filteredRooms.length} غرفة`
                  : `Found ${filteredRooms.length} rooms`
                }
              </p>
            )}
          </div>
        )}

        {/* Categories */}
        <div className="px-4 pb-2">
          <div className={`flex gap-2 overflow-x-auto hide-scrollbar pb-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full font-cairo font-bold whitespace-nowrap transition-all ${
                selectedCategory === null
                  ? 'bg-lime-400 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {t('all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-cairo font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-lime-400 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="px-4 pb-4">
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-cairo font-bold text-sm transition-all ${
                statusFilter === 'all'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {isRTL ? 'الكل' : 'All'}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{rooms.length}</span>
            </button>
            <button
              onClick={() => setStatusFilter('live')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-cairo font-bold text-sm transition-all ${
                statusFilter === 'live'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${statusFilter === 'live' ? 'bg-white' : 'bg-red-500'} animate-pulse`}></div>
              {isRTL ? 'مباشر' : 'Live'}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {rooms.filter(r => r.is_live && !r.is_closed).length}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-cairo font-bold text-sm transition-all ${
                statusFilter === 'closed'
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              {isRTL ? 'مغلقة' : 'Closed'}
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {rooms.filter(r => r.is_closed).length}
              </span>
            </button>
          </div>
        </div>

        {/* Rooms Feed */}
        <div className="px-4 pb-24">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-slate-900/50 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-900 flex items-center justify-center">
                <Users className="w-10 h-10 text-slate-700" />
              </div>
              <p className="text-slate-500 font-almarai mb-4">
                {statusFilter === 'live' 
                  ? (isRTL ? 'لا توجد غرف مباشرة الآن' : 'No live rooms right now')
                  : statusFilter === 'closed'
                  ? (isRTL ? 'لا توجد غرف مغلقة' : 'No closed rooms')
                  : (isRTL ? 'لا توجد غرف متاحة' : 'No rooms available')
                }
              </p>
              <Button
                onClick={() => navigate('/create-room')}
                className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold"
              >
                {t('beFirst')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-900/70 backdrop-blur-md border border-slate-800 hover:border-lime-400/50 rounded-xl sm:rounded-2xl overflow-hidden transition-all group dashboard-room-card"
                >
                  {/* Cover Image */}
                  <div className="relative h-36 sm:h-44 md:h-48 overflow-hidden room-card-image">
                    <img
                      src={room.image}
                      alt={room.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                    
                    {/* Live Badge */}
                    {room.is_live && !room.is_closed && (
                      <div className={`absolute top-2 sm:top-4 ${isRTL ? 'left-2 sm:left-4' : 'right-2 sm:right-4'} flex items-center gap-1.5 sm:gap-2 bg-red-500 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full`}>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse"></div>
                        <span className="text-white font-cairo font-bold text-xs sm:text-sm">{t('live')}</span>
                      </div>
                    )}
                    
                    {/* Closed Badge */}
                    {room.is_closed && (
                      <div className={`absolute top-2 sm:top-4 ${isRTL ? 'left-2 sm:left-4' : 'right-2 sm:right-4'} flex items-center gap-1.5 sm:gap-2 bg-orange-500 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full`}>
                        <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        <span className="text-white font-cairo font-bold text-xs sm:text-sm">{isRTL ? 'مغلقة' : 'Closed'}</span>
                      </div>
                    )}
                    
                    {/* Participants Count */}
                    <div className={`absolute top-2 sm:top-4 ${isRTL ? 'right-2 sm:right-4' : 'left-2 sm:left-4'} flex items-center gap-1 sm:gap-1.5 bg-black/60 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full`}>
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 text-lime-400" strokeWidth={2} />
                      <span className="text-white font-chivo font-bold text-xs sm:text-sm">{room.participant_count || 0}</span>
                    </div>
                    
                    {/* Member Count Badge */}
                    <div className={`absolute bottom-2 sm:bottom-4 ${isRTL ? 'right-2 sm:right-4' : 'left-2 sm:left-4'} flex items-center gap-1 sm:gap-1.5 bg-violet-500/80 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full`}>
                      <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={2} />
                      <span className="text-white font-chivo font-bold text-xs sm:text-sm">{room.member_count || 1}</span>
                      <span className="text-white/70 text-[10px] sm:text-xs">{isRTL ? 'عضو' : 'members'}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-3 sm:p-4">
                    {/* Category & Membership Status */}
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-lime-400/20 text-lime-400 text-[10px] sm:text-xs font-cairo font-bold">
                        {room.category}
                      </span>
                      {membershipStatus[room.id]?.is_member && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] sm:text-xs font-cairo">
                          <Check className="w-3 h-3" />
                          {isRTL ? 'عضو' : 'Member'}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className={`text-base sm:text-lg md:text-xl font-cairo font-black text-white mb-1.5 sm:mb-2 ${isRTL ? 'text-right' : 'text-left'} line-clamp-2`}>
                      {room.title}
                    </h3>

                    {/* Description */}
                    <p className={`text-xs sm:text-sm text-slate-400 font-almarai mb-3 sm:mb-4 ${isRTL ? 'text-right' : 'text-left'} line-clamp-2`}>
                      {room.description}
                    </p>

                    {/* Host & Join Button */}
                    <div className={`flex items-center justify-between ${isRTL ? '' : 'flex-row-reverse'}`}>
                      {/* Host */}
                      <div className={`flex items-center gap-1.5 sm:gap-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
                        <img
                          src={room.owner_avatar}
                          alt={room.owner_name}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full ring-2 ring-lime-400"
                        />
                        <div className={isRTL ? 'text-left' : 'text-right'}>
                          <p className="text-[10px] sm:text-xs text-slate-500 font-almarai">{t('host')}</p>
                          <p className="text-xs sm:text-sm text-white font-cairo font-bold">{room.owner_name}</p>
                        </div>
                      </div>

                      {/* Join/Enter Button */}
                      {membershipStatus[room.id]?.is_member ? (
                        <Button
                          onClick={() => handleRoomClick(room.id)}
                          className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold px-3 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm"
                        >
                          {isRTL ? 'دخول' : 'Enter'}
                        </Button>
                      ) : (
                        <Button
                          onClick={(e) => handleJoinMembership(room.id, e)}
                          disabled={joiningRoom === room.id}
                          className="bg-violet-500 hover:bg-violet-400 text-white font-cairo font-bold px-3 sm:px-6 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm flex items-center gap-1.5"
                        >
                          {joiningRoom === room.id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
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
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 z-50 bottom-nav">
        <div className={`max-w-[600px] mx-auto flex justify-around py-2 sm:py-4 px-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center gap-0.5 sm:gap-1 text-lime-400 min-w-[50px]"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            <span className="text-[10px] sm:text-xs font-almarai">{t('home')}</span>
          </button>
          <button
            data-testid="nav-threads-btn"
            onClick={() => navigate('/threads')}
            className="flex flex-col items-center gap-0.5 sm:gap-1 text-slate-400 hover:text-sky-400 transition-colors min-w-[50px]"
          >
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            <span className="text-[10px] sm:text-xs font-almarai">{t('threads')}</span>
          </button>
          <button
            data-testid="nav-matches-btn"
            onClick={() => navigate('/matches')}
            className="flex flex-col items-center gap-0.5 sm:gap-1 text-slate-400 hover:text-sky-400 transition-colors min-w-[50px]"
          >
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            <span className="text-[10px] sm:text-xs font-almarai">{t('matches')}</span>
          </button>
          <button
            data-testid="nav-profile-btn"
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-0.5 sm:gap-1 text-slate-400 hover:text-sky-400 transition-colors min-w-[50px]"
          >
            <User className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            <span className="text-[10px] sm:text-xs font-almarai">{t('profile')}</span>
          </button>
          <button
            data-testid="nav-settings-btn"
            onClick={() => navigate('/settings')}
            className="flex flex-col items-center gap-0.5 sm:gap-1 text-slate-400 hover:text-sky-400 transition-colors min-w-[50px]"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
            <span className="text-[10px] sm:text-xs font-almarai">{t('settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
