import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { ArrowLeft, UserPlus, UserCheck } from 'lucide-react';
import { API } from '../config/api';

const UsersPage = ({ user }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState(new Set());

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      const filteredUsers = response.data.filter(u => u.id !== user.id);
      setUsers(filteredUsers);
    } catch (error) {
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    const isFollowing = followingIds.has(userId);

    try {
      if (isFollowing) {
        await axios.delete(
          `${API}/users/${userId}/follow`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast.success('تم إلغاء المتابعة');
      } else {
        await axios.post(
          `${API}/users/${userId}/follow`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFollowingIds(prev => new Set(prev).add(userId));
        toast.success('تمت المتابعة بنجاح');
      }
    } catch (error) {
      toast.error('حدث خطأ ما');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[600px] mx-auto min-h-screen pb-24">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button
              data-testid="back-btn"
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              size="icon"
              className="hover:bg-slate-800 text-slate-400"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Button>
            <h1 className="text-xl font-cairo font-bold text-white flex-1 text-right">
              المستخدمون
            </h1>
          </div>
        </div>

        {/* Users List */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-slate-900/50 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-slate-500 font-almarai mt-12">
              لا يوجد مستخدمون حالياً
            </div>
          ) : (
            users.map((u, index) => {
              const isFollowing = followingIds.has(u.id);
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  data-testid={`user-card-${u.id}`}
                  className="bg-slate-900/50 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar}
                      alt={u.username}
                      className="w-14 h-14 rounded-full ring-2 ring-slate-700"
                    />
                    <div className="flex-1 text-right">
                      <h3 className="font-cairo font-bold text-white">{u.username}</h3>
                      <p className="text-sm text-slate-400 font-almarai" dir="ltr" style={{textAlign: 'right'}}>
                        {u.email}
                      </p>
                    </div>
                    <Button
                      data-testid={`follow-btn-${u.id}`}
                      onClick={() => handleFollow(u.id)}
                      className={`${
                        isFollowing
                          ? 'bg-slate-800 hover:bg-slate-700 text-white'
                          : 'bg-lime-400 hover:bg-lime-300 text-slate-950'
                      } rounded-lg px-4 py-2 font-cairo font-bold transition-all active:scale-95`}
                    >
                      {isFollowing ? (
                        <UserCheck className="w-4 h-4" strokeWidth={2} />
                      ) : (
                        <UserPlus className="w-4 h-4" strokeWidth={2} />
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;