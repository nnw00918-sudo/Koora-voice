"""
Application Configuration and Database Setup
"""
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Directories
STATIC_DIR = ROOT_DIR / "static"
AVATARS_DIR = STATIC_DIR / "avatars"
UPLOADS_DIR = ROOT_DIR / "uploads"
THREAD_MEDIA_DIR = STATIC_DIR / "thread_media"

# Create directories
STATIC_DIR.mkdir(exist_ok=True)
AVATARS_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)
THREAD_MEDIA_DIR.mkdir(exist_ok=True)

# JWT Settings
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "koraverse_secret_key_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

# Agora Settings
AGORA_APP_ID = os.environ.get("AGORA_APP_ID", "")
AGORA_APP_CERTIFICATE = os.environ.get("AGORA_APP_CERTIFICATE", "")

# API-Football Settings
API_FOOTBALL_KEY = os.environ.get("API_FOOTBALL_KEY", "")
API_FOOTBALL_HOST = "v3.football.api-sports.io"

# Owner emails - only these accounts have full control
OWNER_EMAILS = ["naifliver@gmail.com", "naifliver97@gmail.com"]

# Role hierarchy: owner > admin > mod > user
ROLE_HIERARCHY = ["user", "mod", "admin", "owner"]

# Gifts Configuration
GIFTS = [
    {"id": "rose", "name": "وردة", "icon": "🌹", "coins": 10},
    {"id": "heart", "name": "قلب", "icon": "❤️", "coins": 50},
    {"id": "trophy", "name": "كأس", "icon": "🏆", "coins": 100},
    {"id": "football", "name": "كرة", "icon": "⚽", "coins": 150},
    {"id": "star", "name": "نجمة", "icon": "⭐", "coins": 200},
    {"id": "crown", "name": "تاج", "icon": "👑", "coins": 500},
]

# Categories
CATEGORIES = ["رياضة", "ترفيه", "تكنولوجيا", "ثقافة", "أخبار", "ألعاب"]

# Arabic Team Names Mapping
TEAM_NAME_TRANSLATIONS = {
    # Premier League
    "Manchester United": "مانشستر يونايتد",
    "Manchester City": "مانشستر سيتي",
    "Liverpool": "ليفربول",
    "Chelsea": "تشيلسي",
    "Arsenal": "أرسنال",
    "Tottenham": "توتنهام",
    "Newcastle": "نيوكاسل",
    "Aston Villa": "أستون فيلا",
    "Brighton": "برايتون",
    "West Ham": "وست هام",
    "Brentford": "برينتفورد",
    "Fulham": "فولهام",
    "Crystal Palace": "كريستال بالاس",
    "Wolves": "وولفرهامبتون",
    "Everton": "إيفرتون",
    "Nottingham Forest": "نوتنغهام فورست",
    "Bournemouth": "بورنموث",
    "Luton": "لوتون",
    "Burnley": "بيرنلي",
    "Sheffield Utd": "شيفيلد يونايتد",
    # La Liga
    "Real Madrid": "ريال مدريد",
    "Barcelona": "برشلونة",
    "Atletico Madrid": "أتلتيكو مدريد",
    "Real Sociedad": "ريال سوسيداد",
    "Athletic Club": "أتلتيك بيلباو",
    "Real Betis": "ريال بيتيس",
    "Villarreal": "فياريال",
    "Valencia": "فالنسيا",
    "Sevilla": "إشبيلية",
    "Girona": "جيرونا",
    "Getafe": "خيتافي",
    "Osasuna": "أوساسونا",
    "Celta Vigo": "سيلتا فيغو",
    "Mallorca": "ريال مايوركا",
    "Las Palmas": "لاس بالماس",
    "Rayo Vallecano": "رايو فاليكانو",
    "Alaves": "ديبورتيفو ألافيس",
    "Cadiz": "قادش",
    "Granada CF": "غرناطة",
    "Almeria": "ألميريا",
    # Saudi Pro League
    "Al-Hilal": "الهلال",
    "Al Hilal": "الهلال",
    "Al-Nassr": "النصر",
    "Al Nassr": "النصر",
    "Al-Ittihad": "الاتحاد",
    "Al Ittihad": "الاتحاد",
    "Al-Ahli": "الأهلي",
    "Al Ahli": "الأهلي",
    "Al-Shabab": "الشباب",
    "Al Shabab": "الشباب",
    "Al-Taawoun": "التعاون",
    "Al Taawoun": "التعاون",
    "Al-Fateh": "الفتح",
    "Al Fateh": "الفتح",
    "Al-Ettifaq": "الاتفاق",
    "Al Ettifaq": "الاتفاق",
    "Al-Raed": "الرائد",
    "Al Raed": "الرائد",
    "Al-Feiha": "الفيحاء",
    "Al Feiha": "الفيحاء",
    "Al-Khaleej": "الخليج",
    "Al Khaleej": "الخليج",
    "Al-Hazem": "الحزم",
    "Al Hazem": "الحزم",
    "Al-Riyadh": "الرياض",
    "Al Riyadh": "الرياض",
    "Al-Okhdood": "الأخدود",
    "Al Okhdood": "الأخدود",
    "Damac": "ضمك",
    "Abha": "أبها",
    # Serie A
    "Inter": "إنتر ميلان",
    "AC Milan": "إي سي ميلان",
    "Juventus": "يوفنتوس",
    "Napoli": "نابولي",
    "AS Roma": "روما",
    "Lazio": "لاتسيو",
    "Atalanta": "أتالانتا",
    "Fiorentina": "فيورنتينا",
    "Bologna": "بولونيا",
    "Torino": "تورينو",
    "Monza": "مونزا",
    "Udinese": "أودينيزي",
    "Sassuolo": "ساسولو",
    "Empoli": "إمبولي",
    "Cagliari": "كالياري",
    "Verona": "هيلاس فيرونا",
    "Lecce": "ليتشي",
    "Genoa": "جنوى",
    "Frosinone": "فروزينوني",
    "Salernitana": "ساليرنيتانا",
    # Bundesliga
    "Bayern Munich": "بايرن ميونخ",
    "Borussia Dortmund": "بوروسيا دورتموند",
    "RB Leipzig": "لايبزيغ",
    "Bayer Leverkusen": "باير ليفركوزن",
    "Union Berlin": "يونيون برلين",
    "Freiburg": "فرايبورغ",
    "Eintracht Frankfurt": "آينتراخت فرانكفورت",
    "VfB Stuttgart": "شتوتغارت",
    "Wolfsburg": "فولفسبورغ",
    "Borussia Monchengladbach": "بوروسيا مونشنغلادباخ",
    "Werder Bremen": "فيردر بريمن",
    "Hoffenheim": "هوفنهايم",
    "Mainz": "ماينز",
    "Augsburg": "أوغسبورغ",
    "VfL Bochum": "بوخوم",
    "Heidenheim": "هايدنهايم",
    "Koln": "كولن",
    "Darmstadt": "دارمشتات",
    # Ligue 1
    "Paris Saint Germain": "باريس سان جيرمان",
    "PSG": "باريس سان جيرمان",
    "Marseille": "مارسيليا",
    "Monaco": "موناكو",
    "Lyon": "ليون",
    "Lille": "ليل",
    "Nice": "نيس",
    "Lens": "لانس",
    "Rennes": "رين",
    "Toulouse": "تولوز",
    "Montpellier": "مونبلييه",
    "Strasbourg": "ستراسبورغ",
    "Brest": "بريست",
    "Reims": "ريمس",
    "Le Havre": "لوهافر",
    "Nantes": "نانت",
    "Lorient": "لوريان",
    "Metz": "ميتز",
    "Clermont": "كليرمون",
}

def translate_team_name(name: str) -> str:
    """Translate team name to Arabic"""
    return TEAM_NAME_TRANSLATIONS.get(name, name)
