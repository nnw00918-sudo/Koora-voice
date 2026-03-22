"""
Test Playback Features: Reactions, Polls, Watch Party
Tests for Koora Voice app - iteration 9
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pitch-chat.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "naifliver@gmail.com"
TEST_PASSWORD = "As11223344"
TEST_ROOM_ID = "3977f7ae"


class TestPlaybackFeatures:
    """Test Reactions, Polls, and Watch Party APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.user = login_response.json().get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    # ============ REACTIONS TESTS ============
    
    def test_send_reaction_success(self):
        """Test POST /api/rooms/{room_id}/reactions - Send a reaction"""
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/reactions",
            json={"reaction": "⚽"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "reaction" in data
        assert data["reaction"]["reaction"] == "⚽"
        print(f"✓ Send reaction success: {data['message']}")
    
    def test_send_reaction_fire_emoji(self):
        """Test sending fire emoji reaction"""
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/reactions",
            json={"reaction": "🔥"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["reaction"]["reaction"] == "🔥"
        print("✓ Fire emoji reaction sent successfully")
    
    def test_send_reaction_heart_emoji(self):
        """Test sending heart emoji reaction"""
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/reactions",
            json={"reaction": "❤️"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["reaction"]["reaction"] == "❤️"
        print("✓ Heart emoji reaction sent successfully")
    
    def test_get_reactions_polling(self):
        """Test GET /api/rooms/{room_id}/reactions - Get recent reactions"""
        # First send a reaction
        self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/reactions",
            json={"reaction": "👏"}
        )
        
        # Then poll for reactions
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/reactions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "reactions" in data
        assert isinstance(data["reactions"], list)
        print(f"✓ Get reactions success: {len(data['reactions'])} reactions found")
    
    def test_reactions_invalid_room(self):
        """Test reactions on non-existent room"""
        response = self.session.post(
            f"{BASE_URL}/api/rooms/invalid_room_id/reactions",
            json={"reaction": "⚽"}
        )
        
        assert response.status_code == 404
        print("✓ Invalid room returns 404 as expected")
    
    # ============ POLLS TESTS ============
    
    def test_create_poll_success(self):
        """Test POST /api/rooms/{room_id}/polls - Create a poll"""
        poll_data = {
            "question": "من سيفوز بالمباراة؟",
            "options": ["الهلال", "النصر", "تعادل"],
            "duration_minutes": 5
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls",
            json=poll_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "poll" in data
        assert data["poll"]["question"] == poll_data["question"]
        assert len(data["poll"]["options"]) == 3
        assert data["poll"]["is_active"] == True
        
        # Store poll_id for later tests
        self.__class__.created_poll_id = data["poll"]["id"]
        print(f"✓ Create poll success: {data['message']}")
        return data["poll"]["id"]
    
    def test_get_active_poll(self):
        """Test GET /api/rooms/{room_id}/polls/active - Get active poll"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls/active")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "poll" in data
        # Poll may or may not exist
        if data["poll"]:
            assert "question" in data["poll"]
            assert "options" in data["poll"]
            print(f"✓ Active poll found: {data['poll']['question']}")
        else:
            print("✓ No active poll (expected if none created)")
    
    def test_vote_on_poll(self):
        """Test POST /api/rooms/{room_id}/polls/{poll_id}/vote - Vote on poll"""
        # First create a poll
        poll_data = {
            "question": "اختبار التصويت",
            "options": ["خيار 1", "خيار 2"],
            "duration_minutes": 5
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls",
            json=poll_data
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create poll for voting test")
        
        poll_id = create_response.json()["poll"]["id"]
        option_id = create_response.json()["poll"]["options"][0]["id"]
        
        # Vote on the poll
        vote_response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls/{poll_id}/vote",
            json={"option_id": option_id}
        )
        
        assert vote_response.status_code == 200, f"Expected 200, got {vote_response.status_code}: {vote_response.text}"
        data = vote_response.json()
        assert "message" in data
        assert "poll" in data
        assert data["poll"]["total_votes"] >= 1
        print(f"✓ Vote success: {data['message']}")
    
    def test_vote_twice_fails(self):
        """Test that voting twice on same poll fails"""
        # Create a new poll
        poll_data = {
            "question": "اختبار التصويت المزدوج",
            "options": ["نعم", "لا"],
            "duration_minutes": 5
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls",
            json=poll_data
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create poll")
        
        poll_id = create_response.json()["poll"]["id"]
        option_id = create_response.json()["poll"]["options"][0]["id"]
        
        # First vote
        self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls/{poll_id}/vote",
            json={"option_id": option_id}
        )
        
        # Second vote should fail
        second_vote = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls/{poll_id}/vote",
            json={"option_id": option_id}
        )
        
        assert second_vote.status_code == 400
        print("✓ Double voting correctly rejected")
    
    def test_close_poll(self):
        """Test DELETE /api/rooms/{room_id}/polls/{poll_id} - Close poll"""
        # Create a poll first
        poll_data = {
            "question": "استطلاع للإغلاق",
            "options": ["أ", "ب"],
            "duration_minutes": 5
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls",
            json=poll_data
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create poll")
        
        poll_id = create_response.json()["poll"]["id"]
        
        # Close the poll
        close_response = self.session.delete(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls/{poll_id}"
        )
        
        assert close_response.status_code == 200, f"Expected 200, got {close_response.status_code}: {close_response.text}"
        data = close_response.json()
        assert "message" in data
        print(f"✓ Close poll success: {data['message']}")
    
    # ============ WATCH PARTY TESTS ============
    
    def test_start_watch_party(self):
        """Test POST /api/rooms/{room_id}/watch-party - Start watch party"""
        watch_party_data = {
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "title": "اختبار Watch Party"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party",
            json=watch_party_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "watch_party" in data
        assert data["watch_party"]["video_url"] == watch_party_data["video_url"]
        assert data["watch_party"]["title"] == watch_party_data["title"]
        assert data["watch_party"]["is_playing"] == True
        print(f"✓ Start watch party success: {data['message']}")
    
    def test_get_watch_party(self):
        """Test GET /api/rooms/{room_id}/watch-party - Get watch party state"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "watch_party" in data
        # Watch party may or may not exist
        if data["watch_party"]:
            assert "video_url" in data["watch_party"]
            assert "host_name" in data["watch_party"]
            print(f"✓ Watch party found: {data['watch_party'].get('title', 'No title')}")
        else:
            print("✓ No active watch party")
    
    def test_sync_watch_party(self):
        """Test PUT /api/rooms/{room_id}/watch-party/sync - Sync playback"""
        # First start a watch party
        self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party",
            json={
                "video_url": "https://www.youtube.com/watch?v=test123",
                "title": "Sync Test"
            }
        )
        
        # Sync playback
        sync_data = {
            "current_time": 30.5,
            "is_playing": True
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party/sync",
            json=sync_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert data["current_time"] == 30.5
        assert data["is_playing"] == True
        print(f"✓ Sync watch party success: {data['message']}")
    
    def test_sync_watch_party_pause(self):
        """Test syncing watch party with pause state"""
        sync_data = {
            "current_time": 45.0,
            "is_playing": False
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party/sync",
            json=sync_data
        )
        
        # May return 404 if no watch party exists
        if response.status_code == 200:
            data = response.json()
            assert data["is_playing"] == False
            print("✓ Watch party paused successfully")
        elif response.status_code == 404:
            print("✓ No watch party to sync (expected)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_end_watch_party(self):
        """Test DELETE /api/rooms/{room_id}/watch-party - End watch party"""
        # First start a watch party
        self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party",
            json={
                "video_url": "https://www.youtube.com/watch?v=end_test",
                "title": "End Test"
            }
        )
        
        # End the watch party
        response = self.session.delete(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ End watch party success: {data['message']}")
        
        # Verify it's ended - GET returns 200 with null watch_party or 404
        get_response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party")
        if get_response.status_code == 200:
            assert get_response.json()["watch_party"] is None
            print("✓ Watch party confirmed ended (null)")
        elif get_response.status_code == 404:
            print("✓ Watch party confirmed ended (404)")
        else:
            pytest.fail(f"Unexpected status: {get_response.status_code}")
    
    # ============ ROOM VERIFICATION ============
    
    def test_room_exists(self):
        """Verify test room exists"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}")
        
        assert response.status_code == 200, f"Room {TEST_ROOM_ID} not found: {response.status_code}"
        data = response.json()
        assert "id" in data
        assert data["id"] == TEST_ROOM_ID
        print(f"✓ Room verified: {data.get('title', 'No title')}")


class TestPlaybackFeaturesUnauthorized:
    """Test unauthorized access to playback features"""
    
    def test_reactions_without_auth(self):
        """Test sending reaction without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/reactions",
            json={"reaction": "⚽"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [401, 403]
        print("✓ Reactions require authentication")
    
    def test_create_poll_without_auth(self):
        """Test creating poll without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls",
            json={
                "question": "Test?",
                "options": ["A", "B"],
                "duration_minutes": 5
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [401, 403]
        print("✓ Poll creation requires authentication")
    
    def test_start_watch_party_without_auth(self):
        """Test starting watch party without authentication"""
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party",
            json={
                "video_url": "https://youtube.com/watch?v=test",
                "title": "Test"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code in [401, 403]
        print("✓ Watch party requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
