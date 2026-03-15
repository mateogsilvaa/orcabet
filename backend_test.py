import requests
import sys
import json
from datetime import datetime

class OrcabetAPITester:
    def __init__(self, base_url="https://orcabet-preview.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.admin_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@orcabet.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            self.admin_id = response['user']['id']
            print(f"Admin ID: {self.admin_id}, Balance: {response['user']['balance']}")
            return True
        return False

    def test_user_registration(self):
        """Test user registration (should get 100 coins, not 1000)"""
        timestamp = datetime.now().strftime('%H%M%S')
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": f"testuser_{timestamp}@test.com",
                "username": f"TestUser_{timestamp}",
                "password": "testpass123"
            }
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            initial_balance = response['user']['balance']
            print(f"User ID: {self.user_id}, Initial Balance: {initial_balance}")
            if initial_balance != 100.0:
                print(f"❌ Expected 100 coins, got {initial_balance}")
                return False
            print("✅ Correct starting balance: 100 coins")
            return True
        return False

    def test_user_profile(self):
        """Test user profile endpoint"""
        if not self.token:
            return False
        
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "user/profile",
            200,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        return success

    def test_get_athletes(self):
        """Test getting athletes list"""
        success, response = self.run_test(
            "Get Athletes",
            "GET",
            "athletes",
            200
        )
        if success:
            print(f"Found {len(response)} athletes")
        return success

    def test_create_event(self):
        """Test creating betting event (admin only)"""
        if not self.admin_token:
            return False
            
        event_data = {
            "title": "Test Match: Team A vs Team B",
            "description": "Test football match",
            "sport": "Futbol",
            "options": [
                {"name": "Team A wins", "odds": 2.0},
                {"name": "Draw", "odds": 3.0},
                {"name": "Team B wins", "odds": 2.5}
            ]
        }
        
        success, response = self.run_test(
            "Create Event",
            "POST",
            "events",
            200,
            data=event_data,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        if success:
            self.event_id = response['id']
            print(f"Created event ID: {self.event_id}")
        return success

    def test_get_events(self):
        """Test getting open events"""
        success, response = self.run_test(
            "Get Events",
            "GET",
            "events",
            200
        )
        if success:
            print(f"Found {len(response)} open events")
        return success

    def test_place_bet(self):
        """Test placing a bet"""
        if not self.token or not hasattr(self, 'event_id'):
            print("❌ Cannot test betting - missing token or event")
            return False
            
        bet_data = {
            "event_id": self.event_id,
            "option_name": "Team A wins",
            "amount": 50
        }
        
        success, response = self.run_test(
            "Place Bet",
            "POST",
            "bets",
            200,
            data=bet_data,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        if success:
            print(f"Bet placed - Potential win: {response['potential_win']}")
        return success

    def test_buy_basic_pack(self):
        """Test buying a basic card pack (now returns pending pack)"""
        if not self.token:
            return False
            
        success, response = self.run_test(
            "Buy Basic Pack",
            "POST",
            "packs/buy",
            200,
            data={"pack_type": "basic"},
            headers={'Authorization': f'Bearer {self.token}'}
        )
        if success:
            required_fields = ['pack_id', 'cards']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field: {field}")
                    return False
            self.pack_id = response['pack_id']
            print(f"Received pack ID: {self.pack_id} with {len(response['cards'])} cards, new balance: {response['new_balance']}")
            # Cards should not be saved to user collection yet
        return success

    def test_pick_card_from_pack(self):
        """Test picking a card from a pack"""
        if not self.token or not hasattr(self, 'pack_id'):
            print("❌ Cannot test pick - missing token or pack_id")
            return False
            
        success, response = self.run_test(
            "Pick Card from Pack",
            "POST",
            "packs/pick",
            200,
            data={"pack_id": self.pack_id, "card_index": 0},
            headers={'Authorization': f'Bearer {self.token}'}
        )
        if success:
            required_fields = ['id', 'athlete_name', 'rarity']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field: {field}")
                    return False
            print(f"Picked card: {response['athlete_name']} ({response['rarity']})")
        return success

    def test_get_collection(self):
        """Test getting user collection"""
        if not self.token:
            return False
            
        success, response = self.run_test(
            "Get Collection",
            "GET",
            "collection",
            200,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        if success:
            print(f"Collection: {response['total_cards']} cards, {response['total_unique']} unique")
        return success

    def test_roulette_status(self):
        """Test roulette status"""
        if not self.token:
            return False
            
        success, response = self.run_test(
            "Roulette Status",
            "GET",
            "roulette/status",
            200,
            headers={'Authorization': f'Bearer {self.token}'}
        )
        if success:
            print(f"Roulette spins remaining: {response['spins_remaining']}")
        return success

    def test_roulette_number_bet(self):
        """Test roulette number bet"""
        if not self.token:
            return False
            
        success, response = self.run_test(
            "Roulette Number Bet",
            "POST",
            "roulette/play",
            200,
            data={"bet_type": "number", "bet_value": "17", "amount": 10},
            headers={'Authorization': f'Bearer {self.token}'}
        )
        if success:
            required_fields = ['result_number', 'result_color', 'won', 'multiplier', 'winnings']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field: {field}")
                    return False
            print(f"Number bet result: {response['result_number']}, won: {response['won']}, winnings: {response['winnings']}")
        return success

    def test_roulette_color_bet(self):
        """Test roulette color bet"""
        if not self.token:
            return False
            
        success, response = self.run_test(
            "Roulette Color Bet",
            "POST",
            "roulette/play",
            200,
            data={"bet_type": "color", "bet_value": "rojo", "amount": 10},
            headers={'Authorization': f'Bearer {self.token}'}
        )
        if success:
            print(f"Color bet result: {response['result_color']}, won: {response['won']}")
        return success

    def test_get_market_listings(self):
        """Test getting market listings"""
        success, response = self.run_test(
            "Get Market Listings",
            "GET",
            "market",
            200
        )
        if success:
            print(f"Found {len(response)} market listings")
        return success

    def test_leaderboard(self):
        """Test leaderboard (should exclude admins, show card count, hide balance)"""
        success, response = self.run_test(
            "Get Leaderboard",
            "GET",
            "users/leaderboard",
            200
        )
        if success:
            print(f"Leaderboard has {len(response)} users")
            # Check that admin users are excluded and balance is hidden
            for user in response:
                if user.get('is_admin', False):
                    print(f"❌ Admin user found in leaderboard: {user['username']}")
                    return False
                if 'balance' in user:
                    print(f"❌ Balance exposed in leaderboard for user: {user['username']}")
                    return False
                if 'total_cards' not in user:
                    print(f"❌ Missing total_cards for user: {user['username']}")
                    return False
            print("✅ Leaderboard correctly excludes admins and hides balance")
        return success

    def test_admin_users_list(self):
        """Test admin users list (should show non-admin users with balance and total_cards)"""
        if not self.admin_token:
            return False
            
        success, response = self.run_test(
            "Admin Users List",
            "GET",
            "admin/users",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        if success:
            print(f"Admin users list has {len(response)} users")
            for user in response:
                if user.get('is_admin', False):
                    print(f"❌ Admin user found in admin users list: {user['username']}")
                    return False
                if 'balance' not in user:
                    print(f"❌ Missing balance for user: {user['username']}")
                    return False
                if 'total_cards' not in user:
                    print(f"❌ Missing total_cards for user: {user['username']}")
                    return False
            print("✅ Admin users list correctly shows non-admin users with balance and cards")
        return success

    def test_admin_add_balance(self):
        """Test admin adding balance to user"""
        if not self.admin_token or not self.user_id:
            return False
            
        success, response = self.run_test(
            "Admin Add Balance",
            "POST",
            f"admin/add-balance/{self.user_id}",
            200,
            data={"amount": 200},  # Add more balance to test pack system
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        if success:
            if 'new_balance' not in response:
                print("❌ Missing new_balance in response")
                return False
            print(f"Balance updated to: {response['new_balance']}")
        return success

    def test_admin_stats(self):
        """Test admin stats"""
        if not self.admin_token:
            return False
            
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        if success:
            print(f"Admin stats: {response['total_users']} users, {response['total_athletes']} athletes")
        return success

    def test_resolve_event(self):
        """Test resolving betting event"""
        if not self.admin_token or not hasattr(self, 'event_id'):
            return False
            
        success, response = self.run_test(
            "Resolve Event",
            "PUT",
            f"events/{self.event_id}/resolve",
            200,
            data={"winning_option": "Team A wins"},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        if success:
            print(f"Event resolved, winners: {response['winners']}")
        return success

def main():
    print("🚀 Starting Orcabet API Tests...")
    tester = OrcabetAPITester()

    # Test sequence
    tests = [
        ("Admin Authentication", tester.test_admin_login),
        ("User Registration (100 coins)", tester.test_user_registration),
        ("User Profile", tester.test_user_profile),
        ("Get Athletes", tester.test_get_athletes),
        ("Admin Stats", tester.test_admin_stats),
        ("Admin Users List", tester.test_admin_users_list),
        ("Admin Add Balance", tester.test_admin_add_balance),
        ("Create Event", tester.test_create_event),
        ("Get Events", tester.test_get_events),
        ("Place Bet", tester.test_place_bet),
        ("Roulette Status", tester.test_roulette_status),
        ("Roulette Number Bet", tester.test_roulette_number_bet),
        ("Roulette Color Bet", tester.test_roulette_color_bet),
        ("Buy Basic Pack (Pending)", tester.test_buy_basic_pack),
        ("Pick Card from Pack", tester.test_pick_card_from_pack),
        ("Get Collection", tester.test_get_collection),
        ("Market Listings", tester.test_get_market_listings),
        ("Leaderboard (No Admins)", tester.test_leaderboard),
        ("Resolve Event", tester.test_resolve_event),
    ]

    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if not result:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)

    # Print results
    print(f"\n📊 API Test Results:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"  - {test}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())