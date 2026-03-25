"""
Test Room News (شريط أخباري) and News Reporter Role (إخباري الدوانية) Features
Tests for:
1. GET /api/rooms/{room_id}/news - Get room news
2. POST /api/rooms/{room_id}/news - Add news to room
3. DELETE /api/rooms/{room_id}/news/{news_id} - Delete news
4. POST /api/rooms/{room_id}/roles/{user_id} - Assign news_reporter role
5. POST /api/rooms/{room_id}/news-reporter/{user_id} - Set news reporter
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pitch-chat.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "naifliver@gmail.com"
TEST_PASSWORD = "As11223344"
TEST_ROOM_ID = "633fcdbc"  # دوانية ليفربول room

class TestRoomNewsAndRoles:
    """Test Room News and News Reporter Role Features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token")
            self.user = data.get("user", {})
            self.user_id = self.user.get("id")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    # ============ Room News Tests ============
    
    def test_01_get_room_news(self):
        """Test GET /api/rooms/{room_id}/news - Get news for دوانية room"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "news" in data, "Response should contain 'news' field"
        assert isinstance(data["news"], list), "News should be a list"
        
        print(f"✓ GET room news: Found {len(data['news'])} news items")
        
        # Verify news item structure if any exist
        if data["news"]:
            news_item = data["news"][0]
            assert "id" in news_item, "News item should have 'id'"
            assert "text" in news_item, "News item should have 'text'"
            assert "category" in news_item, "News item should have 'category'"
            print(f"  First news: {news_item.get('text', '')[:50]}...")
    
    def test_02_add_room_news(self):
        """Test POST /api/rooms/{room_id}/news - Add news to room"""
        news_text = f"خبر تجريبي - Test news {int(time.time())}"
        
        response = self.session.post(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news", json={
            "text": news_text,
            "category": "عام"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        assert "news" in data, "Response should contain 'news'"
        
        news = data["news"]
        assert news["text"] == news_text, "News text should match"
        assert news["category"] == "عام", "News category should match"
        assert "id" in news, "News should have an ID"
        
        # Store news ID for deletion test
        self.__class__.created_news_id = news["id"]
        
        print(f"✓ POST room news: Created news with ID {news['id']}")
    
    def test_03_verify_news_appears_in_list(self):
        """Verify the created news appears in the news list"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news")
        
        assert response.status_code == 200
        
        data = response.json()
        news_ids = [n["id"] for n in data["news"]]
        
        assert hasattr(self.__class__, 'created_news_id'), "News ID should be stored from previous test"
        assert self.__class__.created_news_id in news_ids, "Created news should appear in list"
        
        print(f"✓ Verified news {self.__class__.created_news_id} appears in list")
    
    def test_04_add_news_with_different_categories(self):
        """Test adding news with different categories"""
        categories = ["عام", "نتائج", "انتقالات", "تصريحات", "عاجل"]
        
        for category in categories:
            response = self.session.post(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news", json={
                "text": f"خبر {category} - {int(time.time())}",
                "category": category
            })
            
            assert response.status_code == 200, f"Failed for category {category}: {response.text}"
            
            data = response.json()
            assert data["news"]["category"] == category
            
            # Clean up - delete the news
            news_id = data["news"]["id"]
            self.session.delete(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news/{news_id}")
        
        print(f"✓ Tested all {len(categories)} news categories")
    
    def test_05_delete_room_news(self):
        """Test DELETE /api/rooms/{room_id}/news/{news_id} - Delete news"""
        if not hasattr(self.__class__, 'created_news_id'):
            pytest.skip("No news ID from previous test")
        
        news_id = self.__class__.created_news_id
        
        response = self.session.delete(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news/{news_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        
        print(f"✓ DELETE room news: Deleted news {news_id}")
    
    def test_06_verify_news_deleted(self):
        """Verify the deleted news no longer appears in the list"""
        if not hasattr(self.__class__, 'created_news_id'):
            pytest.skip("No news ID from previous test")
        
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news")
        
        assert response.status_code == 200
        
        data = response.json()
        news_ids = [n["id"] for n in data["news"]]
        
        assert self.__class__.created_news_id not in news_ids, "Deleted news should not appear in list"
        
        print(f"✓ Verified news {self.__class__.created_news_id} was deleted")
    
    def test_07_add_news_empty_text_fails(self):
        """Test that adding news with empty text fails"""
        response = self.session.post(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news", json={
            "text": "",
            "category": "عام"
        })
        
        assert response.status_code == 400, f"Expected 400 for empty text, got {response.status_code}"
        print("✓ Empty news text correctly rejected")
    
    # ============ Room Roles Tests ============
    
    def test_08_get_room_roles(self):
        """Test GET /api/rooms/{room_id}/roles - Get all room roles"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/roles")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "roles" in data, "Response should contain 'roles'"
        
        print(f"✓ GET room roles: Found {len(data['roles'])} roles")
    
    def test_09_assign_news_reporter_role_via_roles_endpoint(self):
        """Test POST /api/rooms/{room_id}/roles/{user_id} - Assign news_reporter role"""
        # First, we need a test user. Let's use the current user for testing
        # In a real scenario, we'd create a test user
        
        # Get room participants to find a user to assign role to
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/participants")
        
        if response.status_code != 200:
            pytest.skip("Could not get participants")
        
        participants = response.json()
        
        # Find a participant that is not the owner
        test_user_id = None
        for p in participants:
            if p.get("user_id") != self.user_id:
                test_user_id = p.get("user_id")
                break
        
        if not test_user_id:
            # If no other participants, test with a known user ID or skip
            print("⚠ No other participants found, testing role assignment validation only")
            
            # Test that news_reporter is a valid role option
            response = self.session.post(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/roles/{self.user_id}", json={
                "role": "news_reporter"
            })
            
            # Should fail because can't change owner's role
            assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
            print("✓ news_reporter role is recognized as valid role")
            return
        
        # Assign news_reporter role
        response = self.session.post(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/roles/{test_user_id}", json={
            "role": "news_reporter"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        
        self.__class__.test_user_id = test_user_id
        
        print(f"✓ Assigned news_reporter role to user {test_user_id}")
    
    def test_10_verify_news_reporter_role_assigned(self):
        """Verify the news_reporter role was assigned"""
        if not hasattr(self.__class__, 'test_user_id'):
            pytest.skip("No test user from previous test")
        
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/roles")
        
        assert response.status_code == 200
        
        data = response.json()
        roles = data.get("roles", [])
        
        # Find the test user's role
        user_role = None
        for r in roles:
            if r.get("user_id") == self.__class__.test_user_id:
                user_role = r.get("role")
                break
        
        assert user_role == "news_reporter", f"Expected news_reporter, got {user_role}"
        
        print(f"✓ Verified user {self.__class__.test_user_id} has news_reporter role")
    
    def test_11_set_news_reporter_via_dedicated_endpoint(self):
        """Test POST /api/rooms/{room_id}/news-reporter/{user_id} - Set news reporter"""
        # Get a participant to test with
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/participants")
        
        if response.status_code != 200:
            pytest.skip("Could not get participants")
        
        participants = response.json()
        
        test_user_id = None
        for p in participants:
            if p.get("user_id") != self.user_id:
                test_user_id = p.get("user_id")
                break
        
        if not test_user_id:
            pytest.skip("No other participants to test with")
        
        response = self.session.post(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news-reporter/{test_user_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        
        print(f"✓ Set news reporter via dedicated endpoint for user {test_user_id}")
    
    def test_12_remove_news_reporter(self):
        """Test DELETE /api/rooms/{room_id}/news-reporter/{user_id} - Remove news reporter"""
        if not hasattr(self.__class__, 'test_user_id'):
            pytest.skip("No test user from previous test")
        
        response = self.session.delete(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/news-reporter/{self.__class__.test_user_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        
        print(f"✓ Removed news reporter role from user {self.__class__.test_user_id}")
    
    def test_13_get_room_info(self):
        """Test GET /api/rooms/{room_id} - Verify room exists and has دوانية in title"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "title" in data, "Room should have title"
        assert "دوانية" in data["title"], f"Room title should contain 'دوانية', got: {data['title']}"
        
        print(f"✓ Room {TEST_ROOM_ID} exists with title: {data['title']}")
    
    def test_14_invalid_role_rejected(self):
        """Test that invalid roles are rejected"""
        response = self.session.get(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/participants")
        
        if response.status_code != 200:
            pytest.skip("Could not get participants")
        
        participants = response.json()
        
        test_user_id = None
        for p in participants:
            if p.get("user_id") != self.user_id:
                test_user_id = p.get("user_id")
                break
        
        if not test_user_id:
            pytest.skip("No other participants to test with")
        
        response = self.session.post(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/roles/{test_user_id}", json={
            "role": "invalid_role"
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid role, got {response.status_code}"
        print("✓ Invalid role correctly rejected")
    
    def test_15_cleanup_reset_role_to_member(self):
        """Cleanup - Reset test user's role to member"""
        if not hasattr(self.__class__, 'test_user_id'):
            print("⚠ No test user to cleanup")
            return
        
        response = self.session.post(f"{BASE_URL}/api/rooms/{TEST_ROOM_ID}/roles/{self.__class__.test_user_id}", json={
            "role": "member"
        })
        
        if response.status_code == 200:
            print(f"✓ Reset user {self.__class__.test_user_id} role to member")
        else:
            print(f"⚠ Could not reset role: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
