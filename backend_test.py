import requests
import sys
import json
from datetime import datetime

class KoraVerseAPITester:
    def __init__(self, base_url="https://pitch-chat.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user = {
            'email': f'test_user_{datetime.now().strftime("%H%M%S")}@test.com',
            'password': 'TestPass123!',
            'username': f'test_user_{datetime.now().strftime("%H%M%S")}'
        }

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED {details}")
        else:
            print(f"❌ {name}: FAILED {details}")

    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request"""
        url = f"{self.api_url}{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            request_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error: {str(e)}")
            return None

    def test_user_registration(self):
        """Test user registration"""
        print(f"\n🔍 Testing User Registration...")
        
        response = self.make_request('POST', '/auth/register', self.test_user)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'user' in data:
                self.token = data['access_token']
                self.user_id = data['user']['id']
                self.log_test("User Registration", True, f"- Token received, User ID: {self.user_id}")
                return True
            else:
                self.log_test("User Registration", False, "- Missing token or user in response")
                return False
        else:
            status = response.status_code if response else "No response"
            error = response.json().get('detail', 'Unknown error') if response else "Connection error"
            self.log_test("User Registration", False, f"- Status: {status}, Error: {error}")
            return False

    def test_user_login(self):
        """Test user login"""
        print(f"\n🔍 Testing User Login...")
        
        login_data = {
            'email': self.test_user['email'],
            'password': self.test_user['password']
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'user' in data:
                self.log_test("User Login", True, f"- Login successful")
                return True
            else:
                self.log_test("User Login", False, "- Missing token or user in response")
                return False
        else:
            status = response.status_code if response else "No response"
            error = response.json().get('detail', 'Unknown error') if response else "Connection error"
            self.log_test("User Login", False, f"- Status: {status}, Error: {error}")
            return False

    def test_get_rooms(self):
        """Test getting all rooms"""
        print(f"\n🔍 Testing Get Rooms...")
        
        response = self.make_request('GET', '/rooms')
        
        if response and response.status_code == 200:
            rooms = response.json()
            if isinstance(rooms, list) and len(rooms) == 6:
                room_ids = [r['id'] for r in rooms]
                expected_rooms = ['general', 'fantasy', 'games', 'analysis', 'podcast', 'transfers']
                if all(room_id in expected_rooms for room_id in room_ids):
                    self.log_test("Get Rooms", True, f"- Found {len(rooms)} rooms as expected")
                    return rooms
                else:
                    self.log_test("Get Rooms", False, f"- Incorrect room IDs: {room_ids}")
                    return None
            else:
                self.log_test("Get Rooms", False, f"- Expected 6 rooms, got {len(rooms) if isinstance(rooms, list) else 'invalid format'}")
                return None
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get Rooms", False, f"- Status: {status}")
            return None

    def test_room_operations(self, room_id="general"):
        """Test room joining, getting info, and leaving"""
        print(f"\n🔍 Testing Room Operations for '{room_id}'...")
        
        # Test get single room
        response = self.make_request('GET', f'/rooms/{room_id}')
        if response and response.status_code == 200:
            room_data = response.json()
            self.log_test("Get Single Room", True, f"- Room '{room_data['name']}' retrieved")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get Single Room", False, f"- Status: {status}")
            return False

        # Test join room
        response = self.make_request('POST', f'/rooms/{room_id}/join')
        if response and response.status_code == 200:
            self.log_test("Join Room", True, f"- Joined room '{room_id}'")
        else:
            status = response.status_code if response else "No response"
            error = response.json().get('detail', 'Unknown error') if response else "Connection error"
            self.log_test("Join Room", False, f"- Status: {status}, Error: {error}")
            return False

        # Test get participants
        response = self.make_request('GET', f'/rooms/{room_id}/participants')
        if response and response.status_code == 200:
            participants = response.json()
            user_in_participants = any(p['user_id'] == self.user_id for p in participants)
            if user_in_participants:
                self.log_test("Get Room Participants", True, f"- Found {len(participants)} participants, user is in room")
            else:
                self.log_test("Get Room Participants", False, f"- User not found in participants list")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get Room Participants", False, f"- Status: {status}")
            return False

        # Test leave room
        response = self.make_request('POST', f'/rooms/{room_id}/leave')
        if response and response.status_code == 200:
            self.log_test("Leave Room", True, f"- Left room '{room_id}'")
        else:
            status = response.status_code if response else "No response"
            self.log_test("Leave Room", False, f"- Status: {status}")
            return False

        return True

    def test_messaging(self, room_id="general"):
        """Test chat messaging in rooms"""
        print(f"\n🔍 Testing Chat Messaging in '{room_id}'...")
        
        # Join room first
        self.make_request('POST', f'/rooms/{room_id}/join')
        
        # Send a message
        message_data = {'content': f'Test message from {self.test_user["username"]} at {datetime.now().isoformat()}'}
        response = self.make_request('POST', f'/rooms/{room_id}/messages', message_data)
        
        if response and response.status_code == 200:
            message = response.json()
            if message.get('content') == message_data['content'] and message.get('user_id') == self.user_id:
                self.log_test("Send Message", True, f"- Message sent successfully")
                message_id = message.get('id')
            else:
                self.log_test("Send Message", False, f"- Message content or user_id mismatch")
                return False
        else:
            status = response.status_code if response else "No response"
            error = response.json().get('detail', 'Unknown error') if response else "Connection error"
            self.log_test("Send Message", False, f"- Status: {status}, Error: {error}")
            return False

        # Get room messages
        response = self.make_request('GET', f'/rooms/{room_id}/messages')
        if response and response.status_code == 200:
            messages = response.json()
            if isinstance(messages, list):
                # Find our test message
                our_message = next((m for m in messages if m.get('id') == message_id), None)
                if our_message:
                    self.log_test("Get Room Messages", True, f"- Retrieved {len(messages)} messages, found our message")
                else:
                    self.log_test("Get Room Messages", False, f"- Our message not found in {len(messages)} messages")
                    return False
            else:
                self.log_test("Get Room Messages", False, f"- Invalid messages format")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get Room Messages", False, f"- Status: {status}")
            return False

        return True

    def test_user_management(self):
        """Test user-related endpoints"""
        print(f"\n🔍 Testing User Management...")
        
        # Test get current user profile
        response = self.make_request('GET', '/users/me')
        if response and response.status_code == 200:
            user_profile = response.json()
            if user_profile.get('id') == self.user_id:
                self.log_test("Get Current User Profile", True, f"- Profile retrieved for {user_profile.get('username')}")
            else:
                self.log_test("Get Current User Profile", False, f"- User ID mismatch")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get Current User Profile", False, f"- Status: {status}")
            return False

        # Test get all users
        response = self.make_request('GET', '/users')
        if response and response.status_code == 200:
            users = response.json()
            if isinstance(users, list):
                self.log_test("Get All Users", True, f"- Retrieved {len(users)} users")
                return users
            else:
                self.log_test("Get All Users", False, f"- Invalid users format")
                return False
        else:
            status = response.status_code if response else "No response"
            self.log_test("Get All Users", False, f"- Status: {status}")
            return False

    def test_follow_system(self):
        """Test user follow/unfollow system"""
        print(f"\n🔍 Testing Follow System...")
        
        # First get list of users to follow
        users_response = self.make_request('GET', '/users')
        if not users_response or users_response.status_code != 200:
            self.log_test("Follow System - Get Users", False, "- Cannot get users list")
            return False

        users = users_response.json()
        target_user = None
        
        # Find a user that is not ourselves
        for user in users:
            if user.get('id') != self.user_id:
                target_user = user
                break
        
        if not target_user:
            # Create another test user to follow
            another_user = {
                'email': f'follow_test_{datetime.now().strftime("%H%M%S")}@test.com',
                'password': 'TestPass123!',
                'username': f'follow_test_{datetime.now().strftime("%H%M%S")}'
            }
            
            response = self.make_request('POST', '/auth/register', another_user)
            if response and response.status_code == 200:
                target_user = response.json()['user']
                self.log_test("Create Target User for Follow", True, f"- Created user {target_user['username']}")
            else:
                self.log_test("Follow System", False, "- Cannot create target user")
                return False

        target_user_id = target_user['id']

        # Test follow user
        response = self.make_request('POST', f'/users/{target_user_id}/follow')
        if response and response.status_code == 200:
            self.log_test("Follow User", True, f"- Followed user {target_user['username']}")
        else:
            status = response.status_code if response else "No response"
            error = response.json().get('detail', 'Unknown error') if response else "Connection error"
            self.log_test("Follow User", False, f"- Status: {status}, Error: {error}")
            return False

        # Test unfollow user
        response = self.make_request('DELETE', f'/users/{target_user_id}/follow')
        if response and response.status_code == 200:
            self.log_test("Unfollow User", True, f"- Unfollowed user {target_user['username']}")
        else:
            status = response.status_code if response else "No response"
            error = response.json().get('detail', 'Unknown error') if response else "Connection error"
            self.log_test("Unfollow User", False, f"- Status: {status}, Error: {error}")
            return False

        return True

    def run_all_tests(self):
        """Run complete backend API test suite"""
        print("🚀 Starting KoraVerse Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Authentication Tests
        if not self.test_user_registration():
            print("\n❌ Registration failed - stopping tests")
            return False

        if not self.test_user_login():
            print("\n❌ Login failed - stopping tests")
            return False

        # Room Tests
        rooms = self.test_get_rooms()
        if not rooms:
            print("\n❌ Room retrieval failed - stopping tests")
            return False

        if not self.test_room_operations("general"):
            print("\n❌ Room operations failed - continuing with other tests")

        # Messaging Tests
        if not self.test_messaging("general"):
            print("\n❌ Messaging failed - continuing with other tests")

        # User Management Tests
        if not self.test_user_management():
            print("\n❌ User management failed - continuing with other tests")

        # Follow System Tests
        if not self.test_follow_system():
            print("\n❌ Follow system failed - continuing with other tests")

        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 BACKEND TESTS COMPLETED")
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {self.tests_run - self.tests_passed}/{self.tests_run}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")

        return self.tests_passed == self.tests_run

def main():
    tester = KoraVerseAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())