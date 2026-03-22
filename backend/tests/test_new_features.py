"""
Test new features for Koora Voice app:
1. Match Detail API - /api/football/match/{id}
2. Stories React API - /api/stories/{id}/react
3. Stories Reply API - /api/stories/{id}/reply
4. Stories Replies API - /api/stories/{id}/replies
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "naifliver@gmail.com"
TEST_PASSWORD = "As11223344"


class TestMatchDetailAPI:
    """Test /api/football/match/{id} endpoint"""
    
    def test_match_detail_returns_data(self):
        """Test that match detail endpoint returns proper structure"""
        # Use a sample fixture ID
        fixture_id = "12345"
        response = requests.get(f"{BASE_URL}/api/football/match/{fixture_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure
        assert "match" in data, "Response should contain 'match' key"
        assert "lineups" in data, "Response should contain 'lineups' key"
        assert "statistics" in data, "Response should contain 'statistics' key"
        assert "events" in data, "Response should contain 'events' key"
        assert "h2h" in data, "Response should contain 'h2h' key"
        
        print(f"✓ Match detail API returns proper structure")
    
    def test_match_detail_match_data(self):
        """Test that match data contains required fields"""
        fixture_id = "12345"
        response = requests.get(f"{BASE_URL}/api/football/match/{fixture_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        match = data.get("match")
        assert match is not None, "Match data should not be None"
        
        # Check match fields
        assert "home_team" in match, "Match should have home_team"
        assert "away_team" in match, "Match should have away_team"
        assert "status" in match, "Match should have status"
        
        print(f"✓ Match data contains required fields: home_team, away_team, status")
    
    def test_match_detail_lineups(self):
        """Test that lineups data is properly structured"""
        fixture_id = "12345"
        response = requests.get(f"{BASE_URL}/api/football/match/{fixture_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        lineups = data.get("lineups")
        if lineups:
            assert "home" in lineups, "Lineups should have home team"
            assert "away" in lineups, "Lineups should have away team"
            
            if lineups.get("home"):
                assert "startXI" in lineups["home"], "Home lineup should have startXI"
                assert "formation" in lineups["home"], "Home lineup should have formation"
        
        print(f"✓ Lineups data is properly structured")
    
    def test_match_detail_statistics(self):
        """Test that statistics data is properly structured"""
        fixture_id = "12345"
        response = requests.get(f"{BASE_URL}/api/football/match/{fixture_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        statistics = data.get("statistics")
        if statistics:
            assert "home" in statistics, "Statistics should have home team"
            assert "away" in statistics, "Statistics should have away team"
            
            if statistics.get("home"):
                assert isinstance(statistics["home"], list), "Home stats should be a list"
        
        print(f"✓ Statistics data is properly structured")


class TestStoriesReactAPI:
    """Test /api/stories/{id}/react endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_react_to_story_requires_auth(self):
        """Test that reacting to story requires authentication"""
        story_id = "test_story_123"
        response = requests.post(
            f"{BASE_URL}/api/stories/{story_id}/react",
            data={"reaction": "❤️"}
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ React endpoint requires authentication")
    
    def test_react_to_nonexistent_story(self, auth_token):
        """Test reacting to a non-existent story"""
        story_id = "nonexistent_story_12345"
        response = requests.post(
            f"{BASE_URL}/api/stories/{story_id}/react",
            data={"reaction": "❤️"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should return 404 for non-existent story
        assert response.status_code == 404, f"Expected 404 for non-existent story, got {response.status_code}"
        print(f"✓ React endpoint returns 404 for non-existent story")


class TestStoriesReplyAPI:
    """Test /api/stories/{id}/reply endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_reply_to_story_requires_auth(self):
        """Test that replying to story requires authentication"""
        story_id = "test_story_123"
        response = requests.post(
            f"{BASE_URL}/api/stories/{story_id}/reply",
            data={"content": "Test reply"}
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Reply endpoint requires authentication")
    
    def test_reply_to_nonexistent_story(self, auth_token):
        """Test replying to a non-existent story"""
        story_id = "nonexistent_story_12345"
        response = requests.post(
            f"{BASE_URL}/api/stories/{story_id}/reply",
            data={"content": "Test reply content"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should return 404 for non-existent story
        assert response.status_code == 404, f"Expected 404 for non-existent story, got {response.status_code}"
        print(f"✓ Reply endpoint returns 404 for non-existent story")


class TestStoriesRepliesAPI:
    """Test /api/stories/{id}/replies endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_replies_requires_auth(self):
        """Test that getting replies requires authentication"""
        story_id = "test_story_123"
        response = requests.get(f"{BASE_URL}/api/stories/{story_id}/replies")
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Get replies endpoint requires authentication")
    
    def test_get_replies_nonexistent_story(self, auth_token):
        """Test getting replies for a non-existent story"""
        story_id = "nonexistent_story_12345"
        response = requests.get(
            f"{BASE_URL}/api/stories/{story_id}/replies",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should return 404 for non-existent story
        assert response.status_code == 404, f"Expected 404 for non-existent story, got {response.status_code}"
        print(f"✓ Get replies endpoint returns 404 for non-existent story")


class TestAuthAndBasicAPIs:
    """Test basic authentication and API health"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed with status {response.status_code}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user"
        
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_get_football_matches(self):
        """Test football matches endpoint"""
        response = requests.get(f"{BASE_URL}/api/football/matches")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "matches" in data, "Response should contain 'matches' key"
        
        print(f"✓ Football matches endpoint working, returned {len(data.get('matches', []))} matches")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
