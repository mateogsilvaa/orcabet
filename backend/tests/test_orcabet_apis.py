"""
Orcabet API Tests - Firebase Auth & Full CRUD Tests
Tests all backend API endpoints for the fantasy sports betting platform.
"""
import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Firebase Auth Config
FIREBASE_API_KEY = "AIzaSyAm5TX5FY7bUbSQkVe98nFzGw6mU4LL5fI"

# Test credentials
ADMIN_EMAIL = "admin@orcabet.com"
ADMIN_PASSWORD = "admin123"


def firebase_sign_in(email: str, password: str):
    """Sign in to Firebase and get ID token"""
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    resp = requests.post(url, json={
        "email": email,
        "password": password,
        "returnSecureToken": True
    }, timeout=10)
    if resp.status_code == 200:
        return resp.json()
    return None


def get_auth_headers(token: str):
    """Get authorization headers with Bearer token"""
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ==================== FIXTURES ====================

@pytest.fixture(scope="session")
def admin_token():
    """Get admin Firebase ID token"""
    result = firebase_sign_in(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not result:
        pytest.skip("Could not authenticate admin user")
    return result.get('idToken')


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    """Get admin auth headers"""
    return get_auth_headers(admin_token)


@pytest.fixture(scope="session")
def api_client():
    """Create requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ==================== PUBLIC ENDPOINTS ====================

class TestPublicEndpoints:
    """Tests for endpoints that don't require authentication"""
    
    def test_get_events_public(self, api_client):
        """GET /api/events - Get public events"""
        response = api_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Events count: {len(data)}")
    
    def test_get_athletes_public(self, api_client):
        """GET /api/athletes - Get all athletes"""
        response = api_client.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have seeded athletes"
        print(f"Athletes count: {len(data)}")
        
        # Verify athlete structure
        athlete = data[0]
        assert "id" in athlete
        assert "name" in athlete
        assert "position" in athlete
        assert "team" in athlete
        assert "rarity" in athlete
        assert "overall_rating" in athlete
    
    def test_get_pack_config_public(self, api_client):
        """GET /api/packs/config - Get pack configuration"""
        response = api_client.get(f"{BASE_URL}/api/packs/config")
        assert response.status_code == 200
        data = response.json()
        
        # Verify pack types exist
        assert "basic" in data
        assert "gold" in data
        assert "premium" in data
        assert "free" in data
        
        # Verify prices
        assert data["basic"]["price"] == 100
        assert data["gold"]["price"] == 250
        assert data["premium"]["price"] == 500
        assert data["free"]["price"] == 0
        print("Pack config verified successfully")
    
    def test_get_market_listings_public(self, api_client):
        """GET /api/market - Get market listings"""
        response = api_client.get(f"{BASE_URL}/api/market")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Market listings count: {len(data)}")
    
    def test_get_leaderboard_public(self, api_client):
        """GET /api/users/leaderboard - Get leaderboard"""
        response = api_client.get(f"{BASE_URL}/api/users/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify no admin users in leaderboard
        for user in data:
            assert user.get('is_admin') != True, "Admin users should not be in leaderboard"
            assert "total_cards" in user
        print(f"Leaderboard users count: {len(data)}")


# ==================== AUTH ENDPOINTS ====================

class TestFirebaseAuth:
    """Tests for Firebase authentication flow"""
    
    def test_firebase_sign_in_admin(self):
        """Firebase sign in with admin credentials"""
        result = firebase_sign_in(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert result is not None, "Firebase sign in should succeed"
        assert "idToken" in result
        assert "localId" in result
        print(f"Admin Firebase UID: {result.get('localId')}")
    
    def test_firebase_sign_in_invalid_credentials(self):
        """Firebase sign in with invalid credentials should fail"""
        result = firebase_sign_in("invalid@test.com", "wrongpassword")
        assert result is None, "Invalid credentials should fail"
    
    def test_api_login_with_firebase_token(self, api_client, admin_headers):
        """POST /api/auth/login - Login with Firebase token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] == True
        print(f"API login successful for user: {data['user']['username']}")
    
    def test_api_login_without_token(self, api_client):
        """POST /api/auth/login - Should fail without token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login")
        assert response.status_code == 401


# ==================== USER ENDPOINTS ====================

class TestUserEndpoints:
    """Tests for user profile and balance endpoints"""
    
    def test_get_user_profile(self, api_client, admin_headers):
        """GET /api/user/profile - Get current user profile"""
        response = api_client.get(f"{BASE_URL}/api/user/profile", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "username" in data
        assert "balance" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"User profile: {data['username']}, balance: {data['balance']}")
    
    def test_get_user_balance(self, api_client, admin_headers):
        """GET /api/user/balance - Get current user balance"""
        response = api_client.get(f"{BASE_URL}/api/user/balance", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert isinstance(data["balance"], (int, float))
        print(f"User balance: {data['balance']}")
    
    def test_get_user_profile_unauthorized(self, api_client):
        """GET /api/user/profile - Should fail without token"""
        response = api_client.get(f"{BASE_URL}/api/user/profile")
        assert response.status_code == 401
    
    def test_user_search(self, api_client):
        """GET /api/users/search - Search users"""
        response = api_client.get(f"{BASE_URL}/api/users/search?q=")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Users found: {len(data)}")


# ==================== EVENTS/BETTING ENDPOINTS ====================

class TestBettingEndpoints:
    """Tests for betting and events functionality"""
    
    def test_get_my_bets(self, api_client, admin_headers):
        """GET /api/bets/mine - Get user's bets"""
        response = api_client.get(f"{BASE_URL}/api/bets/mine", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"User bets count: {len(data)}")
    
    def test_admin_create_event(self, api_client, admin_headers):
        """POST /api/events - Admin creates a betting event"""
        event_data = {
            "title": "TEST_Event_" + ''.join(random.choices(string.ascii_letters, k=6)),
            "description": "Test event for automated testing",
            "sport": "Football",
            "options": [
                {"name": "Team A", "odds": 1.5},
                {"name": "Team B", "odds": 2.5}
            ]
        }
        response = api_client.post(f"{BASE_URL}/api/events", json=event_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == event_data["title"]
        assert data["status"] == "open"
        print(f"Created event: {data['title']} with ID: {data['id']}")
        return data["id"]
    
    def test_admin_get_all_events(self, api_client, admin_headers):
        """GET /api/events/all - Admin gets all events including closed/resolved"""
        response = api_client.get(f"{BASE_URL}/api/events/all", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total events (admin view): {len(data)}")


# ==================== COLLECTION ENDPOINTS ====================

class TestCollectionEndpoints:
    """Tests for card collection functionality"""
    
    def test_get_my_collection(self, api_client, admin_headers):
        """GET /api/collection - Get user's card collection"""
        response = api_client.get(f"{BASE_URL}/api/collection", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "cards" in data
        assert "total_unique" in data
        assert "total_athletes" in data
        assert "total_cards" in data
        assert "duplicates" in data
        print(f"Collection: {data['total_cards']} cards, {data['total_unique']} unique, {data['total_athletes']} total athletes")
    
    def test_get_user_collection_public(self, api_client, admin_headers):
        """GET /api/collection/{user_id} - Get specific user's collection"""
        # First get the admin user ID
        profile_resp = api_client.get(f"{BASE_URL}/api/user/profile", headers=admin_headers)
        user_id = profile_resp.json()["id"]
        
        response = api_client.get(f"{BASE_URL}/api/collection/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "cards" in data
        print(f"User {data['user']['username']} has {data['total_cards']} cards")


# ==================== ROULETTE ENDPOINTS ====================

class TestRouletteEndpoints:
    """Tests for roulette functionality"""
    
    def test_get_roulette_status(self, api_client, admin_headers):
        """GET /api/roulette/status - Get roulette spins status"""
        response = api_client.get(f"{BASE_URL}/api/roulette/status", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "spins_remaining" in data
        assert "spins_used" in data
        assert data["spins_remaining"] >= 0
        assert data["spins_remaining"] <= 3
        print(f"Roulette status: {data['spins_remaining']} spins remaining, {data['spins_used']} used")


# ==================== SHOP/PACKS ENDPOINTS ====================

class TestPackEndpoints:
    """Tests for pack/shop functionality"""
    
    def test_check_free_pack_available(self, api_client, admin_headers):
        """GET /api/packs/free-available - Check if free pack is available"""
        response = api_client.get(f"{BASE_URL}/api/packs/free-available", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert isinstance(data["available"], bool)
        print(f"Free pack available: {data['available']}")


# ==================== ADMIN ENDPOINTS ====================

class TestAdminEndpoints:
    """Tests for admin panel functionality"""
    
    def test_get_admin_stats(self, api_client, admin_headers):
        """GET /api/admin/stats - Get admin dashboard stats"""
        response = api_client.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all stat fields exist
        assert "total_users" in data
        assert "total_bets" in data
        assert "total_events" in data
        assert "total_athletes" in data
        assert "total_cards" in data
        assert "active_listings" in data
        
        print(f"Admin stats - Users: {data['total_users']}, Athletes: {data['total_athletes']}, Events: {data['total_events']}")
    
    def test_get_admin_users(self, api_client, admin_headers):
        """GET /api/admin/users - Get all non-admin users"""
        response = api_client.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify users have expected fields
        for user in data:
            assert "id" in user
            assert "username" in user
            assert "balance" in user
            assert "total_cards" in user
            assert user.get("is_admin") != True, "Should only return non-admin users"
        
        print(f"Non-admin users count: {len(data)}")
    
    def test_admin_stats_unauthorized(self, api_client):
        """GET /api/admin/stats - Should fail without admin token"""
        response = api_client.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401


# ==================== INTEGRATION TESTS ====================

class TestIntegrationFlows:
    """Integration tests for complete user flows"""
    
    def test_admin_create_close_resolve_event_flow(self, api_client, admin_headers):
        """Full event lifecycle: create -> close -> resolve"""
        # Create event
        event_data = {
            "title": "TEST_Flow_" + ''.join(random.choices(string.ascii_letters, k=6)),
            "description": "Integration test event",
            "sport": "Basketball",
            "options": [
                {"name": "Option A", "odds": 1.8},
                {"name": "Option B", "odds": 2.2}
            ]
        }
        create_resp = api_client.post(f"{BASE_URL}/api/events", json=event_data, headers=admin_headers)
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        print(f"Created event: {event_id}")
        
        # Close event
        close_resp = api_client.put(f"{BASE_URL}/api/events/{event_id}/close", headers=admin_headers)
        assert close_resp.status_code == 200
        print(f"Closed event: {event_id}")
        
        # Resolve event
        resolve_resp = api_client.put(
            f"{BASE_URL}/api/events/{event_id}/resolve",
            json={"winning_option": "Option A"},
            headers=admin_headers
        )
        assert resolve_resp.status_code == 200
        print(f"Resolved event: {event_id} with winner: Option A")
        
        # Cleanup - delete event
        delete_resp = api_client.delete(f"{BASE_URL}/api/events/{event_id}", headers=admin_headers)
        assert delete_resp.status_code == 200
        print(f"Deleted event: {event_id}")
    
    def test_admin_athlete_crud_flow(self, api_client, admin_headers):
        """Full athlete lifecycle: create -> update -> delete"""
        # Create athlete
        athlete_data = {
            "name": "TEST_Player_" + ''.join(random.choices(string.ascii_letters, k=4)),
            "position": "Forward",
            "team": "Test Team",
            "image_url": "",
            "rarity": "rare",
            "overall_rating": 75,
            "stats": {"attack": 80, "defense": 60, "speed": 75}
        }
        create_resp = api_client.post(f"{BASE_URL}/api/athletes", json=athlete_data, headers=admin_headers)
        assert create_resp.status_code == 200
        athlete_id = create_resp.json()["id"]
        print(f"Created athlete: {athlete_id}")
        
        # Update athlete
        athlete_data["name"] = athlete_data["name"] + "_Updated"
        athlete_data["overall_rating"] = 80
        update_resp = api_client.put(f"{BASE_URL}/api/athletes/{athlete_id}", json=athlete_data, headers=admin_headers)
        assert update_resp.status_code == 200
        print(f"Updated athlete: {athlete_id}")
        
        # Delete athlete
        delete_resp = api_client.delete(f"{BASE_URL}/api/athletes/{athlete_id}", headers=admin_headers)
        assert delete_resp.status_code == 200
        print(f"Deleted athlete: {athlete_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
