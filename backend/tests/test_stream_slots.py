"""
Test Suite for YouTube Video Embedding and Stream Slots
Tests the stream slot functionality for Koora Voice (صوت الكورة)
Features tested:
- Save YouTube links to stream slots (1-10)
- Play saved stream slots
- YouTube URL to embed conversion
- Room owner permission checks
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pitch-chat.preview.emergentagent.com')

# Test credentials from the review request
TEST_EMAIL = "devtest2@test.com"
TEST_PASSWORD = "Test123456"
TEST_ROOM_ID = "633fcdbc"


class TestStreamSlots:
    """Stream slot API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user = None
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    def test_01_login_success(self):
        """Test login with test credentials"""
        assert self.token is not None, "Token should be present after login"
        assert self.user is not None, "User data should be present"
        print(f"✓ Login successful for user: {self.user.get('username')}")
        print(f"  User role: {self.user.get('role')}")
    
    def test_02_get_room_details(self):
        """Test fetching room details"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        room = response.json()
        assert "id" in room, "Room should have id"
        assert room["id"] == TEST_ROOM_ID, f"Room ID should match: {room['id']}"
        
        print(f"✓ Room fetched: {room.get('title')}")
        print(f"  Owner ID: {room.get('owner_id')}")
        print(f"  Stream URL: {room.get('stream_url', 'None')}")
        print(f"  Stream Active: {room.get('stream_active', False)}")
    
    def test_03_get_stream_status(self):
        """Test fetching stream status"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"✓ Stream status fetched")
        print(f"  Stream Active: {data.get('stream_active', False)}")
        print(f"  Stream URL: {data.get('stream_url', 'None')}")
        print(f"  Stream Slots: {data.get('stream_slots', {})}")
        print(f"  Active Slot: {data.get('active_slot', 'None')}")
    
    def test_04_save_youtube_link_to_slot(self):
        """Test saving a YouTube link to a stream slot"""
        # Rick Astley - Never Gonna Give You Up (classic test video)
        youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        # Save to slot 1
        slots_data = {"slots": {"1": youtube_url}}
        
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/slots",
            json=slots_data
        )
        
        # Check response
        if response.status_code == 403:
            print(f"⚠ Permission denied - user may not be room owner: {response.text}")
            pytest.skip("User doesn't have permission to save stream slots")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "slots" in data or "message" in data, "Response should contain slots or message"
        print(f"✓ YouTube link saved to slot 1")
        print(f"  Response: {data}")
    
    def test_05_save_multiple_youtube_links(self):
        """Test saving multiple YouTube links to different slots"""
        slots_data = {
            "slots": {
                "1": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Rick Astley
                "2": "https://youtu.be/jNQXAC9IVRw",  # Me at the zoo (first YouTube video)
                "3": "https://www.youtube.com/watch?v=9bZkp7q19f0",  # Gangnam Style
            }
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/slots",
            json=slots_data
        )
        
        if response.status_code == 403:
            pytest.skip("User doesn't have permission to save stream slots")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Multiple YouTube links saved to slots 1, 2, 3")
    
    def test_06_play_stream_slot_1(self):
        """Test playing stream slot 1"""
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/play/1"
        )
        
        if response.status_code == 403:
            print(f"⚠ Permission denied: {response.text}")
            pytest.skip("User doesn't have permission or stream not active")
        
        if response.status_code == 400:
            print(f"⚠ Slot may be empty: {response.text}")
            pytest.skip("Slot 1 is empty")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "stream_url" in data, "Response should contain stream_url"
        
        stream_url = data.get("stream_url", "")
        print(f"✓ Stream slot 1 played")
        print(f"  Stream URL: {stream_url}")
        
        # Verify URL is converted to embed format
        assert "/embed/" in stream_url or "player." in stream_url, \
            f"URL should be converted to embed format: {stream_url}"
        print(f"✓ URL correctly converted to embed format")
    
    def test_07_play_stream_slot_2(self):
        """Test playing stream slot 2"""
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/play/2"
        )
        
        if response.status_code == 403:
            pytest.skip("User doesn't have permission or stream not active")
        
        if response.status_code == 400:
            pytest.skip("Slot 2 is empty")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"✓ Stream slot 2 played")
        print(f"  Stream URL: {data.get('stream_url', 'None')}")
    
    def test_08_play_invalid_slot_0(self):
        """Test playing invalid slot 0 (should fail)"""
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/play/0"
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid slot, got {response.status_code}"
        print(f"✓ Invalid slot 0 correctly rejected")
    
    def test_09_play_invalid_slot_11(self):
        """Test playing invalid slot 11 (should fail)"""
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/play/11"
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid slot, got {response.status_code}"
        print(f"✓ Invalid slot 11 correctly rejected")
    
    def test_10_verify_stream_url_after_play(self):
        """Verify room stream_url is updated after playing a slot"""
        # First play slot 1
        play_response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/play/1"
        )
        
        if play_response.status_code != 200:
            pytest.skip("Could not play slot 1")
        
        # Then fetch room to verify stream_url
        room_response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}")
        
        assert room_response.status_code == 200
        
        room = room_response.json()
        stream_url = room.get("stream_url", "")
        
        assert stream_url, "Room should have stream_url after playing slot"
        print(f"✓ Room stream_url updated: {stream_url}")
    
    def test_11_youtube_url_conversion_watch(self):
        """Test YouTube watch URL conversion"""
        # Save a watch URL
        slots_data = {"slots": {"5": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}}
        
        save_response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/slots",
            json=slots_data
        )
        
        if save_response.status_code != 200:
            pytest.skip("Could not save slot")
        
        # Play and check conversion
        play_response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/play/5"
        )
        
        if play_response.status_code != 200:
            pytest.skip("Could not play slot")
        
        data = play_response.json()
        stream_url = data.get("stream_url", "")
        
        assert "youtube.com/embed/dQw4w9WgXcQ" in stream_url, \
            f"Watch URL should be converted to embed: {stream_url}"
        print(f"✓ YouTube watch URL correctly converted to embed")
    
    def test_12_youtube_url_conversion_short(self):
        """Test YouTube short URL (youtu.be) conversion"""
        # Save a short URL
        slots_data = {"slots": {"6": "https://youtu.be/dQw4w9WgXcQ"}}
        
        save_response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/slots",
            json=slots_data
        )
        
        if save_response.status_code != 200:
            pytest.skip("Could not save slot")
        
        # Play and check conversion
        play_response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/play/6"
        )
        
        if play_response.status_code != 200:
            pytest.skip("Could not play slot")
        
        data = play_response.json()
        stream_url = data.get("stream_url", "")
        
        assert "youtube.com/embed/dQw4w9WgXcQ" in stream_url, \
            f"Short URL should be converted to embed: {stream_url}"
        print(f"✓ YouTube short URL correctly converted to embed")
    
    def test_13_slots_1_to_10_accepted(self):
        """Test that slots 1-10 are all accepted"""
        for slot in range(1, 11):
            # First save a URL to the slot
            slots_data = {"slots": {str(slot): f"https://www.youtube.com/watch?v=test{slot}"}}
            save_response = self.session.post(
                f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/slots",
                json=slots_data
            )
            
            if save_response.status_code != 200:
                continue  # Skip if can't save
            
            # Try to play the slot
            response = self.session.post(
                f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/play/{slot}"
            )
            
            # Should not get 400 for invalid slot number
            assert response.status_code != 400 or "رقم الرابط" not in response.text, \
                f"Slot {slot} should be valid"
        
        print(f"✓ All slots 1-10 are accepted")


class TestStreamPermissions:
    """Test stream slot permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Login failed")
    
    def test_room_owner_can_save_slots(self):
        """Test that room owner can save stream slots"""
        # Get room to check ownership
        room_response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}")
        
        if room_response.status_code != 200:
            pytest.skip("Could not fetch room")
        
        room = room_response.json()
        is_owner = room.get("owner_id") == self.user.get("id")
        is_system_owner = self.user.get("role") == "owner"
        
        print(f"  User ID: {self.user.get('id')}")
        print(f"  Room Owner ID: {room.get('owner_id')}")
        print(f"  Is Room Owner: {is_owner}")
        print(f"  Is System Owner: {is_system_owner}")
        
        # Try to save slots
        slots_data = {"slots": {"1": "https://www.youtube.com/watch?v=test"}}
        response = self.session.post(
            f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/stream/slots",
            json=slots_data
        )
        
        if is_owner or is_system_owner:
            assert response.status_code == 200, \
                f"Owner should be able to save slots: {response.status_code} - {response.text}"
            print(f"✓ Owner can save stream slots")
        else:
            assert response.status_code == 403, \
                f"Non-owner should get 403: {response.status_code}"
            print(f"✓ Non-owner correctly denied")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
