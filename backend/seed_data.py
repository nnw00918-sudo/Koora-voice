"""
سكريبت إضافة بيانات تجريبية لتطبيق صوت الكورة
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import random
import os
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB Atlas connection - Production
MONGO_URL = "mongodb+srv://koravoice_admin:Koora2024Secure!@cluster0.7ywxabx.mongodb.net/?appName=Cluster0"
DB_NAME = "koravoice_production"

# بيانات المستخدمين الوهميين
FAKE_USERS = [
    {"username": "أبو_فهد", "email": "abufahd@test.com", "bio": "مشجع هلالي متعصب 💙", "favorite_team": "الهلال"},
    {"username": "نصراوي_للأبد", "email": "nasrawi@test.com", "bio": "العالمي في القلب 💛", "favorite_team": "النصر"},
    {"username": "اتحادي_أصيل", "email": "ittihadi@test.com", "bio": "العميد فوق الجميع 🖤💛", "favorite_team": "الاتحاد"},
    {"username": "أهلاوي_جداوي", "email": "ahlawi@test.com", "bio": "الأهلي زعيم آسيا 💚", "favorite_team": "الأهلي"},
    {"username": "محلل_كروي", "email": "analyst@test.com", "bio": "محلل تكتيكي ومتابع للدوريات", "favorite_team": ""},
    {"username": "صقر_الملاعب", "email": "saqr@test.com", "bio": "عاشق الكورة السعودية", "favorite_team": "الشباب"},
    {"username": "كابتن_ماجد", "email": "majed@test.com", "bio": "أحب كرة القدم من الصغر", "favorite_team": "الهلال"},
    {"username": "الذهبي", "email": "golden@test.com", "bio": "متابع لكل المباريات", "favorite_team": "النصر"},
    {"username": "أم_سلطان", "email": "umsultan@test.com", "bio": "مشجعة ومتابعة للدوري", "favorite_team": "الهلال"},
    {"username": "فارس_الكورة", "email": "faris@test.com", "bio": "الكورة حياة", "favorite_team": "الاتحاد"},
    {"username": "هداف_العرب", "email": "hadaf@test.com", "bio": "أحب الأهداف الجميلة", "favorite_team": "النصر"},
    {"username": "حارس_المرمى", "email": "haris@test.com", "bio": "حارس سابق ومحلل", "favorite_team": "الأهلي"},
    {"username": "مدرب_المستقبل", "email": "coach@test.com", "bio": "أدرس التكتيكات", "favorite_team": ""},
    {"username": "نجم_الشمال", "email": "star@test.com", "bio": "من الرياض للعالم", "favorite_team": "الهلال"},
    {"username": "صوت_المدرجات", "email": "voice@test.com", "bio": "أنا صوت الجماهير", "favorite_team": "النصر"},
]

# بيانات الغرف
ROOMS_DATA = [
    # غرف الأندية
    {"name": "استاد الهلال الأزرق", "description": "غرفة مشجعي الهلال - الزعيم", "category": "clubs", "team": "الهلال", "is_official": True},
    {"name": "ديوانية النصر العالمي", "description": "غرفة مشجعي النصر - العالمي", "category": "clubs", "team": "النصر", "is_official": True},
    {"name": "بيت الاتحاد", "description": "غرفة مشجعي الاتحاد - العميد", "category": "clubs", "team": "الاتحاد", "is_official": True},
    {"name": "ملتقى الأهلاويين", "description": "غرفة مشجعي الأهلي - الراقي", "category": "clubs", "team": "الأهلي", "is_official": True},
    {"name": "شباب الليث", "description": "غرفة مشجعي الشباب", "category": "clubs", "team": "الشباب", "is_official": True},
    
    # غرف عامة
    {"name": "استاد رقمي مفتوح", "description": "غرفة عامة لجميع المشجعين", "category": "general", "team": "", "is_official": True},
    {"name": "تحليلات المباريات", "description": "نقاشات تكتيكية وتحليلية", "category": "analysis", "team": "", "is_official": True},
    {"name": "أخبار الانتقالات", "description": "آخر أخبار سوق الانتقالات", "category": "news", "team": "", "is_official": True},
    {"name": "ذكريات الكورة", "description": "نتذكر الأيام الجميلة", "category": "nostalgia", "team": "", "is_official": False},
    {"name": "الدوريات الأوروبية", "description": "نقاشات عن الدوريات الأوروبية", "category": "international", "team": "", "is_official": False},
    
    # غرف المباريات
    {"name": "مباراة اليوم", "description": "تابع مباراة اليوم معنا", "category": "live", "team": "", "is_official": True},
    {"name": "ديربي الرياض", "description": "الهلال vs النصر", "category": "derby", "team": "", "is_official": True},
    {"name": "كلاسيكو جدة", "description": "الاتحاد vs الأهلي", "category": "derby", "team": "", "is_official": True},
]

# بيانات المنشورات
POSTS_DATA = [
    {"content": "الهلال بطل آسيا! 💙🏆 أداء رائع من الفريق", "likes_count": 245},
    {"content": "رونالدو سجل هاتريك اليوم! العالمي يتصدر 💛", "likes_count": 312},
    {"content": "مباراة نارية بين الاتحاد والأهلي الأسبوع القادم 🔥", "likes_count": 189},
    {"content": "التشكيلة المتوقعة للمنتخب السعودي في التصفيات 🇸🇦", "likes_count": 156},
    {"content": "أفضل هدف شفته هذا الموسم! شاركوني رأيكم ⚽", "likes_count": 98},
    {"content": "مين أفضل حارس في الدوري السعودي؟ 🧤", "likes_count": 134},
    {"content": "تحليل تكتيكي لمباراة الأمس - خيط طويل 📊", "likes_count": 87},
    {"content": "الدوري السعودي أصبح من أقوى الدوريات! 💪", "likes_count": 267},
    {"content": "ذكريات نهائي كأس الملك 2023 👑", "likes_count": 145},
    {"content": "مين يتوقع الفائز بالدوري هذا الموسم؟ 🏆", "likes_count": 203},
    {"content": "أجمل تمريرة حاسمة شفتها هذا الأسبوع 🎯", "likes_count": 76},
    {"content": "نيمار جاهز للمباراة القادمة! 🌟", "likes_count": 289},
    {"content": "تشكيلة الجولة من اختياري ⭐", "likes_count": 112},
    {"content": "كيف تشوفون مستوى المدرب الجديد؟ 🤔", "likes_count": 167},
    {"content": "أفضل 5 لاعبين سعوديين في التاريخ 🇸🇦", "likes_count": 234},
]

# بيانات الأخبار
NEWS_DATA = [
    {"title": "الهلال يتصدر الدوري بفارق 5 نقاط", "content": "حقق الهلال فوزاً كبيراً ليتصدر جدول الترتيب", "source": "صوت الكورة"},
    {"title": "رونالدو يسجل الهدف رقم 900 في مسيرته", "content": "الدون يواصل تحطيم الأرقام القياسية", "source": "صوت الكورة"},
    {"title": "الاتحاد يتعاقد مع نجم جديد", "content": "صفقة كبيرة للعميد في الميركاتو الشتوي", "source": "صوت الكورة"},
    {"title": "المنتخب السعودي يستعد للتصفيات", "content": "معسكر مكثف للأخضر قبل المباريات الحاسمة", "source": "صوت الكورة"},
    {"title": "إصابة تبعد النجم عن الملاعب شهرين", "content": "غياب مؤثر عن الفريق في فترة حرجة", "source": "صوت الكورة"},
]

# التعليقات
COMMENTS_DATA = [
    "تحليل رائع! 👏",
    "أتفق معك 100% ✅",
    "رأي محترم لكن أختلف معك 🤔",
    "الله يعطيك العافية على المعلومات 🙏",
    "هذا أفضل منشور قرأته اليوم! 🔥",
    "شكراً على المشاركة 💚",
    "مين معي؟ 🙋‍♂️",
    "صحيح كلامك 💯",
    "يا سلام! 😍",
    "هذا اللي كنت أدور عليه 👍",
]

async def seed_database():
    """إضافة البيانات التجريبية"""
    
    print("🔗 جاري الاتصال بقاعدة البيانات...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"📊 قاعدة البيانات: {DB_NAME}")
    
    # ========== 1. إضافة المستخدمين ==========
    print("\n👥 جاري إضافة المستخدمين...")
    users_collection = db.users
    
    user_ids = []
    for user_data in FAKE_USERS:
        existing = await users_collection.find_one({"email": user_data["email"]})
        if existing:
            user_ids.append(str(existing["_id"]))
            print(f"  ✓ المستخدم موجود: {user_data['username']}")
            continue
            
        user = {
            "username": user_data["username"],
            "email": user_data["email"],
            "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.",  # Test123456
            "bio": user_data["bio"],
            "favorite_team": user_data["favorite_team"],
            "avatar_url": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_data['username']}",
            "coins": random.randint(50, 500),
            "is_vip": random.choice([True, False, False]),
            "is_verified": random.choice([True, True, False]),
            "followers_count": random.randint(10, 1000),
            "following_count": random.randint(5, 200),
            "posts_count": 0,
            "roles": ["user"],
            "badges": [],
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365)),
            "last_seen": datetime.now(timezone.utc) - timedelta(minutes=random.randint(1, 60)),
            "is_online": random.choice([True, True, False]),
        }
        result = await users_collection.insert_one(user)
        user_ids.append(str(result.inserted_id))
        print(f"  ✓ تم إضافة: {user_data['username']}")
    
    print(f"  ✅ إجمالي المستخدمين: {len(user_ids)}")
    
    # ========== 2. إضافة الغرف ==========
    print("\n🎙️ جاري إضافة الغرف...")
    rooms_collection = db.rooms
    
    room_ids = []
    for room_data in ROOMS_DATA:
        existing = await rooms_collection.find_one({"name": room_data["name"]})
        if existing:
            room_ids.append(str(existing["_id"]))
            print(f"  ✓ الغرفة موجودة: {room_data['name']}")
            continue
        
        owner_id = random.choice(user_ids)
        participants = random.sample(user_ids, min(random.randint(3, 10), len(user_ids)))
        
        room = {
            "name": room_data["name"],
            "description": room_data["description"],
            "category": room_data["category"],
            "team": room_data["team"],
            "owner_id": owner_id,
            "is_official": room_data["is_official"],
            "is_live": random.choice([True, True, False]),
            "is_private": False,
            "participants": participants,
            "participants_count": len(participants),
            "listeners_count": random.randint(5, 100),
            "speakers": participants[:3],
            "moderators": [owner_id],
            "banned_users": [],
            "max_participants": 50,
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30)),
            "updated_at": datetime.now(timezone.utc),
            "scheduled_at": None,
            "ended_at": None,
            "tags": [room_data["category"], "كرة_قدم"],
            "room_type": "audio",
        }
        result = await rooms_collection.insert_one(room)
        room_ids.append(str(result.inserted_id))
        print(f"  ✓ تم إضافة: {room_data['name']}")
    
    print(f"  ✅ إجمالي الغرف: {len(room_ids)}")
    
    # ========== 3. إضافة المنشورات ==========
    print("\n📝 جاري إضافة المنشورات...")
    threads_collection = db.threads
    
    thread_ids = []
    for post_data in POSTS_DATA:
        author_id = random.choice(user_ids)
        
        thread = {
            "content": post_data["content"],
            "author_id": author_id,
            "likes_count": post_data["likes_count"],
            "comments_count": random.randint(5, 50),
            "shares_count": random.randint(0, 20),
            "views_count": random.randint(100, 2000),
            "liked_by": random.sample(user_ids, min(random.randint(3, 10), len(user_ids))),
            "media_urls": [],
            "hashtags": ["كرة_قدم", "الدوري_السعودي"],
            "mentions": [],
            "is_pinned": random.choice([True, False, False, False]),
            "created_at": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 168)),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await threads_collection.insert_one(thread)
        thread_ids.append(str(result.inserted_id))
        
        # تحديث عدد منشورات المستخدم
        await users_collection.update_one(
            {"_id": author_id},
            {"$inc": {"posts_count": 1}}
        )
    
    print(f"  ✅ إجمالي المنشورات: {len(thread_ids)}")
    
    # ========== 4. إضافة التعليقات ==========
    print("\n💬 جاري إضافة التعليقات...")
    comments_collection = db.comments
    
    comments_count = 0
    for thread_id in thread_ids:
        num_comments = random.randint(2, 8)
        for _ in range(num_comments):
            comment = {
                "thread_id": thread_id,
                "author_id": random.choice(user_ids),
                "content": random.choice(COMMENTS_DATA),
                "likes_count": random.randint(0, 50),
                "liked_by": [],
                "created_at": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48)),
            }
            await comments_collection.insert_one(comment)
            comments_count += 1
    
    print(f"  ✅ إجمالي التعليقات: {comments_count}")
    
    # ========== 5. إضافة الأخبار ==========
    print("\n📰 جاري إضافة الأخبار...")
    news_collection = db.news
    
    for news_data in NEWS_DATA:
        existing = await news_collection.find_one({"title": news_data["title"]})
        if existing:
            continue
            
        news = {
            "title": news_data["title"],
            "content": news_data["content"],
            "source": news_data["source"],
            "image_url": "",
            "views_count": random.randint(100, 5000),
            "likes_count": random.randint(10, 500),
            "is_featured": random.choice([True, False]),
            "is_breaking": random.choice([True, False, False]),
            "category": "sports",
            "created_at": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72)),
            "published_at": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72)),
        }
        await news_collection.insert_one(news)
    
    print(f"  ✅ إجمالي الأخبار: {len(NEWS_DATA)}")
    
    # ========== 6. إضافة الإعلانات/Announcements ==========
    print("\n📢 جاري إضافة الإعلانات...")
    announcements_collection = db.announcements
    
    announcements = [
        {"title": "مرحباً بكم في صوت الكورة!", "content": "التطبيق الأول لمحبي كرة القدم", "type": "welcome"},
        {"title": "ميزة جديدة: البث المباشر", "content": "الآن يمكنك البث المباشر من الملعب", "type": "feature"},
        {"title": "مسابقة التوقعات", "content": "شارك في مسابقة توقع النتائج واربح جوائز", "type": "contest"},
    ]
    
    for ann_data in announcements:
        existing = await announcements_collection.find_one({"title": ann_data["title"]})
        if not existing:
            announcement = {
                **ann_data,
                "is_active": True,
                "priority": random.randint(1, 10),
                "created_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
            }
            await announcements_collection.insert_one(announcement)
    
    print(f"  ✅ إجمالي الإعلانات: {len(announcements)}")
    
    # ========== 7. إنشاء Indexes ==========
    print("\n🔧 جاري إنشاء الفهارس...")
    
    await users_collection.create_index("email", unique=True)
    await users_collection.create_index("username")
    await rooms_collection.create_index("name")
    await rooms_collection.create_index("is_live")
    await rooms_collection.create_index("category")
    await threads_collection.create_index("author_id")
    await threads_collection.create_index("created_at")
    
    print("  ✅ تم إنشاء الفهارس")
    
    # ========== النهاية ==========
    print("\n" + "="*50)
    print("🎉 تم إضافة جميع البيانات بنجاح!")
    print("="*50)
    print(f"""
📊 ملخص البيانات:
   👥 المستخدمين: {len(user_ids)}
   🎙️ الغرف: {len(room_ids)}
   📝 المنشورات: {len(thread_ids)}
   💬 التعليقات: {comments_count}
   📰 الأخبار: {len(NEWS_DATA)}
   📢 الإعلانات: {len(announcements)}
    """)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
