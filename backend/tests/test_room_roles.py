"""
Test Room Roles System for Koora Voice App
Tests the room-specific roles (owner, admin, mod, member) functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pitch-chat.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "naifliver@gmail.com"
TEST_PASSWORD = "As11223344"
ROOM_ID = "3977f7ae"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"identifier": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data["access_token"]


@pytest.fixture(scope="module")
def user_id(auth_token):
    """Get current user ID"""
    response = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    return response.json()["id"]


class TestRoomRolesAPI:
    """Test room roles endpoints"""
    
    def test_get_room_roles(self, auth_token):
        """Test GET /api/rooms/{room_id}/roles - Get all room roles"""
        response = requests.get(
            f"{BASE_URL}/api/rooms/{ROOM_ID}/roles",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get room roles: {response.text}"
        
        data = response.json()
        assert "owner" in data, "Response should contain owner info"
        assert "roles" in data, "Response should contain roles list"
        
        # Verify owner structure
        owner = data["owner"]
        assert "user_id" in owner
        assert "role" in owner
        assert owner["role"] == "owner"
        print(f"Room owner: {owner.get('username', 'N/A')}")
        print(f"Total roles defined: {len(data['roles'])}")
    
    def test_get_user_room_role(self, auth_token, user_id):
        """Test GET /api/rooms/{room_id}/user-role/{user_id} - Get specific user's role"""
        response = requests.get(
            f"{BASE_URL}/api/rooms/{ROOM_ID}/user-role/{user_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get user role: {response.text}"
        
        data = response.json()
        assert "role" in data, "Response should contain role"
        assert "can_join_stage_direct" in data, "Response should contain can_join_stage_direct"
        
        print(f"User role in room: {data['role']}")
        print(f"Can join stage directly: {data['can_join_stage_direct']}")
    
    def test_get_room_participants(self, auth_token):
        """Test GET /api/rooms/{room_id}/participants - Verify room_role field"""
        response = requests.get(
            f"{BASE_URL}/api/rooms/{ROOM_ID}/participants",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get participants: {response.text}"
        
        data = response.json()
        # Participants should be a list
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            participant = data[0]
            # Check for room_role field
            assert "room_role" in participant, "Participant should have room_role field"
            print(f"Found {len(data)} participants")
            for p in data[:3]:  # Print first 3
                print(f"  - {p.get('username', 'N/A')}: {p.get('room_role', 'N/A')}")
        else:
            print("No participants in room currently")


class TestRoomBasicFunctionality:
    """Test basic room functionality"""
    
    def test_get_room_info(self, auth_token):
        """Test GET /api/rooms/{room_id} - Get room info"""
        response = requests.get(
            f"{BASE_URL}/api/rooms/{ROOM_ID}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get room: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "title" in data
        assert "owner_id" in data
        print(f"Room: {data.get('title', 'N/A')}")
        print(f"Owner ID: {data.get('owner_id', 'N/A')}")
    
    def test_get_room_seats(self, auth_token):
        """Test GET /api/rooms/{room_id}/seats - Get room seats"""
        response = requests.get(
            f"{BASE_URL}/api/rooms/{ROOM_ID}/seats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get seats: {response.text}"
        
        data = response.json()
        assert "seats" in data
        assert "total_seats" in data
        print(f"Total seats: {data['total_seats']}")
        
        occupied = sum(1 for s in data['seats'] if s.get('occupied'))
        print(f"Occupied seats: {occupied}")
    
    def test_join_room(self, auth_token):
        """Test POST /api/rooms/{room_id}/join - Join room"""
        response = requests.post(
            f"{BASE_URL}/api/rooms/{ROOM_ID}/join",
            json={},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should succeed or return already joined
        assert response.status_code in [200, 400], f"Unexpected status: {response.text}"
        print(f"Join room response: {response.json()}")
    
    def test_heartbeat(self, auth_token):
        """Test POST /api/rooms/{room_id}/heartbeat - Send heartbeat"""
        response = requests.post(
            f"{BASE_URL}/api/rooms/{ROOM_ID}/heartbeat",
            json={},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Heartbeat failed: {response.text}"
        print("Heartbeat sent successfully")


class TestJoinStageDirect:
    """Test direct stage join for admin/mod"""
    
    def test_join_stage_direct_as_owner(self, auth_token, user_id):
        """Test POST /api/rooms/{room_id}/seat/join-direct - Owner can join directly"""
        # First check user's role
        role_response = requests.get(
            f"{BASE_URL}/api/rooms/{ROOM_ID}/user-role/{user_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        role_data = role_response.json()
        
        if role_data.get("can_join_stage_direct"):
            response = requests.post(
                f"{BASE_URL}/api/rooms/{ROOM_ID}/seat/join-direct",
                json={},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            # Should succeed or already on stage
            assert response.status_code in [200, 400], f"Unexpected status: {response.text}"
            print(f"Join stage direct response: {response.json()}")
        else:
            print(f"User cannot join stage directly (role: {role_data.get('role')})")
            pytest.skip("User doesn't have permission to join stage directly")


class TestRoomStream:
    """Test room stream functionality"""
    
    def test_get_stream_status(self, auth_token):
        """Test GET /api/rooms/{room_id}/stream - Get stream status"""
        response = requests.get(
            f"{BASE_URL}/api/rooms/{ROOM_ID}/stream",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed to get stream: {response.text}"
        
        data = response.json()
        print(f"Stream active: {data.get('stream_active', False)}")
        print(f"Stream URL: {data.get('stream_url', 'None')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
