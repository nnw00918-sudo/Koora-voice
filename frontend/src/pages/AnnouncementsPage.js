import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { API } from '../config/api';
import {
  Megaphone,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Users,
  Search
} from 'lucide-react';

const AnnouncementsPage = ({ user }) => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const token = localStorage.getItem('token');
  
  const [announcements, setAnnouncements] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  
  // Create form state
  const [newText, setNewText] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role !== 'owner') {
      toast.error(isRTL ? 'غير مصرح لك بالدخول' : 'Unauthorized');
      navigate('/dashboard');
      return;
    }
    fetchAnnouncements();
    fetchRooms();
  }, [user, navigate, isRTL]);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API}/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API}/announcements/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newText.trim() || selectedRooms.length === 0) {
      toast.error(isRTL ? 'أدخل نص الإعلان واختر غرفة واحدة على الأقل' : 'Enter text and select at least one room');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/announcements`, {
        text: newText,
        room_ids: selectedRooms
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(isRTL ? 'تم إرسال الإعلان بنجاح' : 'Announcement sent successfully');
      setShowCreateModal(false);
      setNewText('');
      setSelectedRooms([]);
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.detail || (isRTL ? 'فشل إرسال الإعلان' : 'Failed to send announcement'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAnnouncement = async (announcementId) => {
    try {
      const response = await axios.post(`${API}/announcements/${announcementId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchAnnouncements();
    } catch (error) {
      toast.error(isRTL ? 'فشل تغيير حالة الإعلان' : 'Failed to toggle announcement');
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا الإعلان؟' : 'Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await axios.delete(`${API}/announcements/${announcementId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم حذف الإعلان' : 'Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      toast.error(isRTL ? 'فشل حذف الإعلان' : 'Failed to delete announcement');
    }
  };

  const toggleRoomSelection = (roomId) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const selectAllRooms = () => {
    setSelectedRooms(rooms.map(r => r.id));
  };

  const deselectAllRooms = () => {
    setSelectedRooms([]);
  };

  const filteredRooms = rooms.filter(room => 
    room.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <BackIcon className="w-5 h-5" />
              </button>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h1 className="text-xl font-cairo font-bold flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-amber-400" />
                  {isRTL ? 'إدارة الإعلانات' : 'Announcements'}
                </h1>
                <p className="text-sm text-slate-400 font-almarai">
                  {isRTL ? 'إرسال إعلانات للغرف المحددة' : 'Send announcements to selected rooms'}
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-cairo font-bold rounded-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {isRTL ? 'إعلان جديد' : 'New Announcement'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-slate-800/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 font-almarai text-lg">
              {isRTL ? 'لا توجد إعلانات' : 'No announcements yet'}
            </p>
            <p className="text-slate-500 font-almarai text-sm mt-2">
              {isRTL ? 'أنشئ إعلانك الأول' : 'Create your first announcement'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-5 border ${
                  announcement.is_active ? 'border-amber-500/30' : 'border-slate-700/50'
                }`}
              >
                <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {/* Status Badge */}
                    <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        announcement.is_active 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-slate-600/20 text-slate-400'
                      }`}>
                        {announcement.is_active 
                          ? (isRTL ? 'نشط' : 'Active') 
                          : (isRTL ? 'متوقف' : 'Inactive')
                        }
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(announcement.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                      </span>
                    </div>
                    
                    {/* Announcement Text */}
                    <p className="text-white font-almarai text-base mb-3 leading-relaxed">
                      {announcement.text}
                    </p>
                    
                    {/* Target Rooms */}
                    <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-xs text-slate-500">
                        {isRTL ? 'الغرف:' : 'Rooms:'}
                      </span>
                      {announcement.room_names?.slice(0, 3).map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-700/50 rounded-full text-xs text-slate-300">
                          {name}
                        </span>
                      ))}
                      {announcement.room_names?.length > 3 && (
                        <span className="text-xs text-slate-500">
                          +{announcement.room_names.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleAnnouncement(announcement.id)}
                      className={`p-2 rounded-xl transition-colors ${
                        announcement.is_active 
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                      title={announcement.is_active ? (isRTL ? 'إيقاف' : 'Deactivate') : (isRTL ? 'تفعيل' : 'Activate')}
                    >
                      {announcement.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title={isRTL ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Announcement Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-b from-slate-900 to-slate-950 w-full max-w-lg max-h-[90vh] rounded-3xl border border-amber-500/30 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h2 className="text-xl font-cairo font-bold flex items-center gap-2">
                    <Megaphone className="w-6 h-6 text-amber-400" />
                    {isRTL ? 'إعلان جديد' : 'New Announcement'}
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Announcement Text */}
                <div className="mb-6">
                  <label className={`block text-sm font-cairo font-bold text-slate-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'نص الإعلان' : 'Announcement Text'}
                  </label>
                  <textarea
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    placeholder={isRTL ? 'اكتب الإعلان هنا...' : 'Write your announcement here...'}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-white font-almarai resize-none focus:outline-none focus:border-amber-500/50"
                    rows={3}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Room Selection */}
                <div>
                  <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <label className="text-sm font-cairo font-bold text-slate-300">
                      {isRTL ? 'اختر الغرف' : 'Select Rooms'} ({selectedRooms.length})
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllRooms}
                        className="text-xs px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                      >
                        {isRTL ? 'تحديد الكل' : 'Select All'}
                      </button>
                      <button
                        onClick={deselectAllRooms}
                        className="text-xs px-3 py-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                      >
                        {isRTL ? 'إلغاء الكل' : 'Deselect All'}
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={isRTL ? 'بحث عن غرفة...' : 'Search rooms...'}
                      className={`w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-white text-sm focus:outline-none focus:border-amber-500/50`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>

                  {/* Rooms Grid */}
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {filteredRooms.map(room => (
                      <button
                        key={room.id}
                        onClick={() => toggleRoomSelection(room.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${
                          selectedRooms.includes(room.id)
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                          selectedRooms.includes(room.id)
                            ? 'bg-amber-500 border-amber-500'
                            : 'border-slate-600'
                        }`}>
                          {selectedRooms.includes(room.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-almarai truncate flex-1">{room.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-800">
                <div className="flex gap-3">
                  <Button
                    onClick={handleCreateAnnouncement}
                    disabled={submitting || !newText.trim() || selectedRooms.length === 0}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-cairo font-bold rounded-xl py-3 disabled:opacity-50"
                  >
                    {submitting 
                      ? (isRTL ? 'جاري الإرسال...' : 'Sending...') 
                      : (isRTL ? 'إرسال الإعلان' : 'Send Announcement')
                    }
                  </Button>
                  <Button
                    onClick={() => setShowCreateModal(false)}
                    variant="outline"
                    className="px-6 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl"
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnnouncementsPage;
