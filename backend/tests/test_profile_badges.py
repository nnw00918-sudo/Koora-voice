"""
Test Profile Page API - /api/auth/me endpoint
Tests for rooms_joined, rooms_created, badges_earned fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pitch-chat.preview.emergentagent.com')

class TestProfileAPI:
    """Test /api/auth/me endpoint for profile data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "naifliver@gmail.com", "password": "As11223344"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_login_works(self):
        """Test that login works correctly"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "naifliver@gmail.com", "password": "As11223344"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful, user: {data['user'].get('username')}")
    
    def test_auth_me_returns_required_fields(self):
        """Test /api/auth/me returns rooms_joined, rooms_created, badges_earned"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields exist
        assert "rooms_joined" in data, "rooms_joined field missing"
        assert "rooms_created" in data, "rooms_created field missing"
        assert "badges_earned" in data, "badges_earned field missing"
        
        print(f"rooms_joined: {data['rooms_joined']}")
        print(f"rooms_created: {data['rooms_created']}")
        print(f"badges_earned: {data['badges_earned']}")
    
    def test_rooms_joined_is_integer(self):
        """Test rooms_joined is an integer"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        data = response.json()
        assert isinstance(data["rooms_joined"], int), f"rooms_joined should be int, got {type(data['rooms_joined'])}"
    
    def test_rooms_created_is_integer(self):
        """Test rooms_created is an integer"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        data = response.json()
        assert isinstance(data["rooms_created"], int), f"rooms_created should be int, got {type(data['rooms_created'])}"
    
    def test_badges_earned_is_list(self):
        """Test badges_earned is a list"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        data = response.json()
        assert isinstance(data["badges_earned"], list), f"badges_earned should be list, got {type(data['badges_earned'])}"
    
    def test_speaker_badge_always_earned(self):
        """Test that speaker badge is always earned"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        data = response.json()
        assert "speaker" in data["badges_earned"], "speaker badge should always be earned"
    
    def test_room_owner_badge_when_rooms_created(self):
        """Test room_owner badge is earned when user has created rooms"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        data = response.json()
        
        if data["rooms_created"] > 0:
            assert "room_owner" in data["badges_earned"], "room_owner badge should be earned when rooms_created > 0"
            print(f"User has {data['rooms_created']} rooms created, room_owner badge earned")
        else:
            assert "room_owner" not in data["badges_earned"], "room_owner badge should not be earned when rooms_created = 0"
    
    def test_star_badge_when_coins_100_plus(self):
        """Test star badge is earned when user has 100+ coins"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        data = response.json()
        
        if data.get("coins", 0) >= 100:
            assert "star" in data["badges_earned"], "star badge should be earned when coins >= 100"
            print(f"User has {data['coins']} coins, star badge earned")
        else:
            assert "star" not in data["badges_earned"], "star badge should not be earned when coins < 100"
    
    def test_profile_stats_display(self):
        """Test all profile stats are returned correctly"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        data = response.json()
        
        # Check all stats fields
        assert "followers_count" in data, "followers_count missing"
        assert "following_count" in data, "following_count missing"
        assert "coins" in data, "coins missing"
        assert "rooms_joined" in data, "rooms_joined missing"
        
        print(f"Profile stats: followers={data['followers_count']}, following={data['following_count']}, coins={data['coins']}, rooms_joined={data['rooms_joined']}")
    
    def test_expected_badges_for_current_user(self):
        """Test expected badges for current user (followers=3, rooms_created=2, coins=1000)"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        data = response.json()
        
        badges = data["badges_earned"]
        
        # Expected badges based on user data:
        # speaker = always earned
        # room_owner = rooms_created > 0 (2 > 0) = True
        # popular = followers >= 10 (3 >= 10) = False
        # star = coins >= 100 (1000 >= 100) = True
        # verified = followers >= 50 AND rooms_joined >= 5 = False
        # legend = followers >= 100 AND coins >= 1000 AND rooms_joined >= 20 = False
        
        assert "speaker" in badges, "speaker should be earned"
        assert "room_owner" in badges, "room_owner should be earned (rooms_created=2)"
        assert "star" in badges, "star should be earned (coins=1000)"
        
        # These should NOT be earned
        assert "popular" not in badges, "popular should NOT be earned (followers=3 < 10)"
        assert "verified" not in badges, "verified should NOT be earned"
        assert "legend" not in badges, "legend should NOT be earned"
        
        print(f"Badges earned: {badges}")
        print("Badge verification passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
