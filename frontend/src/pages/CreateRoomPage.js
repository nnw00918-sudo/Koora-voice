import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Radio, Image as ImageIcon } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateRoomPage = ({ user }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55'
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data.categories);
      if (response.data.categories.length > 0) {
        setFormData(prev => ({ ...prev, category: response.data.categories[0] }));
      }
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/rooms/create`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('تم إنشاء الغرفة بنجاح!');
      navigate(`/room/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إنشاء الغرفة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[600px] mx-auto min-h-screen">
        {/* Header */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 p-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              size="icon"
              className="hover:bg-slate-800 text-slate-400"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Button>
            <h1 className="text-xl font-cairo font-bold text-white flex-1 text-right">
              إنشاء غرفة جديدة
            </h1>
            <Radio className="w-6 h-6 text-lime-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-300 font-almarai text-right block">
                عنوان الغرفة *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: نقاش مباراة الأهلي والهلال"
                className="bg-slate-900 border-slate-700 focus:border-lime-400 text-white text-right font-almarai"
                dir="rtl"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300 font-almarai text-right block">
                الوصف *
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف مختصر عن موضوع الغرفة..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-lime-400 rounded-lg p-3 text-white text-right font-almarai min-h-[100px]"
                dir="rtl"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-slate-300 font-almarai text-right block">
                الفئة *
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 focus:border-lime-400 rounded-lg p-3 text-white text-right font-almarai"
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="image" className="text-slate-300 font-almarai text-right block">
                رابط الصورة
              </Label>
              <div className="relative">
                <ImageIcon className="absolute right-3 top-3 w-5 h-5 text-slate-500" strokeWidth={1.5} />
                <Input
                  id="image"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  className="bg-slate-900 border-slate-700 focus:border-lime-400 text-white pr-10 font-almarai"
                  dir="ltr"
                />
              </div>
              {formData.image && (
                <div className="mt-2">
                  <img
                    src={formData.image}
                    alt="معاينة"
                    className="w-full h-40 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-lime-400 hover:bg-lime-300 text-slate-950 font-cairo font-bold text-lg py-6 rounded-xl"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء الغرفة والبدء'}
            </Button>
          </form>

          {/* Tips */}
          <div className="mt-8 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-400 font-almarai text-right mb-2">
              💡 <span className="text-white font-bold">نصائح لغرفة ناجحة:</span>
            </p>
            <ul className="text-sm text-slate-400 font-almarai space-y-1 text-right">
              <li>• اختر عنواناً واضحاً وجذاباً</li>
              <li>• اكتب وصفاً يوضح موضوع النقاش</li>
              <li>• اختر الفئة المناسبة</li>
              <li>• استخدم صورة ذات جودة عالية</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomPage;
