#!/usr/bin/env python3
"""
Backend smoke test for Phase 4 - Theme toggle and Live Feed
Testing: /api/auth/login, /api/attacks/?minutes=15, /api/logs/?action=block&limit=40
"""
import requests
import sys

BASE_URL = "https://netguard-interface.preview.emergentagent.com"

class BackendTester:
    def __init__(self):
        self.token = None
        self.tests_passed = 0
        self.tests_run = 0

    def test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        h = headers or {}
        if self.token:
            h['Authorization'] = f'Bearer {self.token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=h, timeout=10)
            elif method == 'POST':
                h['Content-Type'] = 'application/json'
                response = requests.post(url, json=data, headers=h, timeout=10)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return True, response.json() if response.text else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def run_tests(self):
        print("=" * 60)
        print("BACKEND SMOKE TEST - Phase 4")
        print("=" * 60)
        
        # Test 1: Login
        success, response = self.test(
            "Login (admin)",
            "POST",
            "/api/auth/login",
            200,
            data={"email": "admin@firewall.local", "password": "Admin@123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
        else:
            print("❌ Login failed, stopping tests")
            return False
        
        # Test 2: Get attacks (aggregated view)
        success, response = self.test(
            "Get attacks (last 15 min)",
            "GET",
            "/api/attacks/?minutes=15",
            200
        )
        if success:
            items = response.get('items', [])
            print(f"   Found {len(items)} aggregated attackers")
        
        # Test 3: Get logs for live feed
        success, response = self.test(
            "Get logs (action=block, limit=40) for Live Feed",
            "GET",
            "/api/logs/?action=block&limit=40",
            200
        )
        if success:
            items = response.get('items', [])
            print(f"   Found {len(items)} block events for live feed")
            if len(items) > 0:
                print(f"   Sample event: {items[0].get('src_ip')} -> {items[0].get('dst_ip')}:{items[0].get('port')}")
        
        return True

def main():
    tester = BackendTester()
    success = tester.run_tests()
    
    print("\n" + "=" * 60)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print("=" * 60)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
