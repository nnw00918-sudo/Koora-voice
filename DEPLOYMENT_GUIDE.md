# 🚀 دليل نشر صوت الكورة على DigitalOcean Droplet

## معلومات السيرفر
- **IP**: `165.245.209.28`
- **User**: `root`
- **Password**: `KooraVoice2024Server`

---

## 📦 الطريقة 1: نقل الكود عبر GitHub

### على جهازك المحلي (إذا كان الـ repo محدث):
```bash
# على الـ Droplet (أنت متصل بالفعل)
cd /app
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git backend
```

---

## 📦 الطريقة 2: نقل الكود عبر ZIP + SCP (موصى بها)

### الخطوة 1: على جهاز Mac الخاص بك (نافذة terminal جديدة):

```bash
# إنشاء ملف zip من الـ backend
# ملاحظة: استبدل المسار بمسار مشروعك المحلي
cd /path/to/your/project
zip -r backend.zip backend/

# نقل الملف إلى الـ Droplet
scp backend.zip root@165.245.209.28:/app/
# كلمة السر: KooraVoice2024Server
```

### الخطوة 2: على الـ Droplet (SSH):

```bash
# الانتقال للمجلد وفك الضغط
cd /app

# حذف الـ backend القديم (الوهمي)
rm -rf backend

# فك ضغط الملف الجديد
unzip backend.zip

# التحقق من الملفات
ls -la backend/
```

---

## 🔧 إعداد البيئة على الـ Droplet

### الخطوة 3: تثبيت المتطلبات

```bash
# تثبيت Python و pip إذا لم تكن موجودة
apt update && apt install -y python3 python3-pip python3-venv unzip

# إنشاء virtual environment
cd /app/backend
python3 -m venv venv
source venv/bin/activate

# تثبيت المتطلبات
pip install --upgrade pip
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

### الخطوة 4: تحديث ملف .env للإنتاج

```bash
cat > /app/backend/.env << 'EOF'
MONGO_URL="mongodb+srv://koravoice:Koora2024Secure@koravoice-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="koravoice_production"
CORS_ORIGINS="*"
JWT_SECRET_KEY="koraverse_2026_production_super_secret_key_change_this"
AGORA_APP_ID="b2c1cf7c621b48f2b1bf68cdf13f6bed"
AGORA_APP_CERTIFICATE="ccd5087d340d4aeabdeef13d84244a1f"
BACKEND_URL="http://165.245.209.28:8001"
API_FOOTBALL_KEY=ee999f6d874054a7ae6aca5b32768091
VAPID_PRIVATE_KEY=cbu7CEw-z-AuG2i6fc3ybiwA9jEoLL6tT0dGuyOTixY
VAPID_PUBLIC_KEY=BP2MtHk2NHU-dWjaGJvWVfrXSDFP-xaA2mOz27oLFFVSMyXQxACtHOOywJqLe-d3oJ7ETN8LRq6k51hB8UI_eL4
VAPID_SUBJECT=mailto:naifliver@gmail.com
STRIPE_SECRET_KEY=sk_test_emergent
EOF
```

**⚠️ مهم:** استبدل `MONGO_URL` بـ Connection String الخاص بـ MongoDB Atlas الذي أنشأته.

---

## 🔄 إعداد systemd للتشغيل الدائم

### الخطوة 5: إنشاء ملف الخدمة

```bash
cat > /etc/systemd/system/koravoice.service << 'EOF'
[Unit]
Description=Koora Voice Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/app/backend
Environment="PATH=/app/backend/venv/bin"
ExecStart=/app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
```

### الخطوة 6: تفعيل وتشغيل الخدمة

```bash
# إعادة تحميل systemd
systemctl daemon-reload

# تفعيل الخدمة للتشغيل التلقائي عند إعادة التشغيل
systemctl enable koravoice

# تشغيل الخدمة
systemctl start koravoice

# التحقق من الحالة
systemctl status koravoice
```

### الخطوة 7: اختبار الـ API

```bash
# اختبار من داخل السيرفر
curl http://localhost:8001/api/health

# اختبار من الخارج (على جهازك)
curl http://165.245.209.28:8001/api/health
```

**النتيجة المتوقعة:**
```json
{"status": "healthy", "message": "صوت الكورة API is running"}
```

---

## 🔥 فتح المنفذ في الـ Firewall

```bash
# السماح للمنفذ 8001
ufw allow 8001/tcp
ufw reload

# أو إذا كان UFW غير مفعل
ufw enable
ufw allow 22/tcp
ufw allow 8001/tcp
```

---

## 📱 تحديث تطبيق iOS

بعد تشغيل السيرفر بنجاح، يجب تحديث الـ Frontend:

1. **تحديث `.env`** في مشروع الـ Frontend:
```
REACT_APP_BACKEND_URL=http://165.245.209.28:8001
```

2. **تشغيل Codemagic build جديد**

3. **رفع الـ Build الجديد إلى App Store Connect**

---

## 🔍 أوامر مفيدة للمراقبة

```bash
# عرض logs الخدمة
journalctl -u koravoice -f

# إعادة تشغيل الخدمة
systemctl restart koravoice

# إيقاف الخدمة
systemctl stop koravoice

# التحقق من استخدام المنافذ
netstat -tlnp | grep 8001
```

---

## ⚡ ملخص الأوامر السريعة (نسخ ولصق)

```bash
# 1. تثبيت المتطلبات
apt update && apt install -y python3 python3-pip python3-venv unzip

# 2. إعداد البيئة
cd /app/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# 3. إنشاء خدمة systemd
cat > /etc/systemd/system/koravoice.service << 'EOF'
[Unit]
Description=Koora Voice Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/app/backend
Environment="PATH=/app/backend/venv/bin"
ExecStart=/app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# 4. تشغيل الخدمة
systemctl daemon-reload
systemctl enable koravoice
systemctl start koravoice
systemctl status koravoice

# 5. فتح المنفذ
ufw allow 8001/tcp

# 6. اختبار
curl http://localhost:8001/api/health
```
