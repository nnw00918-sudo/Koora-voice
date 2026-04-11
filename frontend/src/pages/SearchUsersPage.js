import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  ArrowRight, Search, UserPlus, UserMinus, Loader2, X, Users
} from 'lucide-react';
import BottomNavigation from '../components/BottomNavigation';
import debounce from 'lodash/debounce';
import { BACKEND_URL as API } from '../config/api';

const SearchUsersPage = ({ user }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [followLoading, setFollowLoading] = useState({});

  // Debounced search function
  const searchUsers = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery || searchQuery.length < 1) {
        setResults([]);
        setSearched(false);
        return;
      }
      
      setLoading(true);
      setSearched(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setResults(res.data.users || []);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Handle search input change
  useEffect(() => {
    searchUsers(query);
  }, [query, searchUsers]);

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
      setResults(prev => prev.map(u => 
        u.id === targetUserId ? { ...u, is_following: !isFollowing } : u
      ));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-cairo font-bold text-white">البحث عن مستخدمين</h1>
        </div>
        
        {/* Search Input */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم أو اسم المستخدم..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-12 pl-10 py-3 text-white text-right placeholder-slate-500 focus:border-lime-500 focus:outline-none transition-colors"
              style={{ fontSize: '16px' }}
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute left-4 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-lime-400 animate-spin" />
          </div>
        ) : !searched ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-slate-400 font-cairo">ابحث عن أصدقائك</p>
            <p className="text-slate-500 text-sm mt-2">اكتب اسم أو @username</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 font-cairo">لا توجد نتائج لـ "{query}"</p>
            <p className="text-slate-500 text-sm mt-2">جرب كلمات بحث مختلفة</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {results.map((person, index) => (
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
                      {person.bio && (
                        <p className="text-slate-500 text-xs truncate mt-1">{person.bio}</p>
                      )}
                    </div>
                  </div>
                  
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

export default SearchUsersPage;
