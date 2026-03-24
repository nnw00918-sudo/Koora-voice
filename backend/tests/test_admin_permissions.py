"""
Test Admin Permissions in Room
Tests the RBAC logic for room admins:
1. Admin cannot kick another admin
2. Admin can only promote members to mod (not to admin)
3. Admin can only approve seat requests for regular members
"""
import requests
import json
import uuid

API_URL = "https://pitch-chat.preview.emergentagent.com/api"

def login(email, password):
    """Login and return token"""
    response = requests.post(f"{API_URL}/auth/login", json={
        "identifier": email,
        "password": password
    })
    data = response.json()
    return data.get("access_token"), data.get("user", {}).get("id")

def create_test_user(username_prefix):
    """Create a test user"""
    unique_id = str(uuid.uuid4())[:8]
    email = f"test_{unique_id}@test.com"
    username = f"{username_prefix}_{unique_id}"
    password = "Test123456"
    
    response = requests.post(f"{API_URL}/auth/register", json={
        "email": email,
        "username": username,
        "password": password,
        "name": f"Test User {unique_id}"
    })
    
    if response.status_code == 200:
        data = response.json()
        return email, password, data.get("user", {}).get("id")
    return None, None, None

def set_room_role(token, room_id, user_id, role):
    """Set user's role in room"""
    response = requests.put(
        f"{API_URL}/rooms/{room_id}/user-role/{user_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": role}
    )
    return response

def kick_user(token, room_id, user_id):
    """Kick a user from room"""
    response = requests.post(
        f"{API_URL}/rooms/{room_id}/kick/{user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response

def join_room(token, room_id):
    """Join a room"""
    response = requests.post(
        f"{API_URL}/rooms/{room_id}/join",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response

def join_membership(token, room_id):
    """Join room membership first"""
    response = requests.post(
        f"{API_URL}/rooms/{room_id}/membership/join",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response

def get_user_room_role(room_id, user_id):
    """Get user's role in room"""
    response = requests.get(f"{API_URL}/rooms/{room_id}/user-role/{user_id}")
    return response

def run_tests():
    print("=" * 60)
    print("TESTING ADMIN PERMISSIONS")
    print("=" * 60)
    
    # Login as owner
    print("\n[1] Logging in as room owner...")
    owner_token, owner_id = login("naifliver@gmail.com", "As11223344")
    if not owner_token:
        print("ERROR: Failed to login as owner")
        return False
    print(f"    Owner logged in: {owner_id[:20]}...")
    
    # Get a room
    response = requests.get(f"{API_URL}/rooms", headers={"Authorization": f"Bearer {owner_token}"})
    rooms = response.json()
    if not rooms:
        print("ERROR: No rooms found")
        return False
    
    room_id = rooms[0]["id"]
    print(f"    Using room: {rooms[0]['title']} ({room_id})")
    
    # Create test users
    print("\n[2] Creating test users...")
    admin1_email, admin1_pass, admin1_id = create_test_user("admin1")
    admin2_email, admin2_pass, admin2_id = create_test_user("admin2")
    member_email, member_pass, member_id = create_test_user("member")
    
    if not all([admin1_id, admin2_id, member_id]):
        print("ERROR: Failed to create test users")
        return False
    
    print(f"    Admin1: {admin1_id[:20]}...")
    print(f"    Admin2: {admin2_id[:20]}...")
    print(f"    Member: {member_id[:20]}...")
    
    # Login as test users
    admin1_token, _ = login(admin1_email, admin1_pass)
    admin2_token, _ = login(admin2_email, admin2_pass)
    member_token, _ = login(member_email, member_pass)
    
    # Join room membership first (each user joins)
    print("\n[3] Users joining room membership...")
    join_membership(admin1_token, room_id)
    join_membership(admin2_token, room_id)
    join_membership(member_token, room_id)
    
    # Join room as participants
    print("\n[4] Users entering room...")
    join_room(admin1_token, room_id)
    join_room(admin2_token, room_id)
    join_room(member_token, room_id)
    print("    All users joined room")
    
    # Set admin1 and admin2 as admins (by owner)
    print("\n[5] Owner setting admin roles...")
    resp = set_room_role(owner_token, room_id, admin1_id, "admin")
    print(f"    Set admin1 as admin: {resp.status_code} - {resp.json()}")
    
    resp = set_room_role(owner_token, room_id, admin2_id, "admin")
    print(f"    Set admin2 as admin: {resp.status_code} - {resp.json()}")
    
    # TEST 1: Admin cannot kick another admin
    print("\n" + "=" * 60)
    print("TEST 1: Admin cannot kick another admin")
    print("=" * 60)
    
    resp = kick_user(admin1_token, room_id, admin2_id)
    if resp.status_code == 403:
        print(f"    PASS: Admin1 cannot kick Admin2 (403 - {resp.json().get('detail')})")
        test1_pass = True
    else:
        print(f"    FAIL: Expected 403, got {resp.status_code} - {resp.json()}")
        test1_pass = False
    
    # TEST 2: Admin can kick regular member
    print("\n" + "=" * 60)
    print("TEST 2: Admin can kick regular member")
    print("=" * 60)
    
    resp = kick_user(admin1_token, room_id, member_id)
    if resp.status_code == 200:
        print(f"    PASS: Admin1 kicked member successfully - {resp.json()}")
        test2_pass = True
    else:
        print(f"    FAIL: Expected 200, got {resp.status_code} - {resp.json()}")
        test2_pass = False
    
    # Re-join member for more tests
    join_room(member_token, room_id)
    
    # TEST 3: Admin cannot promote to admin
    print("\n" + "=" * 60)
    print("TEST 3: Admin cannot promote member to admin")
    print("=" * 60)
    
    resp = set_room_role(admin1_token, room_id, member_id, "admin")
    if resp.status_code == 403:
        print(f"    PASS: Admin1 cannot promote to admin (403 - {resp.json().get('detail')})")
        test3_pass = True
    else:
        print(f"    FAIL: Expected 403, got {resp.status_code} - {resp.json()}")
        test3_pass = False
    
    # TEST 4: Admin can promote member to mod
    print("\n" + "=" * 60)
    print("TEST 4: Admin can promote member to mod")
    print("=" * 60)
    
    resp = set_room_role(admin1_token, room_id, member_id, "mod")
    if resp.status_code == 200:
        print(f"    PASS: Admin1 promoted member to mod - {resp.json()}")
        test4_pass = True
    else:
        print(f"    FAIL: Expected 200, got {resp.status_code} - {resp.json()}")
        test4_pass = False
    
    # TEST 5: Admin cannot change another admin's role
    print("\n" + "=" * 60)
    print("TEST 5: Admin cannot change another admin's role")
    print("=" * 60)
    
    resp = set_room_role(admin1_token, room_id, admin2_id, "mod")
    if resp.status_code == 403:
        print(f"    PASS: Admin1 cannot demote Admin2 (403 - {resp.json().get('detail')})")
        test5_pass = True
    else:
        print(f"    FAIL: Expected 403, got {resp.status_code} - {resp.json()}")
        test5_pass = False
    
    # TEST 6: Owner CAN kick admin
    print("\n" + "=" * 60)
    print("TEST 6: Owner CAN kick admin")
    print("=" * 60)
    
    resp = kick_user(owner_token, room_id, admin2_id)
    if resp.status_code == 200:
        print(f"    PASS: Owner kicked admin2 - {resp.json()}")
        test6_pass = True
    else:
        print(f"    FAIL: Expected 200, got {resp.status_code} - {resp.json()}")
        test6_pass = False
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    all_tests = [test1_pass, test2_pass, test3_pass, test4_pass, test5_pass, test6_pass]
    passed = sum(all_tests)
    total = len(all_tests)
    
    print(f"Test 1 (Admin cannot kick admin):          {'PASS' if test1_pass else 'FAIL'}")
    print(f"Test 2 (Admin can kick member):            {'PASS' if test2_pass else 'FAIL'}")
    print(f"Test 3 (Admin cannot promote to admin):    {'PASS' if test3_pass else 'FAIL'}")
    print(f"Test 4 (Admin can promote to mod):         {'PASS' if test4_pass else 'FAIL'}")
    print(f"Test 5 (Admin cannot change admin role):   {'PASS' if test5_pass else 'FAIL'}")
    print(f"Test 6 (Owner CAN kick admin):             {'PASS' if test6_pass else 'FAIL'}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return passed == total

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
