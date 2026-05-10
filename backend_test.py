#!/usr/bin/env python3
"""
Backend API Testing for Firewall Console - Phase 5 (Visual Refactor + URL Filter + Netplan)
Tests: Login, URL Filter CRUD, Interfaces APIs, Netplan export
"""
import requests
import sys
from datetime import datetime

BASE_URL = "https://netguard-interface.preview.emergentagent.com/api"

class APITester:
    def __init__(self):
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{BASE_URL}{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=req_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers, timeout=10)
            else:
                print(f"❌ Failed - Unknown method {method}")
                self.tests_failed.append(name)
                return False, {}

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.tests_failed.append(name)

            try:
                return success, response.json() if response.text else {}
            except:
                return success, response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.tests_failed.append(name)
            return False, {}

    def login(self, email, password):
        """Test login and get token"""
        print(f"\n{'='*60}")
        print(f"🔐 Logging in as {email}")
        print(f"{'='*60}")
        success, response = self.run_test(
            "Login",
            "POST",
            "/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Token obtained: {self.token[:20]}...")
            return True
        print(f"❌ Login failed")
        return False

    def test_url_filter_apis(self):
        """Test all URL Filter APIs"""
        print(f"\n{'='*60}")
        print(f"🔥 Testing URL Filter APIs")
        print(f"{'='*60}")

        # 1. List filters (should be empty or have existing)
        success, filters = self.run_test(
            "List URL Filters",
            "GET",
            "/url-filter/",
            200
        )
        if not success:
            return None

        # 2. Create new filter
        success, created = self.run_test(
            "Create URL Filter",
            "POST",
            "/url-filter/",
            200,
            data={
                "name": "QA Test Filter",
                "enabled": True,
                "source": "any",
                "action": "block",
                "domains": ["qa-example.com", "qa-example2.com"],
                "description": "Test filter created by automated testing"
            }
        )
        if not success or not created.get('id'):
            print("❌ Failed to create filter, skipping remaining URL filter tests")
            return None

        filter_id = created['id']
        print(f"✅ Created filter with ID: {filter_id}")

        # 3. Get filter by ID (list again to verify)
        success, filters = self.run_test(
            "List URL Filters (verify creation)",
            "GET",
            "/url-filter/",
            200
        )
        if success:
            found = any(f['id'] == filter_id for f in filters)
            if found:
                print(f"✅ Filter {filter_id} found in list")
            else:
                print(f"❌ Filter {filter_id} NOT found in list")

        # 4. Update filter
        success, updated = self.run_test(
            "Update URL Filter",
            "PUT",
            f"/url-filter/{filter_id}",
            200,
            data={
                "name": "QA Test Filter Updated",
                "enabled": True,
                "source": "192.168.1.0/24",
                "action": "redirect",
                "domains": ["qa-example.com", "qa-example2.com", "qa-example3.com"],
                "description": "Updated description"
            }
        )

        # 5. Toggle filter (disable)
        success, toggled = self.run_test(
            "Toggle URL Filter (disable)",
            "PATCH",
            f"/url-filter/{filter_id}/toggle",
            200
        )
        if success and toggled.get('enabled') == False:
            print(f"✅ Filter toggled to disabled")

        # 6. Toggle filter (enable again)
        success, toggled = self.run_test(
            "Toggle URL Filter (enable)",
            "PATCH",
            f"/url-filter/{filter_id}/toggle",
            200
        )
        if success and toggled.get('enabled') == True:
            print(f"✅ Filter toggled to enabled")

        # 7. Resolve now (single filter)
        success, resolved = self.run_test(
            "Resolve URL Filter (single)",
            "POST",
            f"/url-filter/{filter_id}/resolve",
            200
        )
        if success:
            print(f"✅ Resolved {resolved.get('count', 0)} IPs")

        # 8. Resolve all
        success, resolved_all = self.run_test(
            "Resolve All URL Filters",
            "POST",
            "/url-filter/resolve-all",
            200
        )
        if success:
            print(f"✅ Resolved all: {resolved_all.get('updated', 0)} filters, {resolved_all.get('total_ips', 0)} total IPs")

        # 9. Delete filter
        success, deleted = self.run_test(
            "Delete URL Filter",
            "DELETE",
            f"/url-filter/{filter_id}",
            200
        )

        return filter_id

    def test_interfaces_apis(self):
        """Test Interfaces APIs"""
        print(f"\n{'='*60}")
        print(f"🌐 Testing Interfaces APIs")
        print(f"{'='*60}")

        # 1. List interfaces
        success, interfaces = self.run_test(
            "List Interfaces",
            "GET",
            "/interfaces/",
            200
        )
        if not success:
            return None

        # 2. Export Netplan YAML
        success, netplan = self.run_test(
            "Export Netplan YAML",
            "GET",
            "/interfaces/export/netplan",
            200
        )
        if success:
            if isinstance(netplan, str) and 'network:' in netplan:
                print(f"✅ Netplan YAML generated successfully")
                print(f"   Preview: {netplan[:100]}...")
            else:
                print(f"❌ Netplan YAML format unexpected")

        # 3. Create interface with static IP
        success, created = self.run_test(
            "Create Interface (static)",
            "POST",
            "/interfaces/",
            200,
            data={
                "name": "QA_TEST",
                "device": "eth99",
                "role": "lan",
                "connection_type": "static",
                "ipv4": "192.168.99.1/24",
                "gateway": "192.168.99.254",
                "dns_servers": ["1.1.1.1", "8.8.8.8"],
                "mac": "",
                "mtu": 1500,
                "enabled": True,
                "description": "QA test interface"
            }
        )
        if not success or not created.get('id'):
            print("❌ Failed to create interface, skipping remaining interface tests")
            return None

        iface_id = created['id']
        print(f"✅ Created interface with ID: {iface_id}")

        # 4. Update interface to PPPoE
        success, updated = self.run_test(
            "Update Interface (to PPPoE)",
            "PUT",
            f"/interfaces/{iface_id}",
            200,
            data={
                "name": "QA_TEST",
                "device": "eth99",
                "role": "wan",
                "connection_type": "pppoe",
                "ipv4": "",
                "gateway": "",
                "dns_servers": [],
                "mac": "",
                "mtu": 1492,
                "enabled": True,
                "description": "QA test PPPoE interface",
                "pppoe_username": "test@isp.com",
                "pppoe_password": "testpass123",
                "pppoe_service": "test-service"
            }
        )
        if success:
            # Check password is masked
            if updated.get('pppoe_password') == '••••••••':
                print(f"✅ PPPoE password correctly masked in response")
            else:
                print(f"⚠️  PPPoE password not masked: {updated.get('pppoe_password')}")

        # 5. Toggle interface
        success, toggled = self.run_test(
            "Toggle Interface (disable)",
            "PATCH",
            f"/interfaces/{iface_id}/toggle",
            200
        )

        # 6. Toggle interface again
        success, toggled = self.run_test(
            "Toggle Interface (enable)",
            "PATCH",
            f"/interfaces/{iface_id}/toggle",
            200
        )

        # 7. Delete interface
        success, deleted = self.run_test(
            "Delete Interface",
            "DELETE",
            f"/interfaces/{iface_id}",
            200
        )

        # 8. Test discover (may fail if HOST_METRICS_REAL=false)
        success, discovered = self.run_test(
            "Discover Interfaces (auto-detect)",
            "POST",
            "/interfaces/discover",
            200
        )
        if not success:
            print(f"ℹ️  Discover may be disabled (HOST_METRICS_REAL=false)")

        return iface_id

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed} ✅")
        print(f"Failed: {len(self.tests_failed)} ❌")
        if self.tests_failed:
            print(f"\nFailed tests:")
            for test in self.tests_failed:
                print(f"  - {test}")
        print(f"{'='*60}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success rate: {success_rate:.1f}%")
        return len(self.tests_failed) == 0


def main():
    print(f"{'='*60}")
    print(f"🚀 Firewall Console Backend API Testing")
    print(f"   Phase 5: Visual Refactor + URL Filter + Netplan")
    print(f"{'='*60}")
    print(f"Base URL: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = APITester()

    # Login as admin
    if not tester.login("admin@firewall.local", "Admin@123"):
        print("\n❌ Login failed, cannot proceed with tests")
        return 1

    # Test URL Filter APIs
    tester.test_url_filter_apis()

    # Test Interfaces APIs
    tester.test_interfaces_apis()

    # Print summary
    all_passed = tester.print_summary()
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
