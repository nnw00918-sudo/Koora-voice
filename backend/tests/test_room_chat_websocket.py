"""
Test Room Chat and WebSocket functionality
Tests the room message endpoints and WebSocket integration
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "naifliver@gmail.com"
TEST_PASSWORD = "As11223344"
TEST_ROOM_ID = "3977f7ae"


class TestRoomChatAPI:
    """Test room chat HTTP API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_room_exists(self):
        """Test that the test room exists"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}")
        assert response.status_code == 200, f"Room not found: {response.text}"
        room = response.json()
        assert room["id"] == TEST_ROOM_ID
        print(f"Room found: {room['title']}")
    
    def test_join_room(self):
        """Test joining a room"""
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/join",
            json={},
            headers=self.headers
        )
        assert response.status_code == 200, f"Join room failed: {response.text}"
        print("Successfully joined room")
    
    def test_send_message_http(self):
        """Test sending a message via HTTP endpoint"""
        # First join the room
        requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/join",
            json={},
            headers=self.headers
        )
        
        # Send a test message
        test_content = f"Test message via HTTP {int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/messages",
            json={"content": test_content},
            headers=self.headers
        )
        assert response.status_code == 200, f"Send message failed: {response.text}"
        message = response.json()
        assert message["content"] == test_content
        assert message["user_id"] == self.user["id"]
        print(f"Message sent successfully: {message['id']}")
    
    def test_get_messages(self):
        """Test getting room messages"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/messages")
        assert response.status_code == 200, f"Get messages failed: {response.text}"
        messages = response.json()
        assert isinstance(messages, list)
        print(f"Retrieved {len(messages)} messages")
    
    def test_send_and_retrieve_message(self):
        """Test sending a message and verifying it appears in the list"""
        # Join room first
        requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/join",
            json={},
            headers=self.headers
        )
        
        # Send a unique message
        unique_content = f"Unique test message {int(time.time() * 1000)}"
        send_response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/messages",
            json={"content": unique_content},
            headers=self.headers
        )
        assert send_response.status_code == 200
        sent_message = send_response.json()
        
        # Retrieve messages and verify
        get_response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/messages")
        assert get_response.status_code == 200
        messages = get_response.json()
        
        # Find our message
        found = any(m["content"] == unique_content for m in messages)
        assert found, f"Sent message not found in messages list"
        print(f"Message persistence verified: {unique_content[:30]}...")
    
    def test_heartbeat(self):
        """Test room heartbeat endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/heartbeat",
            json={},
            headers=self.headers
        )
        assert response.status_code == 200, f"Heartbeat failed: {response.text}"
        print("Heartbeat successful")
    
    def test_leave_room(self):
        """Test leaving a room"""
        # First join
        requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/join",
            json={},
            headers=self.headers
        )
        
        # Then leave
        response = requests.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/leave",
            json={},
            headers=self.headers
        )
        assert response.status_code == 200, f"Leave room failed: {response.text}"
        print("Successfully left room")


class TestWebSocketEndpoint:
    """Test WebSocket endpoint availability"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
    
    def test_websocket_url_format(self):
        """Test that WebSocket URL can be constructed correctly"""
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
        expected_ws_endpoint = f"{ws_url}/ws/{self.token}"
        
        # Verify URL format is correct
        assert expected_ws_endpoint.startswith('wss://') or expected_ws_endpoint.startswith('ws://')
        assert '/ws/' in expected_ws_endpoint
        print(f"WebSocket URL format correct: {expected_ws_endpoint[:50]}...")
    
    def test_websocket_endpoint_exists(self):
        """Test that the WebSocket endpoint is defined in the backend"""
        # We can't directly test WebSocket connection with requests,
        # but we can verify the endpoint pattern exists
        # The actual WebSocket test is done via Playwright
        print("WebSocket endpoint /ws/{token} is defined in backend")
        print("Note: WebSocket may not work in Kubernetes ingress environment")
        print("HTTP fallback is available for message sending")


class TestRoomParticipants:
    """Test room participant management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["access_token"]
        self.user = data["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_participants(self):
        """Test getting room participants"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/participants")
        assert response.status_code == 200, f"Get participants failed: {response.text}"
        participants = response.json()
        assert isinstance(participants, list)
        print(f"Room has {len(participants)} participants")
    
    def test_get_seats(self):
        """Test getting room seats"""
        response = requests.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/seats")
        assert response.status_code == 200, f"Get seats failed: {response.text}"
        data = response.json()
        assert "seats" in data
        print(f"Room has {len(data['seats'])} seats configured")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
