"""
Test social features: User Search, User Profile, Messaging, Threads, Follow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pitch-chat.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_CREDENTIALS = {
    "email": "naifliver@gmail.com",
    "password": "As11223344"
}

SEARCH_TARGET_USER = {
    "id": "b292fecb-9bde-4ea7-9cd7-9f4d62131a0f",
    "username": "Liver97"
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=TEST_CREDENTIALS,
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestUserSearch:
    """User search API tests"""
    
    def test_search_users_by_username(self, api_client):
        """Search for 'liver' should return Liver97"""
        response = api_client.get(f"{BASE_URL}/api/users/search?q=liver")
        
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        
        # Find Liver97 in results
        liver97_found = False
        for user in data["users"]:
            if user["username"] == "Liver97":
                liver97_found = True
                assert "id" in user
                assert "avatar" in user
                break
        
        assert liver97_found, "Liver97 user should be in search results"
        print(f"✓ Search for 'liver' found Liver97 user")
    
    def test_search_empty_query(self, api_client):
        """Empty search query should return empty results"""
        response = api_client.get(f"{BASE_URL}/api/users/search?q=")
        
        assert response.status_code == 200
        data = response.json()
        assert data["users"] == []
        print("✓ Empty search query returns empty results")


class TestUserProfile:
    """User profile API tests"""
    
    def test_get_user_profile(self, api_client):
        """Get user profile for Liver97"""
        response = api_client.get(f"{BASE_URL}/api/users/{SEARCH_TARGET_USER['id']}/profile")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify profile fields
        assert data["id"] == SEARCH_TARGET_USER["id"]
        assert data["username"] == SEARCH_TARGET_USER["username"]
        assert "followers_count" in data
        assert "following_count" in data
        assert "is_following" in data
        assert "is_self" in data
        print(f"✓ Got profile for {SEARCH_TARGET_USER['username']}")
    
    def test_get_nonexistent_user_profile(self, api_client):
        """Getting nonexistent user should return 404"""
        response = api_client.get(f"{BASE_URL}/api/users/nonexistent-user-id/profile")
        
        assert response.status_code == 404
        print("✓ Nonexistent user profile returns 404")


class TestConversations:
    """Messaging/Conversation API tests"""
    
    def test_get_conversations_list(self, api_client):
        """Get list of conversations"""
        response = api_client.get(f"{BASE_URL}/api/conversations")
        
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        print(f"✓ Got {len(data['conversations'])} conversations")
    
    def test_start_conversation(self, api_client):
        """Start or get conversation with Liver97"""
        response = api_client.post(f"{BASE_URL}/api/conversations/{SEARCH_TARGET_USER['id']}")
        
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        print(f"✓ Started/got conversation: {data['conversation_id']}")
        
        return data["conversation_id"]
    
    def test_get_conversation_messages(self, api_client):
        """Get messages in a conversation"""
        # First start/get a conversation
        start_response = api_client.post(f"{BASE_URL}/api/conversations/{SEARCH_TARGET_USER['id']}")
        assert start_response.status_code == 200
        convo_id = start_response.json()["conversation_id"]
        
        # Get messages
        response = api_client.get(f"{BASE_URL}/api/conversations/{convo_id}/messages")
        
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        print(f"✓ Got {len(data['messages'])} messages in conversation")
    
    def test_send_message(self, api_client):
        """Send a message in a conversation"""
        # First start/get a conversation
        start_response = api_client.post(f"{BASE_URL}/api/conversations/{SEARCH_TARGET_USER['id']}")
        assert start_response.status_code == 200
        convo_id = start_response.json()["conversation_id"]
        
        # Send a message
        response = api_client.post(
            f"{BASE_URL}/api/conversations/{convo_id}/messages",
            json={"content": "Test message from automated test"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message_id" in data
        print(f"✓ Sent message with ID: {data['message_id']}")


class TestThreads:
    """Threads API tests"""
    
    def test_get_threads_list(self, api_client):
        """Get list of threads"""
        response = api_client.get(f"{BASE_URL}/api/threads")
        
        assert response.status_code == 200
        data = response.json()
        assert "threads" in data
        
        if data["threads"]:
            thread = data["threads"][0]
            assert "id" in thread
            assert "author" in thread
            assert "content" in thread or thread["content"] == ""
        
        print(f"✓ Got {len(data['threads'])} threads")
    
    def test_get_threads_following_tab(self, api_client):
        """Get threads from following tab"""
        response = api_client.get(f"{BASE_URL}/api/threads?tab=following")
        
        assert response.status_code == 200
        data = response.json()
        assert "threads" in data
        print(f"✓ Got {len(data['threads'])} threads from following")


class TestFollow:
    """Follow system API tests"""
    
    def test_follow_user(self, api_client):
        """Follow Liver97 user"""
        response = api_client.post(f"{BASE_URL}/api/users/{SEARCH_TARGET_USER['id']}/follow")
        
        # Could be 200 (success) or 400 (already following)
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            print(f"✓ Followed {SEARCH_TARGET_USER['username']}")
        else:
            print(f"✓ Already following {SEARCH_TARGET_USER['username']}")
    
    def test_get_user_followers(self, api_client):
        """Get followers of a user"""
        response = api_client.get(f"{BASE_URL}/api/users/{SEARCH_TARGET_USER['id']}/followers")
        
        assert response.status_code == 200
        data = response.json()
        assert "followers" in data
        print(f"✓ {SEARCH_TARGET_USER['username']} has {data['count']} followers")
    
    def test_get_user_following(self, api_client):
        """Get users that a user follows"""
        response = api_client.get(f"{BASE_URL}/api/users/{SEARCH_TARGET_USER['id']}/following")
        
        assert response.status_code == 200
        data = response.json()
        assert "following" in data
        print(f"✓ {SEARCH_TARGET_USER['username']} follows {data['count']} users")


class TestThreadReplies:
    """Thread replies API tests"""
    
    def test_get_thread_replies(self, api_client):
        """Get replies for a thread"""
        # First get threads to find one with replies
        threads_response = api_client.get(f"{BASE_URL}/api/threads")
        assert threads_response.status_code == 200
        threads = threads_response.json()["threads"]
        
        if threads:
            thread_id = threads[0]["id"]
            response = api_client.get(f"{BASE_URL}/api/threads/{thread_id}/replies")
            
            assert response.status_code == 200
            data = response.json()
            assert "replies" in data
            
            # Verify reply format if there are replies
            if data["replies"]:
                reply = data["replies"][0]
                assert "id" in reply
                assert "content" in reply
                assert "author" in reply
                # Check for "replying_to" field
                if "replying_to" in reply:
                    print(f"✓ Reply has 'replying_to' field: {reply['replying_to']}")
            
            print(f"✓ Thread {thread_id} has {len(data['replies'])} replies")
        else:
            print("✓ No threads available for reply test (skipped)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
