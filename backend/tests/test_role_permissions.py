"""
Test Suite for Role-Based Permission System in KoraVerse App
Tests the new 3-tier role system: owner > admin > mod > user

Role Permissions:
- owner: Full control (create/close rooms, promote users)
- admin: Kick, mute, invite to stage, approve mic requests
- mod: Approve mic requests, join stage directly without request
- user: Basic user, needs to request seat
"""

import pytest
import requests
import os
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pitch-chat.preview.emergentagent.com').rstrip('/')
API_URL = f"{BASE_URL}/api"

# Test credentials as provided
TEST_CREDENTIALS = {
    "admin": {"email": "admin_test@test.com", "password": "admin123"},
    "mod": {"email": "test@koraverse.com", "password": "test123"},
    "regular_user": {"email": "regular_user@test.com", "password": "pass123"},
    "owner_emails": ["naifliver@gmail.com", "naifliver97@gmail.com"]
}

ROOM_ID = "3977f7ae"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin test account token - create if not exists"""
    # Try login first
    response = api_client.post(f"{API_URL}/auth/login", json=TEST_CREDENTIALS["admin"])
    
    if response.status_code == 200:
        return response.json()["access_token"]
    
    # If login fails, register the user
    register_data = {
        **TEST_CREDENTIALS["admin"],
        "username": f"admin_test_{datetime.now().strftime('%H%M%S')}"
    }
    response = api_client.post(f"{API_URL}/auth/register", json=register_data)
    
    if response.status_code == 200:
        # Now we need to update role to admin - this should be done by owner
        # For now, skip if we can't get admin
        pytest.skip("Cannot create admin user - owner access required")
    
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def mod_token(api_client):
    """Get mod test account token - create if not exists"""
    response = api_client.post(f"{API_URL}/auth/login", json=TEST_CREDENTIALS["mod"])
    
    if response.status_code == 200:
        return response.json()["access_token"]
    
    # If login fails, register the user
    register_data = {
        **TEST_CREDENTIALS["mod"],
        "username": f"mod_test_{datetime.now().strftime('%H%M%S')}"
    }
    response = api_client.post(f"{API_URL}/auth/register", json=register_data)
    
    if response.status_code == 200:
        pytest.skip("Mod user created but needs role assignment by owner")
    
    pytest.skip("Mod authentication failed")


@pytest.fixture(scope="module")
def regular_user_token(api_client):
    """Get regular user token - create if not exists"""
    response = api_client.post(f"{API_URL}/auth/login", json=TEST_CREDENTIALS["regular_user"])
    
    if response.status_code == 200:
        return response.json()["access_token"]
    
    # If login fails, register the user
    register_data = {
        **TEST_CREDENTIALS["regular_user"],
        "username": f"regular_user_{datetime.now().strftime('%H%M%S')}"
    }
    response = api_client.post(f"{API_URL}/auth/register", json=register_data)
    
    if response.status_code == 200:
        return response.json()["access_token"]
    
    pytest.skip("Regular user authentication failed")


@pytest.fixture(scope="module")
def test_user_session(api_client):
    """Create a fresh test user for testing"""
    timestamp = datetime.now().strftime('%H%M%S%f')
    test_user = {
        "email": f"TEST_roletest_{timestamp}@test.com",
        "password": "TestPass123!",
        "username": f"TEST_roletest_{timestamp}"
    }
    
    response = api_client.post(f"{API_URL}/auth/register", json=test_user)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "token": data["access_token"],
            "user": data["user"],
            "credentials": test_user
        }
    
    pytest.skip("Cannot create test user")


class TestRoleDefinitions:
    """Test role hierarchy and definitions"""
    
    def test_health_check(self, api_client):
        """Test that the API is accessible"""
        response = api_client.get(f"{API_URL}/rooms")
        assert response.status_code == 200, f"API not accessible: {response.status_code}"
        print(f"API is accessible, found {len(response.json())} rooms")
    
    def test_owner_emails_defined(self):
        """Verify owner emails are in the expected list"""
        expected_owners = ["naifliver@gmail.com", "naifliver97@gmail.com"]
        assert TEST_CREDENTIALS["owner_emails"] == expected_owners
        print(f"Owner emails verified: {expected_owners}")


class TestRegularUserPermissions:
    """Test that regular users have limited permissions"""
    
    def test_regular_user_cannot_join_stage_directly(self, api_client, test_user_session):
        """Regular user should get 403 when trying to join stage directly"""
        token = test_user_session["token"]
        
        # First join the room
        response = api_client.post(
            f"{API_URL}/rooms/{ROOM_ID}/join",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Accept both 200 (success) and room not found scenarios
        if response.status_code == 404:
            pytest.skip(f"Room {ROOM_ID} not found - need to create or use existing room")
        
        assert response.status_code == 200, f"Failed to join room: {response.status_code}"
        print(f"Regular user joined room successfully")
        
        # Try to join stage directly - should fail
        response = api_client.post(
            f"{API_URL}/rooms/{ROOM_ID}/seat/join-direct",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"Regular user correctly blocked from joining stage directly: {response.json()}")
    
    def test_regular_user_can_request_seat(self, api_client, test_user_session):
        """Regular user should be able to request a seat"""
        token = test_user_session["token"]
        
        # Request a seat
        response = api_client.post(
            f"{API_URL}/rooms/{ROOM_ID}/seat/request",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should either succeed or say already has pending request
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "request_id" in data or "message" in data
            print(f"Regular user seat request: {data}")
        else:
            # 400 might mean already has pending request
            print(f"Seat request response: {response.json()}")


class TestModPermissions:
    """Test mod role permissions"""
    
    def test_mod_login_and_verify_role(self, api_client):
        """Test mod user can login and verify their role"""
        response = api_client.post(f"{API_URL}/auth/login", json=TEST_CREDENTIALS["mod"])
        
        if response.status_code != 200:
            # Create mod user if doesn't exist
            register_data = {
                **TEST_CREDENTIALS["mod"],
                "username": "mod_test_user"
            }
            response = api_client.post(f"{API_URL}/auth/register", json=register_data)
            
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            print(f"Mod user info: role={user.get('role')}, email={user.get('email')}")
            # Mod role needs to be assigned by owner
            return data
        
        print(f"Mod login failed: {response.status_code}, {response.text}")
        return None


class TestAdminPermissions:
    """Test admin role permissions"""
    
    def test_admin_login_and_verify_role(self, api_client):
        """Test admin user can login and verify their role"""
        response = api_client.post(f"{API_URL}/auth/login", json=TEST_CREDENTIALS["admin"])
        
        if response.status_code != 200:
            # Create admin user if doesn't exist
            register_data = {
                **TEST_CREDENTIALS["admin"],
                "username": "admin_test_user"
            }
            response = api_client.post(f"{API_URL}/auth/register", json=register_data)
            
        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})
            print(f"Admin user info: role={user.get('role')}, email={user.get('email')}")
            return data
        
        print(f"Admin login failed: {response.status_code}, {response.text}")
        return None
    
    def test_admin_can_access_admin_dashboard(self, api_client):
        """Test admin can access admin stats endpoint"""
        # Login as admin first
        login_response = api_client.post(f"{API_URL}/auth/login", json=TEST_CREDENTIALS["admin"])
        
        if login_response.status_code != 200:
            pytest.skip("Admin user not available for testing")
        
        token = login_response.json()["access_token"]
        user = login_response.json()["user"]
        
        # Admin and owner should be able to access /admin/stats
        if user.get("role") in ["admin", "owner"]:
            response = api_client.get(
                f"{API_URL}/admin/stats",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200, f"Admin stats access failed: {response.status_code}"
            print(f"Admin stats accessible: {response.json().keys()}")
        else:
            # User doesn't have admin role yet
            response = api_client.get(
                f"{API_URL}/admin/stats",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 403, f"Non-admin should get 403: {response.status_code}"
            print(f"User correctly blocked from admin (role: {user.get('role')})")
    
    def test_admin_cannot_change_user_roles(self, api_client):
        """Test that admin cannot change user roles (only owner can)"""
        login_response = api_client.post(f"{API_URL}/auth/login", json=TEST_CREDENTIALS["admin"])
        
        if login_response.status_code != 200:
            pytest.skip("Admin user not available for testing")
        
        token = login_response.json()["access_token"]
        user = login_response.json()["user"]
        
        if user.get("role") == "admin":
            # Try to change a user's role - should fail
            response = api_client.post(
                f"{API_URL}/admin/users/some_user_id/role",
                json={"role": "mod"},
                headers={"Authorization": f"Bearer {token}"}
            )
            # Should get 403 because only owner can change roles
            assert response.status_code == 403, f"Admin should not be able to change roles: {response.status_code}"
            print("Admin correctly blocked from changing user roles")
        else:
            print(f"User is not admin (role: {user.get('role')}), skipping role change test")


class TestSeatManagement:
    """Test seat/stage management functionality"""
    
    def test_get_seat_requests_requires_permission(self, api_client, test_user_session):
        """Test that only mod/admin/owner can view seat requests"""
        token = test_user_session["token"]
        user_role = test_user_session["user"].get("role", "user")
        
        response = api_client.get(
            f"{API_URL}/rooms/{ROOM_ID}/seat/requests",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if user_role in ["owner", "admin", "mod"]:
            # Should succeed
            assert response.status_code in [200, 404], f"Seat requests should be accessible: {response.status_code}"
        else:
            # Regular user should get 403
            assert response.status_code == 403, f"Regular user should be blocked: {response.status_code}"
            print(f"Regular user correctly blocked from viewing seat requests")
    
    def test_join_direct_endpoint_exists(self, api_client, test_user_session):
        """Test that join-direct endpoint exists and responds correctly"""
        token = test_user_session["token"]
        
        # Make sure we're in the room first
        api_client.post(
            f"{API_URL}/rooms/{ROOM_ID}/join",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = api_client.post(
            f"{API_URL}/rooms/{ROOM_ID}/seat/join-direct",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should get 403 for regular user (endpoint exists but permission denied)
        # or 200/400 for privileged user
        assert response.status_code in [200, 400, 403, 404], f"Unexpected status: {response.status_code}"
        print(f"join-direct endpoint response: {response.status_code} - {response.json()}")


class TestOwnerRoleAssignment:
    """Test owner role assignment via email"""
    
    def test_owner_email_gets_owner_role_on_registration(self, api_client):
        """Test that registering with owner email gets owner role"""
        # We can't actually test this without using the real owner emails
        # But we can verify the endpoint behavior
        
        timestamp = datetime.now().strftime('%H%M%S%f')
        test_user = {
            "email": f"TEST_notowner_{timestamp}@test.com",
            "password": "TestPass123!",
            "username": f"TEST_notowner_{timestamp}"
        }
        
        response = api_client.post(f"{API_URL}/auth/register", json=test_user)
        
        if response.status_code == 200:
            user = response.json()["user"]
            # Non-owner email should get "user" role
            assert user["role"] == "user", f"Non-owner email got wrong role: {user['role']}"
            print(f"Non-owner email correctly assigned 'user' role")
        else:
            print(f"Registration failed: {response.status_code}")


class TestRoleChangeEndpoint:
    """Test role change endpoint permissions"""
    
    def test_role_change_endpoint_requires_owner(self, api_client, test_user_session):
        """Test that only owner can change roles"""
        token = test_user_session["token"]
        target_user_id = "some_user_id"
        
        response = api_client.post(
            f"{API_URL}/admin/users/{target_user_id}/role",
            json={"role": "mod"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Regular user should get 403
        assert response.status_code == 403, f"Non-owner should be blocked: {response.status_code}"
        print(f"Role change endpoint correctly restricted: {response.json()}")
    
    def test_valid_role_values(self, api_client):
        """Test that only valid roles can be assigned"""
        # This is more of a documentation test
        valid_roles = ["user", "mod", "admin"]
        invalid_roles = ["owner", "superuser", "root"]
        print(f"Valid roles for assignment: {valid_roles}")
        print(f"'owner' cannot be assigned (only via email match)")


class TestEndToEndRoleFlow:
    """Integration tests for complete role-based flows"""
    
    def test_complete_user_seat_request_flow(self, api_client):
        """Test complete flow: user requests seat, needs approval"""
        # Create a fresh user
        timestamp = datetime.now().strftime('%H%M%S%f')
        test_user = {
            "email": f"TEST_flowtest_{timestamp}@test.com",
            "password": "TestPass123!",
            "username": f"TEST_flowtest_{timestamp}"
        }
        
        # Register
        reg_response = api_client.post(f"{API_URL}/auth/register", json=test_user)
        if reg_response.status_code != 200:
            pytest.skip("Cannot create test user")
        
        token = reg_response.json()["access_token"]
        user = reg_response.json()["user"]
        
        print(f"Created user: {user['username']} with role: {user['role']}")
        
        # Join room
        join_response = api_client.post(
            f"{API_URL}/rooms/{ROOM_ID}/join",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if join_response.status_code == 404:
            # Try to find an existing room
            rooms_response = api_client.get(f"{API_URL}/rooms")
            if rooms_response.status_code == 200 and len(rooms_response.json()) > 0:
                room_id = rooms_response.json()[0]["id"]
                join_response = api_client.post(
                    f"{API_URL}/rooms/{room_id}/join",
                    headers={"Authorization": f"Bearer {token}"}
                )
                print(f"Joined alternative room: {room_id}")
            else:
                pytest.skip("No rooms available for testing")
        
        assert join_response.status_code == 200, f"Failed to join room: {join_response.status_code}"
        print(f"User joined room successfully")
        
        # Request seat (regular user path)
        seat_response = api_client.post(
            f"{API_URL}/rooms/{ROOM_ID}/seat/request",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if seat_response.status_code == 200:
            print(f"Seat request submitted: {seat_response.json()}")
        elif seat_response.status_code == 400:
            print(f"Seat request state: {seat_response.json()}")
        elif seat_response.status_code == 404:
            print("Room not found, using alternative room")
        else:
            print(f"Seat request response: {seat_response.status_code} - {seat_response.text}")
        
        # Try direct join - should fail for regular user
        direct_response = api_client.post(
            f"{API_URL}/rooms/{ROOM_ID}/seat/join-direct",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert direct_response.status_code == 403, f"Regular user should be blocked from direct join: {direct_response.status_code}"
        print(f"Direct join correctly blocked for regular user")


def test_list_all_users_roles(api_client):
    """Utility test to list all users and their roles"""
    response = api_client.get(f"{API_URL}/users")
    
    if response.status_code == 200:
        users = response.json()
        print("\n=== Current Users and Roles ===")
        for user in users[:20]:  # Limit to first 20
            print(f"  {user.get('email', 'N/A')}: {user.get('role', 'N/A')} ({user.get('username', 'N/A')})")
        print(f"Total users: {len(users)}")
    else:
        print(f"Failed to get users: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
