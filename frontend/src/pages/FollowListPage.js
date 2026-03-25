import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  ArrowRight, UserPlus, UserMinus, Loader2
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import BottomNavigation from '../components/BottomNavigation';

const API = process.env.REACT_APP_BACKEND_URL;

const FollowListPage = ({ user }) => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const { isDarkMode } = useSettings();
  
  // Determine tab from URL path or search params
  const getInitialTab = () => {
    const path = window.location.pathname;
    if (path.includes('following')) return 'following';
    if (path.includes('followers')) return 'followers';
    return searchParams.get('tab') || 'followers';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState({});
  const [profileUser, setProfileUser] = useState(null);
  
  // Update tab when URL changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [window.location.pathname]);

  // Fetch profile user info
  useEffect(() => {
    const fetchProfileUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const targetId = userId || user?.id;
        
        if (targetId === user?.id) {
          setProfileUser(user);
        } else {
          const res = await axios.get(`${API}/api/users/${targetId}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setProfileUser(res.data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfileUser();
  }, [userId, user]);

  // Fetch followers and following
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const targetId = userId || user?.id;
        
        const [followersRes, followingRes] = await Promise.all([
          axios.get(`${API}/api/users/${targetId}/followers`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/api/users/${targetId}/following`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setFollowers(followersRes.data.followers || []);
        setFollowing(followingRes.data.following || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, user]);

  // Handle follow/unfollow
  const handleFollow = async (targetUserId, isFollowing) => {
    setFollowLoading(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const token = localStorage.getItem('token');
      if (isFollowing) {
        await axios.delete(`${API}/api/users/${targetUserId}/follow`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API}/api/users/${targetUserId}/follow`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      // Update local state
      const updateList = (list) => list.map(u => 
        u.id === targetUserId ? { ...u, is_following: !isFollowing } : u
      );
      setFollowers(prev => updateList(prev));
      setFollowing(prev => updateList(prev));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const currentList = activeTab === 'followers' ? followers : following;

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-xl ${isDarkMode ? 'bg-slate-950/90 border-b border-slate-800/50' : 'bg-white/90 border-b border-gray-200'}`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)} 
            className={`w-10 h-10 flex items-center justify-center rounded-full ${isDarkMode ? 'bg-slate-800/50' : 'bg-gray-100'}`}
          >
            <ArrowRight className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} />
          </button>
          <div>
            <h1 className={`text-lg font-cairo font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {profileUser?.name || profileUser?.username || 'المستخدم'}
            </h1>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} dir="ltr">@{profileUser?.username}</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className={`flex ${isDarkMode ? 'border-b border-slate-800' : 'border-b border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 text-center font-cairo relative ${
              activeTab === 'followers' ? (isDarkMode ? 'text-lime-400' : 'text-lime-600') : (isDarkMode ? 'text-slate-400' : 'text-gray-500')
            }`}
          >
            <span>المتابعون</span>
            <span className="mr-2 text-sm">({followers.length})</span>
            {activeTab === 'followers' && (
              <motion.div
                layoutId="tabIndicator"
                className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDarkMode ? 'bg-lime-400' : 'bg-lime-600'}`}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-center font-cairo relative ${
              activeTab === 'following' ? (isDarkMode ? 'text-lime-400' : 'text-lime-600') : (isDarkMode ? 'text-slate-400' : 'text-gray-500')
            }`}
          >
            <span>المتابَعون</span>
            <span className="mr-2 text-sm">({following.length})</span>
            {activeTab === 'following' && (
              <motion.div
                layoutId="tabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400"
              />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 font-cairo">
              {activeTab === 'followers' ? 'لا يوجد متابعون حتى الآن' : 'لا يتابع أحداً حتى الآن'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {currentList.map((person, index) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800/50"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigate(`/user/${person.id}`)}
                  >
                    <img
                      src={person.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.username}`}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover bg-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-cairo font-medium truncate">
                        {person.name || person.username}
                      </h3>
                      <p className="text-slate-400 text-sm truncate" dir="ltr">
                        @{person.username}
                      </p>
                    </div>
                  </div>
                  
                  {person.id !== user?.id && (
                    <motion.button
                      onClick={() => handleFollow(person.id, person.is_following)}
                      disabled={followLoading[person.id]}
                      className={`px-4 py-2 rounded-full text-sm font-cairo flex items-center gap-2 ${
                        person.is_following
                          ? 'bg-slate-700 text-white border border-slate-600'
                          : 'bg-lime-500 text-slate-900'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {followLoading[person.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : person.is_following ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          متابَع
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          متابعة
                        </>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      <BottomNavigation isRTL={true} />
    </div>
  );
};

export default FollowListPage;
