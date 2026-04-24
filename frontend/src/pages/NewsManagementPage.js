import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  ArrowLeft,
  Newspaper,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Zap,
  Save,
  X
} from 'lucide-react';
import { API } from '../config/api';

const NewsManagementPage = ({ user }) => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'عام',
    image_url: '',
    is_ticker: true,
    is_featured: false
  });

  const token = localStorage.getItem('token');
  
  // Check access - news_editor, admin, or owner
  const canManageNews = ['news_editor', 'admin', 'owner'].includes(user?.role);

  const categories = [
    { value: 'عام', label: 'أخبار عامة', icon: '📰' },
    { value: 'انتقالات', label: 'انتقالات', icon: '🔄' },
    { value: 'نتائج', label: 'نتائج مباريات', icon: '⚽' },
    { value: 'تصريحات', label: 'تصريحات', icon: '🎙️' },
    { value: 'عاجل', label: 'أخبار عاجلة', icon: '🔴' }
  ];

  useEffect(() => {
    if (!canManageNews) {
      toast.error('لا تملك صلاحيات للوصول');
      navigate('/dashboard');
      return;
    }
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await axios.get(`${API}/news/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNews(response.data.news || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('فشل تحميل الأخبار');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('يرجى إدخال عنوان الخبر');
      return;
    }

    try {
      if (editingNews) {
        // Update
        await axios.put(`${API}/news/${editingNews.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('تم تحديث الخبر بنجاح');
      } else {
        // Create
        await axios.post(`${API}/news`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('تم إضافة الخبر بنجاح');
      }
      
      resetForm();
      fetchNews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل حفظ الخبر');
    }
  };

  const handleDelete = async (newsId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;
    
    try {
      await axios.delete(`${API}/news/${newsId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('تم حذف الخبر بنجاح');
      fetchNews();
    } catch (error) {
      toast.error('فشل حذف الخبر');
    }
  };

  const handleToggle = async (newsId) => {
    try {
      const response = await axios.post(`${API}/news/${newsId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchNews();
    } catch (error) {
      toast.error('فشل تغيير حالة الخبر');
    }
  };

  const handleEdit = (newsItem) => {
    setEditingNews(newsItem);
    setFormData({
      title: newsItem.title,
      content: newsItem.content || '',
      category: newsItem.category || 'عام',
      image_url: newsItem.image_url || '',
      is_ticker: newsItem.is_ticker ?? true,
      is_featured: newsItem.is_featured ?? false
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'عام',
      image_url: '',
      is_ticker: true,
      is_featured: false
    });
    setEditingNews(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-lime-400 text-xl font-cairo">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto min-h-screen pb-24">
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
            <div className="flex-1 text-right">
              <h1 className="text-xl font-cairo font-bold text-white">إدارة الأخبار</h1>
              <p className="text-xs text-slate-400 font-almarai">إضافة وتعديل الأخبار الرياضية</p>
            </div>
            <Newspaper className="w-6 h-6 text-lime-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Add News Button */}
        <div className="p-4">
          <Button
            data-testid="add-news-btn"
            onClick={() => setShowForm(true)}
            className="w-full bg-lime-500 hover:bg-lime-600 text-slate-950 font-cairo font-bold py-3"
          >
            <Plus className="w-5 h-5 ml-2" />
            إضافة خبر جديد
          </Button>
        </div>

        {/* News Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => resetForm()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-cairo font-bold text-white">
                    {editingNews ? 'تعديل الخبر' : 'إضافة خبر جديد'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetForm}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Title */}
                  <div>
                    <Label className="text-slate-300 font-cairo">عنوان الخبر *</Label>
                    <Input
                      data-testid="news-title-input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="أدخل عنوان الخبر"
                      className="mt-1 bg-slate-800 border-slate-700 text-white text-right"
                      dir="rtl"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <Label className="text-slate-300 font-cairo">تفاصيل الخبر</Label>
                    <textarea
                      data-testid="news-content-input"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="أدخل تفاصيل الخبر (اختياري)"
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-right min-h-[100px] resize-none"
                      dir="rtl"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <Label className="text-slate-300 font-cairo">التصنيف</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          data-testid={`category-${cat.value}`}
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`p-2 rounded-lg text-sm font-cairo flex items-center justify-center gap-1 transition-all ${
                            formData.category === cat.value
                              ? 'bg-lime-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image URL */}
                  <div>
                    <Label className="text-slate-300 font-cairo">رابط الصورة (اختياري)</Label>
                    <Input
                      data-testid="news-image-input"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="mt-1 bg-slate-800 border-slate-700 text-white"
                      dir="ltr"
                    />
                  </div>

                  {/* Options */}
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_ticker}
                        onChange={(e) => setFormData({ ...formData, is_ticker: e.target.checked })}
                        className="w-4 h-4 accent-lime-500"
                      />
                      <span className="text-slate-300 font-cairo text-sm flex items-center gap-1">
                        <Zap className="w-4 h-4 text-amber-400" />
                        شريط الأخبار
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_featured}
                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                        className="w-4 h-4 accent-lime-500"
                      />
                      <span className="text-slate-300 font-cairo text-sm flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        خبر مميز
                      </span>
                    </label>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    data-testid="save-news-btn"
                    className="w-full bg-lime-500 hover:bg-lime-600 text-slate-950 font-cairo font-bold py-3 mt-4"
                  >
                    <Save className="w-5 h-5 ml-2" />
                    {editingNews ? 'حفظ التعديلات' : 'إضافة الخبر'}
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* News List */}
        <div className="px-4 space-y-3">
          {news.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-cairo">لا توجد أخبار بعد</p>
              <p className="text-slate-600 font-almarai text-sm mt-1">اضغط على "إضافة خبر جديد" للبدء</p>
            </div>
          ) : (
            news.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-slate-900/50 border rounded-xl p-4 ${
                  item.is_active ? 'border-slate-800' : 'border-red-900/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Category Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                    item.category === 'عاجل' ? 'bg-red-500/20' :
                    item.category === 'انتقالات' ? 'bg-sky-500/20' :
                    item.category === 'نتائج' ? 'bg-lime-500/20' :
                    item.category === 'تصريحات' ? 'bg-amber-500/20' :
                    'bg-slate-700/50'
                  }`}>
                    {categories.find(c => c.value === item.category)?.icon || '📰'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Title & Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-cairo font-bold text-sm leading-tight">
                        {item.title}
                      </h3>
                      {item.is_featured && (
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      )}
                      {!item.is_active && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                          معطّل
                        </span>
                      )}
                    </div>
                    
                    {/* Content Preview */}
                    {item.content && (
                      <p className="text-slate-400 text-xs font-almarai mt-1 line-clamp-2">
                        {item.content}
                      </p>
                    )}
                    
                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span className="font-almarai">{item.category}</span>
                      <span>•</span>
                      <span className="font-almarai">
                        {new Date(item.created_at).toLocaleDateString('ar-SA')}
                      </span>
                      {item.is_ticker && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-amber-400">
                            <Zap className="w-3 h-3" />
                            شريط
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      data-testid={`toggle-news-${item.id}`}
                      onClick={() => handleToggle(item.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-white"
                    >
                      {item.is_active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      data-testid={`edit-news-${item.id}`}
                      onClick={() => handleEdit(item)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-lime-400"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      data-testid={`delete-news-${item.id}`}
                      onClick={() => handleDelete(item.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsManagementPage;
