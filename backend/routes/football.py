"""
Football routes - Live scores, matches, standings, and news
"""
from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
import os
import logging

router = APIRouter(prefix="/football", tags=["Football"])
logger = logging.getLogger(__name__)

# API Football configuration
API_FOOTBALL_KEY = os.environ.get('API_FOOTBALL_KEY', '')
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"

# Football leagues data
FOOTBALL_LEAGUES = [
    # الدوريات الكبرى
    {"id": 307, "name": "دوري روشن السعودي", "country": "Saudi Arabia", "logo": "https://media.api-sports.io/football/leagues/307.png", "flag": "SA", "type": "league"},
    {"id": 39, "name": "الدوري الإنجليزي", "country": "England", "logo": "https://media.api-sports.io/football/leagues/39.png", "flag": "GB-ENG", "type": "league"},
    {"id": 140, "name": "الدوري الإسباني", "country": "Spain", "logo": "https://media.api-sports.io/football/leagues/140.png", "flag": "ES", "type": "league"},
    {"id": 135, "name": "الدوري الإيطالي", "country": "Italy", "logo": "https://media.api-sports.io/football/leagues/135.png", "flag": "IT", "type": "league"},
    {"id": 78, "name": "الدوري الألماني", "country": "Germany", "logo": "https://media.api-sports.io/football/leagues/78.png", "flag": "DE", "type": "league"},
    {"id": 61, "name": "الدوري الفرنسي", "country": "France", "logo": "https://media.api-sports.io/football/leagues/61.png", "flag": "FR", "type": "league"},
    {"id": 40, "name": "دوري تشامبيونشيب", "country": "England", "logo": "https://media.api-sports.io/football/leagues/40.png", "flag": "GB-ENG", "type": "league"},
    
    # البطولات الأوروبية
    {"id": 2, "name": "دوري أبطال أوروبا", "country": "Europe", "logo": "https://media.api-sports.io/football/leagues/2.png", "flag": "EU", "type": "cup"},
    {"id": 3, "name": "الدوري الأوروبي", "country": "Europe", "logo": "https://media.api-sports.io/football/leagues/3.png", "flag": "EU", "type": "cup"},
    {"id": 848, "name": "دوري المؤتمرات الأوروبي", "country": "Europe", "logo": "https://media.api-sports.io/football/leagues/848.png", "flag": "EU", "type": "cup"},
    
    # الكؤوس المحلية
    {"id": 45, "name": "كأس الاتحاد الإنجليزي", "country": "England", "logo": "https://media.api-sports.io/football/leagues/45.png", "flag": "GB-ENG", "type": "cup"},
    {"id": 48, "name": "كأس رابطة الأندية الإنجليزية", "country": "England", "logo": "https://media.api-sports.io/football/leagues/48.png", "flag": "GB-ENG", "type": "cup"},
    {"id": 143, "name": "كأس ملك إسبانيا", "country": "Spain", "logo": "https://media.api-sports.io/football/leagues/143.png", "flag": "ES", "type": "cup"},
    {"id": 137, "name": "كأس إيطاليا", "country": "Italy", "logo": "https://media.api-sports.io/football/leagues/137.png", "flag": "IT", "type": "cup"},
    {"id": 81, "name": "كأس ألمانيا", "country": "Germany", "logo": "https://media.api-sports.io/football/leagues/81.png", "flag": "DE", "type": "cup"},
    {"id": 66, "name": "كأس فرنسا", "country": "France", "logo": "https://media.api-sports.io/football/leagues/66.png", "flag": "FR", "type": "cup"},
    {"id": 99, "name": "كأس خادم الحرمين الشريفين", "country": "Saudi Arabia", "logo": "https://media.api-sports.io/football/leagues/99.png", "flag": "SA", "type": "cup"},
]

LEAGUE_NAME_MAP = {league["id"]: league for league in FOOTBALL_LEAGUES}

# Team name translations
TEAM_TRANSLATIONS = {
    "Al Hilal": "الهلال",
    "Al-Hilal": "الهلال",
    "Al Nassr": "النصر",
    "Al-Nassr": "النصر",
    "Al Ittihad": "الاتحاد",
    "Al-Ittihad": "الاتحاد",
    "Al Ahli": "الأهلي",
    "Al-Ahli": "الأهلي",
    "Al Shabab": "الشباب",
    "Al-Shabab": "الشباب",
    "Al Fath": "الفتح",
    "Al-Fath": "الفتح",
    "Real Madrid": "ريال مدريد",
    "Barcelona": "برشلونة",
    "Atletico Madrid": "أتلتيكو مدريد",
    "Manchester City": "مانشستر سيتي",
    "Liverpool": "ليفربول",
    "Arsenal": "أرسنال",
    "Chelsea": "تشيلسي",
    "Manchester United": "مانشستر يونايتد",
    "Bayern Munich": "بايرن ميونخ",
    "Borussia Dortmund": "دورتموند",
    "Paris Saint Germain": "باريس سان جيرمان",
    "PSG": "باريس سان جيرمان",
    "Juventus": "يوفنتوس",
    "AC Milan": "ميلان",
    "Inter": "إنتر ميلان",
    "Napoli": "نابولي",
}

LEAGUE_TRANSLATIONS = {
    "Saudi Pro League": "دوري روشن السعودي",
    "Premier League": "الدوري الإنجليزي",
    "La Liga": "الدوري الإسباني",
    "Serie A": "الدوري الإيطالي",
    "Bundesliga": "الدوري الألماني",
    "Ligue 1": "الدوري الفرنسي",
    "UEFA Champions League": "دوري أبطال أوروبا",
    "UEFA Europa League": "الدوري الأوروبي",
}

def translate_team(name: str) -> str:
    return TEAM_TRANSLATIONS.get(name, name)

def translate_league(name: str) -> str:
    return LEAGUE_TRANSLATIONS.get(name, name)


async def fetch_from_api_football(endpoint: str, params: dict = None):
    """Fetch data from API-Football"""
    if not API_FOOTBALL_KEY:
        return None
    
    headers = {"x-apisports-key": API_FOOTBALL_KEY}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{API_FOOTBALL_BASE_URL}/{endpoint}",
                params=params,
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", [])
        except Exception as e:
            logger.error(f"API Football error: {e}")
            return None


def format_match(fixture: dict) -> dict:
    """Format API response to our match format"""
    league_id = fixture.get("league", {}).get("id")
    league_info = LEAGUE_NAME_MAP.get(league_id, {
        "id": league_id,
        "name": fixture.get("league", {}).get("name", ""),
        "logo": fixture.get("league", {}).get("logo", ""),
        "flag": fixture.get("league", {}).get("flag", "")
    })
    
    status_map = {
        "NS": "SCHEDULED",
        "1H": "LIVE",
        "HT": "LIVE",
        "2H": "LIVE",
        "ET": "LIVE",
        "P": "LIVE",
        "FT": "FINISHED",
        "AET": "FINISHED",
        "PEN": "FINISHED",
        "PST": "POSTPONED",
        "CANC": "CANCELLED",
        "ABD": "ABANDONED",
        "TBD": "SCHEDULED",
    }
    
    raw_status = fixture.get("fixture", {}).get("status", {}).get("short", "NS")
    
    return {
        "id": str(fixture.get("fixture", {}).get("id", "")),
        "league": league_info,
        "home_team": {
            "name": fixture.get("teams", {}).get("home", {}).get("name", ""),
            "logo": fixture.get("teams", {}).get("home", {}).get("logo", ""),
            "score": fixture.get("goals", {}).get("home")
        },
        "away_team": {
            "name": fixture.get("teams", {}).get("away", {}).get("name", ""),
            "logo": fixture.get("teams", {}).get("away", {}).get("logo", ""),
            "score": fixture.get("goals", {}).get("away")
        },
        "status": status_map.get(raw_status, "SCHEDULED"),
        "minute": fixture.get("fixture", {}).get("status", {}).get("elapsed"),
        "date": fixture.get("fixture", {}).get("date", ""),
        "venue": fixture.get("fixture", {}).get("venue", {}).get("name", "")
    }


def get_sample_matches():
    """Sample realistic match data (fallback when API is not available)"""
    now = datetime.now(timezone.utc)
    return [
        # Live matches
        {
            "id": "match_1",
            "league": FOOTBALL_LEAGUES[0],
            "home_team": {"name": "الهلال", "logo": "https://media.api-sports.io/football/teams/2932.png", "score": 2},
            "away_team": {"name": "النصر", "logo": "https://media.api-sports.io/football/teams/2939.png", "score": 1},
            "status": "LIVE",
            "minute": 67,
            "date": now.isoformat(),
            "venue": "استاد الملك فهد الدولي"
        },
        {
            "id": "match_2",
            "league": FOOTBALL_LEAGUES[1],
            "home_team": {"name": "مانشستر سيتي", "logo": "https://media.api-sports.io/football/teams/50.png", "score": 3},
            "away_team": {"name": "ليفربول", "logo": "https://media.api-sports.io/football/teams/40.png", "score": 2},
            "status": "LIVE",
            "minute": 82,
            "date": now.isoformat(),
            "venue": "الاتحاد"
        },
        {
            "id": "match_3",
            "league": FOOTBALL_LEAGUES[2],
            "home_team": {"name": "ريال مدريد", "logo": "https://media.api-sports.io/football/teams/541.png", "score": 1},
            "away_team": {"name": "برشلونة", "logo": "https://media.api-sports.io/football/teams/529.png", "score": 1},
            "status": "LIVE",
            "minute": 45,
            "date": now.isoformat(),
            "venue": "سانتياغو برنابيو"
        },
        # Upcoming matches
        {
            "id": "match_4",
            "league": FOOTBALL_LEAGUES[0],
            "home_team": {"name": "الاتحاد", "logo": "https://media.api-sports.io/football/teams/2944.png", "score": None},
            "away_team": {"name": "الأهلي", "logo": "https://media.api-sports.io/football/teams/2934.png", "score": None},
            "status": "SCHEDULED",
            "minute": None,
            "date": (now + timedelta(hours=3)).isoformat(),
            "venue": "استاد الجوهرة"
        },
        {
            "id": "match_5",
            "league": FOOTBALL_LEAGUES[1],
            "home_team": {"name": "أرسنال", "logo": "https://media.api-sports.io/football/teams/42.png", "score": None},
            "away_team": {"name": "تشيلسي", "logo": "https://media.api-sports.io/football/teams/49.png", "score": None},
            "status": "SCHEDULED",
            "minute": None,
            "date": (now + timedelta(hours=5)).isoformat(),
            "venue": "الإمارات"
        },
        {
            "id": "match_6",
            "league": FOOTBALL_LEAGUES[3],
            "home_team": {"name": "يوفنتوس", "logo": "https://media.api-sports.io/football/teams/496.png", "score": None},
            "away_team": {"name": "ميلان", "logo": "https://media.api-sports.io/football/teams/489.png", "score": None},
            "status": "SCHEDULED",
            "minute": None,
            "date": (now + timedelta(days=1)).isoformat(),
            "venue": "أليانز ستاديوم"
        },
        # Finished matches
        {
            "id": "match_7",
            "league": FOOTBALL_LEAGUES[0],
            "home_team": {"name": "الشباب", "logo": "https://media.api-sports.io/football/teams/2936.png", "score": 2},
            "away_team": {"name": "الفتح", "logo": "https://media.api-sports.io/football/teams/2946.png", "score": 0},
            "status": "FINISHED",
            "minute": 90,
            "date": (now - timedelta(hours=3)).isoformat(),
            "venue": "استاد الأمير فيصل"
        },
        {
            "id": "match_8",
            "league": FOOTBALL_LEAGUES[4],
            "home_team": {"name": "بايرن ميونخ", "logo": "https://media.api-sports.io/football/teams/157.png", "score": 4},
            "away_team": {"name": "دورتموند", "logo": "https://media.api-sports.io/football/teams/165.png", "score": 1},
            "status": "FINISHED",
            "minute": 90,
            "date": (now - timedelta(hours=5)).isoformat(),
            "venue": "أليانز أرينا"
        },
    ]


def get_sample_standings(league_id: int):
    standings = {
        307: [  # Saudi Pro League
            {"rank": 1, "team": "الهلال", "logo": "https://media.api-sports.io/football/teams/2932.png", "points": 45, "played": 18, "won": 14, "draw": 3, "lost": 1, "gf": 42, "ga": 12, "gd": 30},
            {"rank": 2, "team": "النصر", "logo": "https://media.api-sports.io/football/teams/2939.png", "points": 42, "played": 18, "won": 13, "draw": 3, "lost": 2, "gf": 48, "ga": 18, "gd": 30},
            {"rank": 3, "team": "الاتحاد", "logo": "https://media.api-sports.io/football/teams/2944.png", "points": 38, "played": 18, "won": 11, "draw": 5, "lost": 2, "gf": 35, "ga": 15, "gd": 20},
            {"rank": 4, "team": "الأهلي", "logo": "https://media.api-sports.io/football/teams/2934.png", "points": 35, "played": 18, "won": 10, "draw": 5, "lost": 3, "gf": 32, "ga": 18, "gd": 14},
            {"rank": 5, "team": "الشباب", "logo": "https://media.api-sports.io/football/teams/2936.png", "points": 30, "played": 18, "won": 9, "draw": 3, "lost": 6, "gf": 28, "ga": 22, "gd": 6},
        ],
        39: [  # Premier League
            {"rank": 1, "team": "ليفربول", "logo": "https://media.api-sports.io/football/teams/40.png", "points": 47, "played": 18, "won": 15, "draw": 2, "lost": 1, "gf": 45, "ga": 15, "gd": 30},
            {"rank": 2, "team": "أرسنال", "logo": "https://media.api-sports.io/football/teams/42.png", "points": 40, "played": 18, "won": 12, "draw": 4, "lost": 2, "gf": 38, "ga": 16, "gd": 22},
            {"rank": 3, "team": "مانشستر سيتي", "logo": "https://media.api-sports.io/football/teams/50.png", "points": 38, "played": 18, "won": 11, "draw": 5, "lost": 2, "gf": 42, "ga": 22, "gd": 20},
            {"rank": 4, "team": "تشيلسي", "logo": "https://media.api-sports.io/football/teams/49.png", "points": 35, "played": 18, "won": 10, "draw": 5, "lost": 3, "gf": 35, "ga": 20, "gd": 15},
            {"rank": 5, "team": "مانشستر يونايتد", "logo": "https://media.api-sports.io/football/teams/33.png", "points": 28, "played": 18, "won": 8, "draw": 4, "lost": 6, "gf": 28, "ga": 25, "gd": 3},
        ],
        140: [  # La Liga
            {"rank": 1, "team": "ريال مدريد", "logo": "https://media.api-sports.io/football/teams/541.png", "points": 43, "played": 18, "won": 13, "draw": 4, "lost": 1, "gf": 40, "ga": 14, "gd": 26},
            {"rank": 2, "team": "برشلونة", "logo": "https://media.api-sports.io/football/teams/529.png", "points": 41, "played": 18, "won": 13, "draw": 2, "lost": 3, "gf": 48, "ga": 20, "gd": 28},
            {"rank": 3, "team": "أتلتيكو مدريد", "logo": "https://media.api-sports.io/football/teams/530.png", "points": 38, "played": 18, "won": 11, "draw": 5, "lost": 2, "gf": 32, "ga": 12, "gd": 20},
        ],
    }
    return standings.get(league_id, [])


def get_sample_top_scorers(league_id: int):
    scorers = {
        307: [
            {"rank": 1, "player": "كريستيانو رونالدو", "team": "النصر", "logo": "https://media.api-sports.io/football/players/874.png", "goals": 18, "assists": 5},
            {"rank": 2, "player": "ألكسندر ميتروفيتش", "team": "الهلال", "logo": "https://media.api-sports.io/football/players/1100.png", "goals": 15, "assists": 3},
            {"rank": 3, "player": "مالكوم", "team": "الهلال", "logo": "https://media.api-sports.io/football/players/2295.png", "goals": 12, "assists": 8},
        ],
        39: [
            {"rank": 1, "player": "محمد صلاح", "team": "ليفربول", "logo": "https://media.api-sports.io/football/players/306.png", "goals": 17, "assists": 10},
            {"rank": 2, "player": "إيرلينج هالاند", "team": "مانشستر سيتي", "logo": "https://media.api-sports.io/football/players/1100.png", "goals": 16, "assists": 4},
            {"rank": 3, "player": "كول بالمر", "team": "تشيلسي", "logo": "https://media.api-sports.io/football/players/2295.png", "goals": 14, "assists": 6},
        ],
        140: [
            {"rank": 1, "player": "روبرت ليفاندوفسكي", "team": "برشلونة", "logo": "https://media.api-sports.io/football/players/521.png", "goals": 15, "assists": 4},
            {"rank": 2, "player": "كيليان مبابي", "team": "ريال مدريد", "logo": "https://media.api-sports.io/football/players/278.png", "goals": 13, "assists": 5},
            {"rank": 3, "player": "فينيسيوس جونيور", "team": "ريال مدريد", "logo": "https://media.api-sports.io/football/players/2295.png", "goals": 11, "assists": 8},
        ],
    }
    return scorers.get(league_id, [])


# ==================== ROUTES ====================

@router.get("/leagues")
async def get_football_leagues():
    """Get all available football leagues"""
    return {"leagues": FOOTBALL_LEAGUES}


@router.get("/fixtures/date/{date}")
async def get_fixtures_by_date(date: str):
    """Get all fixtures for a specific date (YYYY-MM-DD)"""
    all_fixtures = []
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        async def fetch_league_fixtures(league):
            fixtures = await fetch_from_api_football("fixtures", {
                "league": league["id"],
                "date": date,
                "season": CURRENT_SEASON
            })
            return fixtures if fixtures else []
        
        results = await asyncio.gather(*[fetch_league_fixtures(league) for league in FOOTBALL_LEAGUES])
        
        for fixtures in results:
            for fixture in fixtures:
                all_fixtures.append(format_match(fixture))
    
    if not all_fixtures:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if date == today:
            all_fixtures = get_sample_matches()
            all_fixtures = [m for m in all_fixtures if m["status"] in ["LIVE", "SCHEDULED"]]
    
    all_fixtures.sort(key=lambda x: x.get("date", ""))
    
    grouped = {}
    for match in all_fixtures:
        league_name = match.get("league", {}).get("name", "Other")
        if league_name not in grouped:
            grouped[league_name] = []
        grouped[league_name].append(match)
    
    return {"fixtures": grouped, "total": len(all_fixtures), "date": date}


@router.get("/fixtures/upcoming")
async def get_upcoming_fixtures(days: int = 7):
    """Get all upcoming fixtures for the next X days"""
    all_fixtures = []
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        async def fetch_league_upcoming(league):
            fixtures = await fetch_from_api_football("fixtures", {
                "league": league["id"],
                "next": 15,
                "season": CURRENT_SEASON
            })
            return fixtures if fixtures else []
        
        results = await asyncio.gather(*[fetch_league_upcoming(league) for league in FOOTBALL_LEAGUES])
        
        for fixtures in results:
            for fixture in fixtures:
                all_fixtures.append(format_match(fixture))
    
    all_fixtures.sort(key=lambda x: x.get("date", ""))
    
    grouped = {}
    for match in all_fixtures:
        date_str = match.get("date", "")[:10]
        if date_str not in grouped:
            grouped[date_str] = []
        grouped[date_str].append(match)
    
    return {"fixtures": grouped, "total": len(all_fixtures)}


@router.get("/fixtures/today")
async def get_today_fixtures():
    """Get all fixtures for today"""
    all_fixtures = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        async def fetch_league_today(league):
            fixtures = await fetch_from_api_football("fixtures", {
                "league": league["id"],
                "date": today,
                "season": CURRENT_SEASON
            })
            return fixtures if fixtures else []
        
        results = await asyncio.gather(*[fetch_league_today(league) for league in FOOTBALL_LEAGUES])
        
        for fixtures in results:
            for fixture in fixtures:
                all_fixtures.append(format_match(fixture))
    
    if not all_fixtures:
        all_fixtures = get_sample_matches()
    
    all_fixtures.sort(key=lambda x: x.get("date", ""))
    
    return {"fixtures": all_fixtures, "total": len(all_fixtures), "date": today}


@router.get("/matches")
async def get_matches():
    """Get all matches - live, scheduled, and recent results"""
    all_matches = []
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        async def fetch_league_matches(league):
            fixtures = await fetch_from_api_football("fixtures", {
                "league": league["id"],
                "season": CURRENT_SEASON,
                "last": 10
            })
            return fixtures if fixtures else []
        
        results = await asyncio.gather(*[fetch_league_matches(league) for league in FOOTBALL_LEAGUES[:7]])
        
        for fixtures in results:
            for fixture in fixtures:
                all_matches.append(format_match(fixture))
    
    if not all_matches:
        all_matches = get_sample_matches()
    
    live_matches = [m for m in all_matches if m["status"] == "LIVE"]
    scheduled_matches = [m for m in all_matches if m["status"] == "SCHEDULED"]
    finished_matches = [m for m in all_matches if m["status"] == "FINISHED"]
    
    return {
        "live": live_matches[:5],
        "scheduled": scheduled_matches[:10],
        "finished": finished_matches[:10],
        "total": len(all_matches)
    }


@router.get("/live")
async def get_live_matches():
    """Get currently live matches"""
    live_matches = []
    
    if API_FOOTBALL_KEY:
        fixtures = await fetch_from_api_football("fixtures", {"live": "all"})
        if fixtures:
            target_league_ids = {league["id"] for league in FOOTBALL_LEAGUES}
            for fixture in fixtures:
                if fixture.get("league", {}).get("id") in target_league_ids:
                    live_matches.append(format_match(fixture))
    
    if not live_matches:
        all_matches = get_sample_matches()
        live_matches = [m for m in all_matches if m["status"] == "LIVE"]
    
    return {"matches": live_matches, "total": len(live_matches)}


@router.get("/standings/{league_id}")
async def get_standings(league_id: int):
    """Get standings for a specific league"""
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        data = await fetch_from_api_football("standings", {
            "league": league_id,
            "season": CURRENT_SEASON
        })
        
        if data and len(data) > 0:
            standings_data = data[0].get("league", {}).get("standings", [[]])[0]
            formatted_standings = []
            for team in standings_data:
                formatted_standings.append({
                    "rank": team.get("rank"),
                    "team": team.get("team", {}).get("name"),
                    "logo": team.get("team", {}).get("logo"),
                    "points": team.get("points"),
                    "played": team.get("all", {}).get("played"),
                    "won": team.get("all", {}).get("win"),
                    "draw": team.get("all", {}).get("draw"),
                    "lost": team.get("all", {}).get("lose"),
                    "gf": team.get("all", {}).get("goals", {}).get("for"),
                    "ga": team.get("all", {}).get("goals", {}).get("against"),
                    "gd": team.get("goalsDiff")
                })
            return {"standings": formatted_standings, "league_id": league_id}
    
    return {"standings": get_sample_standings(league_id), "league_id": league_id}


@router.get("/scorers/{league_id}")
async def get_top_scorers(league_id: int):
    """Get top scorers for a specific league"""
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        data = await fetch_from_api_football("players/topscorers", {
            "league": league_id,
            "season": CURRENT_SEASON
        })
        
        if data:
            formatted_scorers = []
            for i, player_data in enumerate(data[:10]):
                player = player_data.get("player", {})
                stats = player_data.get("statistics", [{}])[0]
                formatted_scorers.append({
                    "rank": i + 1,
                    "player": player.get("name"),
                    "team": stats.get("team", {}).get("name"),
                    "logo": player.get("photo"),
                    "goals": stats.get("goals", {}).get("total", 0),
                    "assists": stats.get("goals", {}).get("assists", 0)
                })
            return {"scorers": formatted_scorers, "league_id": league_id}
    
    return {"scorers": get_sample_top_scorers(league_id), "league_id": league_id}


@router.get("/assists/{league_id}")
async def get_top_assists(league_id: int):
    """Get top assist providers for a specific league"""
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        data = await fetch_from_api_football("players/topassists", {
            "league": league_id,
            "season": CURRENT_SEASON
        })
        
        if data:
            formatted_assists = []
            for i, player_data in enumerate(data[:10]):
                player = player_data.get("player", {})
                stats = player_data.get("statistics", [{}])[0]
                formatted_assists.append({
                    "rank": i + 1,
                    "player": player.get("name"),
                    "team": stats.get("team", {}).get("name"),
                    "logo": player.get("photo"),
                    "assists": stats.get("goals", {}).get("assists", 0),
                    "goals": stats.get("goals", {}).get("total", 0)
                })
            return {"assists": formatted_assists, "league_id": league_id}
    
    scorers = get_sample_top_scorers(league_id)
    assists = sorted(scorers, key=lambda x: x.get("assists", 0), reverse=True)
    return {"assists": assists, "league_id": league_id}


@router.get("/league/{league_id}/fixtures")
async def get_league_fixtures(league_id: int, status: str = None):
    """Get all fixtures for a specific league"""
    all_fixtures = []
    CURRENT_SEASON = 2025
    
    if API_FOOTBALL_KEY:
        params = {
            "league": league_id,
            "season": CURRENT_SEASON
        }
        
        if status == "live":
            params["live"] = "all"
        elif status == "scheduled":
            params["next"] = 20
        elif status == "finished":
            params["last"] = 20
        else:
            params["last"] = 30
        
        fixtures = await fetch_from_api_football("fixtures", params)
        
        if fixtures:
            for fixture in fixtures:
                all_fixtures.append(format_match(fixture))
    
    if not all_fixtures:
        all_fixtures = [m for m in get_sample_matches() if m["league"]["id"] == league_id]
    
    all_fixtures.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    return {"fixtures": all_fixtures, "total": len(all_fixtures), "league_id": league_id}


@router.get("/match/{fixture_id}")
async def get_match_details(fixture_id: str):
    """Get detailed match information including events, lineups, and statistics"""
    
    if API_FOOTBALL_KEY and fixture_id.isdigit():
        fixture_data = await fetch_from_api_football("fixtures", {"id": fixture_id})
        
        if fixture_data and len(fixture_data) > 0:
            fixture = fixture_data[0]
            match_info = format_match(fixture)
            
            events_data = await fetch_from_api_football("fixtures/events", {"fixture": fixture_id})
            events = []
            if events_data:
                for event in events_data:
                    events.append({
                        "time": event.get("time", {}).get("elapsed"),
                        "extra_time": event.get("time", {}).get("extra"),
                        "team": event.get("team", {}).get("name"),
                        "team_logo": event.get("team", {}).get("logo"),
                        "player": event.get("player", {}).get("name"),
                        "assist": event.get("assist", {}).get("name"),
                        "type": event.get("type"),
                        "detail": event.get("detail")
                    })
            
            lineups_data = await fetch_from_api_football("fixtures/lineups", {"fixture": fixture_id})
            lineups = {"home": None, "away": None}
            if lineups_data:
                for i, lineup in enumerate(lineups_data[:2]):
                    team_key = "home" if i == 0 else "away"
                    lineups[team_key] = {
                        "team": lineup.get("team", {}).get("name"),
                        "logo": lineup.get("team", {}).get("logo"),
                        "formation": lineup.get("formation"),
                        "coach": lineup.get("coach", {}).get("name"),
                        "startXI": [
                            {
                                "name": p.get("player", {}).get("name"),
                                "number": p.get("player", {}).get("number"),
                                "pos": p.get("player", {}).get("pos")
                            }
                            for p in lineup.get("startXI", [])
                        ],
                        "substitutes": [
                            {
                                "name": p.get("player", {}).get("name"),
                                "number": p.get("player", {}).get("number"),
                                "pos": p.get("player", {}).get("pos")
                            }
                            for p in lineup.get("substitutes", [])
                        ]
                    }
            
            stats_data = await fetch_from_api_football("fixtures/statistics", {"fixture": fixture_id})
            statistics = {"home": {}, "away": {}}
            if stats_data:
                for i, team_stats in enumerate(stats_data[:2]):
                    team_key = "home" if i == 0 else "away"
                    for stat in team_stats.get("statistics", []):
                        stat_type = stat.get("type", "").lower().replace(" ", "_")
                        statistics[team_key][stat_type] = stat.get("value")
            
            return {
                "match": match_info,
                "events": events,
                "lineups": lineups,
                "statistics": statistics
            }
    
    sample_matches = get_sample_matches()
    for match in sample_matches:
        if match["id"] == fixture_id:
            return {
                "match": match,
                "events": [
                    {"time": 23, "team": match["home_team"]["name"], "player": "لاعب 1", "type": "Goal", "detail": "Normal Goal"},
                    {"time": 45, "team": match["away_team"]["name"], "player": "لاعب 2", "type": "Goal", "detail": "Penalty"},
                    {"time": 67, "team": match["home_team"]["name"], "player": "لاعب 3", "type": "Goal", "detail": "Normal Goal"},
                ],
                "lineups": {"home": None, "away": None},
                "statistics": {
                    "home": {"ball_possession": "55%", "shots_on_goal": 8, "total_shots": 15, "corners": 6},
                    "away": {"ball_possession": "45%", "shots_on_goal": 5, "total_shots": 10, "corners": 4}
                }
            }
    
    return {"error": "Match not found"}


@router.get("/news/ticker")
async def get_news_ticker():
    """Get live news ticker with match updates, transfers, and coach quotes"""
    news_items = []
    
    if API_FOOTBALL_KEY:
        try:
            target_leagues = [307, 39, 140, 135, 78, 61, 2, 3]
            
            live_matches = await fetch_from_api_football("fixtures", {"live": "all"})
            
            if live_matches:
                for match in live_matches:
                    league_id = match.get("league", {}).get("id")
                    if league_id in target_leagues:
                        home = match.get("teams", {}).get("home", {}).get("name", "")
                        away = match.get("teams", {}).get("away", {}).get("name", "")
                        home_ar = translate_team(home)
                        away_ar = translate_team(away)
                        home_score = match.get("goals", {}).get("home", 0)
                        away_score = match.get("goals", {}).get("away", 0)
                        minute = match.get("fixture", {}).get("status", {}).get("elapsed", 0)
                        league_name = match.get("league", {}).get("name", "")
                        league_ar = translate_league(league_name)
                        
                        news_items.append({
                            "type": "live",
                            "icon": "red_circle",
                            "text": f"مباشر: {home_ar} {home_score} - {away_score} {away_ar} (د{minute}') - {league_ar}",
                            "text_en": f"LIVE: {home} {home_score} - {away_score} {away} ({minute}') - {league_name}",
                            "priority": 1
                        })
            
            async def fetch_recent_results(league_id):
                return await fetch_from_api_football("fixtures", {
                    "league": league_id,
                    "last": 3,
                    "season": 2025
                })
            
            results = await asyncio.gather(*[fetch_recent_results(lid) for lid in target_leagues[:6]])
            
            for fixtures in results:
                if fixtures:
                    for match in fixtures:
                        status = match.get("fixture", {}).get("status", {}).get("short", "")
                        if status in ["FT", "AET", "PEN"]:
                            home = match.get("teams", {}).get("home", {}).get("name", "")
                            away = match.get("teams", {}).get("away", {}).get("name", "")
                            home_ar = translate_team(home)
                            away_ar = translate_team(away)
                            home_score = match.get("goals", {}).get("home", 0)
                            away_score = match.get("goals", {}).get("away", 0)
                            league_name = match.get("league", {}).get("name", "")
                            league_ar = translate_league(league_name)
                            
                            news_items.append({
                                "type": "result",
                                "icon": "soccer",
                                "text": f"نتيجة: {home_ar} {home_score} - {away_score} {away_ar} - {league_ar}",
                                "text_en": f"Result: {home} {home_score} - {away_score} {away} - {league_name}",
                                "priority": 2
                            })
        except Exception as e:
            logger.error(f"Error fetching news ticker: {e}")
    
    static_news = [
        {"type": "transfer", "icon": "arrows_counterclockwise", "text": "رسمياً: انتقال مبابي إلى ريال مدريد", "text_en": "Official: Mbappé joins Real Madrid", "priority": 3},
        {"type": "coach", "icon": "studio_microphone", "text": "أنشيلوتي: مستعدون لدوري الأبطال", "text_en": "Ancelotti: Ready for Champions League", "priority": 4},
        {"type": "news", "icon": "newspaper", "text": "السعودية تستضيف كأس العالم 2034", "text_en": "Saudi Arabia to host World Cup 2034", "priority": 4},
        {"type": "transfer", "icon": "arrows_counterclockwise", "text": "برشلونة يجدد عقد يامال حتى 2030", "text_en": "Barcelona renews Yamal until 2030", "priority": 3},
        {"type": "coach", "icon": "studio_microphone", "text": "غوارديولا: الموسم القادم سيكون أفضل", "text_en": "Guardiola: Next season will be better", "priority": 4},
        {"type": "news", "icon": "newspaper", "text": "فيفا يعلن قواعد جديدة للتسلل باستخدام الذكاء الاصطناعي", "text_en": "FIFA announces new AI-powered offside rules", "priority": 4},
        {"type": "transfer", "icon": "arrows_counterclockwise", "text": "النصر يضم نجم جديد من الدوري الإنجليزي", "text_en": "Al-Nassr signs new star from Premier League", "priority": 3},
        {"type": "coach", "icon": "studio_microphone", "text": "مدرب الهلال: نطمح للقب الآسيوي", "text_en": "Al-Hilal coach: We aim for Asian title", "priority": 4},
    ]
    
    all_news = news_items + static_news
    all_news.sort(key=lambda x: x.get("priority", 5))
    
    return {"news": all_news[:15], "total": len(all_news)}
