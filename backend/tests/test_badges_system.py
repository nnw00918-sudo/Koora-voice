"""
Test suite for Badges and Levels System (نظام الشارات والمستويات)
Tests: GET /api/badges/all, GET /api/badges/leaderboard, GET /api/badges/user/{user_id},
       GET /api/badges/stats/{user_id}, POST /api/badges/select-team
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "naifliver@gmail.com"
TEST_PASSWORD = "As11223344"


class TestBadgesPublicEndpoints:
    """Test public badges endpoints (no auth required)"""
    
    def test_get_all_badges_returns_27_badges(self):
        """GET /api/badges/all - should return 27 badges total"""
        response = requests.get(f"{BASE_URL}/api/badges/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "badges" in data, "Response should contain 'badges' key"
        assert "total" in data, "Response should contain 'total' key"
        assert data["total"] == 27, f"Expected 27 badges, got {data['total']}"
        
        # Verify badge categories
        badges = data["badges"]
        assert "team" in badges, "Should have team badges"
        assert "level" in badges, "Should have level badges"
        assert "achievement" in badges, "Should have achievement badges"
        
        # Verify team badges count (8 teams)
        assert len(badges["team"]) == 8, f"Expected 8 team badges, got {len(badges['team'])}"
        
        # Verify level badges count (5 levels: bronze, silver, gold, platinum, diamond)
        assert len(badges["level"]) == 5, f"Expected 5 level badges, got {len(badges['level'])}"
        
        # Verify achievement badges count (14 achievements)
        assert len(badges["achievement"]) == 14, f"Expected 14 achievement badges, got {len(badges['achievement'])}"
        
        print(f"✓ All badges endpoint returns {data['total']} badges correctly")
    
    def test_team_badges_structure(self):
        """Verify team badges have correct structure"""
        response = requests.get(f"{BASE_URL}/api/badges/all")
        assert response.status_code == 200
        
        team_badges = response.json()["badges"]["team"]
        expected_teams = ["team_alahli", "team_alhilal", "team_alnassr", "team_alittihad", 
                         "team_realmadrid", "team_barcelona", "team_liverpool", "team_mancity"]
        
        team_ids = [b["id"] for b in team_badges]
        for team in expected_teams:
            assert team in team_ids, f"Missing team badge: {team}"
        
        # Verify badge structure
        for badge in team_badges:
            assert "id" in badge, "Badge should have id"
            assert "name" in badge, "Badge should have name"
            assert "name_en" in badge, "Badge should have name_en"
            assert "icon" in badge, "Badge should have icon"
            assert "category" in badge, "Badge should have category"
            assert badge["category"] == "team", "Team badge should have category 'team'"
        
        print("✓ Team badges structure is correct")
    
    def test_level_badges_structure(self):
        """Verify level badges have correct structure with min_level"""
        response = requests.get(f"{BASE_URL}/api/badges/all")
        assert response.status_code == 200
        
        level_badges = response.json()["badges"]["level"]
        expected_levels = {
            "level_bronze": 1,
            "level_silver": 10,
            "level_gold": 25,
            "level_platinum": 50,
            "level_diamond": 100
        }
        
        for badge in level_badges:
            assert badge["id"] in expected_levels, f"Unexpected level badge: {badge['id']}"
            assert "min_level" in badge, f"Level badge {badge['id']} should have min_level"
            assert badge["min_level"] == expected_levels[badge["id"]], \
                f"Badge {badge['id']} should have min_level {expected_levels[badge['id']]}"
        
        print("✓ Level badges structure is correct with min_level values")
    
    def test_get_leaderboard(self):
        """GET /api/badges/leaderboard - should return leaderboard"""
        response = requests.get(f"{BASE_URL}/api/badges/leaderboard?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "leaderboard" in data, "Response should contain 'leaderboard' key"
        
        leaderboard = data["leaderboard"]
        assert isinstance(leaderboard, list), "Leaderboard should be a list"
        
        # Verify leaderboard entry structure
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            assert "rank" in entry, "Entry should have rank"
            assert "id" in entry, "Entry should have id"
            assert "username" in entry, "Entry should have username"
            assert "level" in entry, "Entry should have level"
            assert "xp" in entry, "Entry should have xp"
            assert entry["rank"] == 1, "First entry should have rank 1"
            
            # Verify XP is sorted descending
            for i in range(1, len(leaderboard)):
                assert leaderboard[i-1]["xp"] >= leaderboard[i]["xp"], \
                    "Leaderboard should be sorted by XP descending"
        
        print(f"✓ Leaderboard returns {len(leaderboard)} entries correctly")


class TestBadgesAuthenticatedEndpoints:
    """Test authenticated badges endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.text}")
        
        data = login_response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✓ Logged in as {self.user['username']} (id: {self.user['id']})")
    
    def test_get_user_badges(self):
        """GET /api/badges/user/{user_id} - should return user's badges"""
        response = requests.get(
            f"{BASE_URL}/api/badges/user/{self.user['id']}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "badges" in data, "Response should contain 'badges' key"
        assert "level_progress" in data, "Response should contain 'level_progress' key"
        
        # Verify level_progress structure
        progress = data["level_progress"]
        assert "current_xp" in progress, "level_progress should have current_xp"
        assert "level" in progress, "level_progress should have level"
        assert "percentage" in progress, "level_progress should have percentage"
        assert "progress_xp" in progress, "level_progress should have progress_xp"
        assert "needed_xp" in progress, "level_progress should have needed_xp"
        
        print(f"✓ User badges endpoint returns data correctly (level: {progress['level']}, xp: {progress['current_xp']})")
    
    def test_get_user_stats(self):
        """GET /api/badges/stats/{user_id} - should return user stats"""
        response = requests.get(
            f"{BASE_URL}/api/badges/stats/{self.user['id']}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response should contain 'user_id'"
        assert "level" in data, "Response should contain 'level'"
        assert "xp" in data, "Response should contain 'xp'"
        assert "stats" in data, "Response should contain 'stats'"
        assert "progress" in data, "Response should contain 'progress'"
        
        # Verify stats structure
        stats = data["stats"]
        assert "messages_sent" in stats, "stats should have messages_sent"
        assert "gifts_sent" in stats, "stats should have gifts_sent"
        assert "gifts_received" in stats, "stats should have gifts_received"
        assert "rooms_created" in stats, "stats should have rooms_created"
        assert "total_minutes" in stats, "stats should have total_minutes"
        assert "total_hours" in stats, "stats should have total_hours"
        
        print(f"✓ User stats endpoint returns data correctly")
        print(f"  - Messages sent: {stats['messages_sent']}")
        print(f"  - Gifts sent: {stats['gifts_sent']}")
        print(f"  - Rooms created: {stats['rooms_created']}")
    
    def test_select_team_badge(self):
        """POST /api/badges/select-team - should select a team badge"""
        # Select Al Hilal team
        response = requests.post(
            f"{BASE_URL}/api/badges/select-team",
            json={"team_badge_id": "team_alhilal"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "badge" in data, "Response should contain 'badge'"
        assert data["badge"]["id"] == "team_alhilal", "Selected badge should be team_alhilal"
        
        # Verify the badge is now selected
        user_badges_response = requests.get(
            f"{BASE_URL}/api/badges/user/{self.user['id']}",
            headers=self.headers
        )
        assert user_badges_response.status_code == 200
        
        user_data = user_badges_response.json()
        assert user_data.get("selected_team_badge") is not None, "User should have a selected team badge"
        assert user_data["selected_team_badge"]["id"] == "team_alhilal", "Selected team should be Al Hilal"
        
        print("✓ Team badge selection works correctly")
    
    def test_select_invalid_team_badge(self):
        """POST /api/badges/select-team - should reject invalid team badge"""
        response = requests.post(
            f"{BASE_URL}/api/badges/select-team",
            json={"team_badge_id": "invalid_team"},
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid team badge is rejected correctly")
    
    def test_select_non_team_badge_as_team(self):
        """POST /api/badges/select-team - should reject non-team badge"""
        response = requests.post(
            f"{BASE_URL}/api/badges/select-team",
            json={"team_badge_id": "level_bronze"},  # This is a level badge, not team
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Non-team badge is rejected when selecting team")
    
    def test_get_nonexistent_user_badges(self):
        """GET /api/badges/user/{user_id} - should return 404 for non-existent user"""
        response = requests.get(
            f"{BASE_URL}/api/badges/user/nonexistent-user-id-12345",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent user returns 404")
    
    def test_get_nonexistent_user_stats(self):
        """GET /api/badges/stats/{user_id} - should return 404 for non-existent user"""
        response = requests.get(
            f"{BASE_URL}/api/badges/stats/nonexistent-user-id-12345",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent user stats returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
