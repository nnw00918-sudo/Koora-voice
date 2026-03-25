"""
Comprehensive test suite for Room Features:
- Watch Party (4 channels)
- Stream (4 slots)
- Reactions
- Room Chat
- Room UI components
- Login flow
- Room join/leave
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pitch-chat.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "naifliver@gmail.com"
TEST_PASSWORD = "As11223344"
TEST_ROOM_ID = "3977f7ae"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")


class TestRoomBasics:
    """Room basic operations tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_room_exists(self, auth_token):
        """Test that test room exists"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TEST_ROOM_ID
        print(f"✓ Room {TEST_ROOM_ID} exists: {data['title']}")
    
    def test_join_room(self, auth_token):
        """Test joining a room"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/join",
            json={},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Successfully joined room")
    
    def test_get_participants(self, auth_token):
        """Test getting room participants"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/participants")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} participants")
    
    def test_get_seats(self, auth_token):
        """Test getting room seats"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/seats")
        assert response.status_code == 200
        data = response.json()
        assert "seats" in data
        print(f"✓ Got {len(data['seats'])} seats")
    
    def test_leave_room(self, auth_token):
        """Test leaving a room"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/leave",
            json={},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Successfully left room")


class TestRoomChat:
    """Room chat tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_send_message(self, auth_token):
        """Test sending a message"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First join the room
        requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/join",
            json={},
            headers=headers
        )
        
        # Send message
        test_message = f"Test message {int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/messages",
            json={"content": test_message},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Message sent: {test_message}")
    
    def test_get_messages(self, auth_token):
        """Test getting room messages"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/messages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} messages")


class TestReactions:
    """Reactions feature tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_send_reaction(self, auth_token):
        """Test sending a reaction"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Send reaction - API uses 'reaction' field
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/reactions",
            json={"reaction": "⚽"},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Reaction sent successfully")
    
    def test_get_reactions(self, auth_token):
        """Test getting reactions"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/reactions")
        assert response.status_code == 200
        data = response.json()
        assert "reactions" in data
        print(f"✓ Got {len(data['reactions'])} reactions")


class TestWatchParty:
    """Watch Party feature tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_watch_party(self, auth_token):
        """Test getting watch party status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party",
            headers=headers
        )
        # Can be 200 (active) or 404 (no active watch party)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            if data.get("watch_party"):
                print(f"✓ Active watch party found with {len(data['watch_party'].get('channels', []))} channels")
            else:
                print("✓ No active watch party")
        else:
            print("✓ No active watch party (404)")
    
    def test_start_watch_party(self, auth_token):
        """Test starting a watch party with 4 channels"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Start watch party with 4 channels
        watch_party_data = {
            "video_url": "https://www.youtube.com/watch?v=jfKfPfyJRdk",
            "title": "Test Watch Party",
            "channels": [
                {"id": 1, "url": "https://www.youtube.com/watch?v=jfKfPfyJRdk", "name": "قناة 1"},
                {"id": 2, "url": "https://www.youtube.com/watch?v=5qap5aO4i9A", "name": "قناة 2"},
                {"id": 3, "url": "https://www.youtube.com/watch?v=DWcJFNfaw9c", "name": "قناة 3"},
                {"id": 4, "url": "https://www.youtube.com/watch?v=hHW1oY26kxQ", "name": "قناة 4"}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/watch-party",
            json=watch_party_data,
            headers=headers
        )
        
        # Owner can start watch party
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Watch party started successfully")
            assert "watch_party" in data or "message" in data
        else:
            print(f"Watch party start response: {response.status_code} - {response.text}")
            # May fail if not owner or already active
            assert response.status_code in [200, 400, 403]


class TestStream:
    """Stream feature tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_stream_status(self, auth_token):
        """Test getting stream status"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream")
        assert response.status_code == 200
        data = response.json()
        assert "stream_active" in data
        assert "stream_slots" in data
        print(f"✓ Stream active: {data['stream_active']}, Slots: {len(data.get('stream_slots', {}))}")
    
    def test_update_stream_slots(self, auth_token):
        """Test updating stream slots (4 slots)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Update 4 stream slots
        slots_data = {
            "slots": {
                "1": "https://www.youtube.com/watch?v=jfKfPfyJRdk",
                "2": "https://www.youtube.com/watch?v=5qap5aO4i9A",
                "3": "https://www.youtube.com/watch?v=DWcJFNfaw9c",
                "4": "https://www.youtube.com/watch?v=hHW1oY26kxQ"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/slots",
            json=slots_data,
            headers=headers
        )
        
        if response.status_code == 200:
            print("✓ Stream slots updated successfully with 4 channels")
        else:
            print(f"Stream slots update: {response.status_code}")
            # May fail if not owner
            assert response.status_code in [200, 403]
    
    def test_play_stream_slot(self, auth_token):
        """Test playing a stream slot"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/play/1",
            json={},
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Stream slot 1 playing: {data.get('stream_url', 'N/A')[:50]}...")
        else:
            print(f"Stream play response: {response.status_code}")
            # May fail if slot not configured
            assert response.status_code in [200, 400, 403, 404]


class TestPolls:
    """Polls feature tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_active_poll(self, auth_token):
        """Test getting active poll"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls/active",
            headers=headers
        )
        # Can be 200 (active poll) or 404 (no active poll)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            if data.get("poll"):
                print(f"✓ Active poll found: {data['poll'].get('question', 'N/A')}")
            else:
                print("✓ No active poll")
        else:
            print("✓ No active poll (404)")
    
    def test_create_poll(self, auth_token):
        """Test creating a poll"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        poll_data = {
            "question": "من سيفوز بالمباراة؟",
            "options": ["الفريق الأول", "الفريق الثاني", "تعادل"],
            "duration_minutes": 5
        }
        
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/polls",
            json=poll_data,
            headers=headers
        )
        
        if response.status_code == 200:
            print("✓ Poll created successfully")
        else:
            print(f"Poll creation response: {response.status_code}")
            # May fail if not owner or poll already active
            assert response.status_code in [200, 400, 403]


class TestHeartbeat:
    """Heartbeat tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_heartbeat(self, auth_token):
        """Test room heartbeat"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First join the room
        requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/join",
            json={},
            headers=headers
        )
        
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/heartbeat",
            json={},
            headers=headers
        )
        assert response.status_code == 200
        print("✓ Heartbeat sent successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
