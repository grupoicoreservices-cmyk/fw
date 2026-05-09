#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Firewall Console
Tests all endpoints with proper authentication and RBAC
"""
import requests
import sys
from datetime import datetime

BASE_URL = "https://netguard-interface.preview.emergentagent.com/api"

class FirewallAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.operator_token = None
        self.viewer_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.failures = []

    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def test(self, name, method, endpoint, expected_status, token=None, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        self.log(f"Testing {name}...", "TEST")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}", "PASS")
                return True, response.json() if response.text else {}
            else:
                self.tests_failed += 1
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                self.log(f"❌ FAILED - {error_msg}", "FAIL")
                self.failures.append(f"{name}: {error_msg} - Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.tests_failed += 1
            error_msg = f"Exception: {str(e)}"
            self.log(f"❌ FAILED - {error_msg}", "FAIL")
            self.failures.append(f"{name}: {error_msg}")
            return False, {}

    def test_auth(self):
        """Test authentication endpoints"""
        self.log("=" * 60, "INFO")
        self.log("TESTING AUTHENTICATION", "INFO")
        self.log("=" * 60, "INFO")

        # Test admin login
        success, response = self.test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@firewall.local", "password": "Admin@123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.log(f"Admin token obtained: {self.admin_token[:20]}...", "INFO")
        else:
            self.log("CRITICAL: Admin login failed - cannot continue", "ERROR")
            return False

        # Test operator login
        success, response = self.test(
            "Operator Login",
            "POST",
            "auth/login",
            200,
            data={"email": "operator@firewall.local", "password": "Operator@123"}
        )
        if success and 'access_token' in response:
            self.operator_token = response['access_token']

        # Test viewer login
        success, response = self.test(
            "Viewer Login",
            "POST",
            "auth/login",
            200,
            data={"email": "viewer@firewall.local", "password": "Viewer@123"}
        )
        if success and 'access_token' in response:
            self.viewer_token = response['access_token']

        # Test wrong password
        self.test(
            "Login with Wrong Password",
            "POST",
            "auth/login",
            401,
            data={"email": "admin@firewall.local", "password": "WrongPassword"}
        )

        # Test /me with valid token
        self.test(
            "GET /auth/me with Valid Token",
            "GET",
            "auth/me",
            200,
            token=self.admin_token
        )

        # Test /me without token
        self.test(
            "GET /auth/me without Token",
            "GET",
            "auth/me",
            401
        )

        return True

    def test_metrics(self):
        """Test metrics endpoints"""
        self.log("=" * 60, "INFO")
        self.log("TESTING METRICS", "INFO")
        self.log("=" * 60, "INFO")

        # Test live metrics
        success, response = self.test(
            "GET /metrics/live",
            "GET",
            "metrics/live",
            200,
            token=self.admin_token
        )
        if success:
            if 'samples' in response and isinstance(response['samples'], list):
                self.log(f"Live metrics returned {len(response['samples'])} samples", "INFO")
            else:
                self.failures.append("GET /metrics/live: Response missing 'samples' array")

        # Test summary metrics
        success, response = self.test(
            "GET /metrics/summary",
            "GET",
            "metrics/summary",
            200,
            token=self.admin_token
        )
        if success:
            if 'current' in response:
                self.log(f"Summary metrics returned current data", "INFO")
            else:
                self.failures.append("GET /metrics/summary: Response missing 'current' field")

    def test_logs(self):
        """Test logs endpoints"""
        self.log("=" * 60, "INFO")
        self.log("TESTING LOGS", "INFO")
        self.log("=" * 60, "INFO")

        # Test list logs
        success, response = self.test(
            "GET /logs/",
            "GET",
            "logs/",
            200,
            token=self.admin_token
        )
        if success and 'items' in response:
            self.log(f"Logs returned {len(response['items'])} items", "INFO")

        # Test filter by severity
        success, response = self.test(
            "GET /logs/ with severity=critical",
            "GET",
            "logs/",
            200,
            token=self.admin_token,
            params={"severity": "critical"}
        )

        # Test filter by query
        success, response = self.test(
            "GET /logs/ with q=BLOCKED",
            "GET",
            "logs/",
            200,
            token=self.admin_token,
            params={"q": "BLOCKED"}
        )

    def test_firewall_rules(self):
        """Test firewall rules CRUD and RBAC"""
        self.log("=" * 60, "INFO")
        self.log("TESTING FIREWALL RULES", "INFO")
        self.log("=" * 60, "INFO")

        # Test list rules
        success, response = self.test(
            "GET /firewall-rules/",
            "GET",
            "firewall-rules/",
            200,
            token=self.admin_token
        )
        if success and isinstance(response, list):
            self.log(f"Firewall rules returned {len(response)} rules", "INFO")
            initial_count = len(response)
        else:
            initial_count = 0

        # Test create rule (admin)
        new_rule_data = {
            "enabled": True,
            "action": "allow",
            "interface": "LAN",
            "direction": "in",
            "protocol": "tcp",
            "source": "any",
            "source_port": "any",
            "destination": "any",
            "destination_port": "8080",
            "description": "Test rule created by automated test",
            "log": False
        }
        success, response = self.test(
            "POST /firewall-rules/ (admin)",
            "POST",
            "firewall-rules/",
            200,
            token=self.admin_token,
            data=new_rule_data
        )
        created_rule_id = response.get('id') if success else None

        # Test create rule (viewer - should fail)
        self.test(
            "POST /firewall-rules/ (viewer - should be 403)",
            "POST",
            "firewall-rules/",
            403,
            token=self.viewer_token,
            data=new_rule_data
        )

        if created_rule_id:
            # Test toggle rule
            self.test(
                f"PATCH /firewall-rules/{created_rule_id}/toggle",
                "PATCH",
                f"firewall-rules/{created_rule_id}/toggle",
                200,
                token=self.admin_token
            )

            # Test update rule
            update_data = {
                "enabled": True,
                "action": "block",
                "interface": "WAN",
                "direction": "in",
                "protocol": "tcp",
                "source": "any",
                "source_port": "any",
                "destination": "any",
                "destination_port": "8080",
                "description": "Updated test rule",
                "log": True
            }
            self.test(
                f"PUT /firewall-rules/{created_rule_id}",
                "PUT",
                f"firewall-rules/{created_rule_id}",
                200,
                token=self.admin_token,
                data=update_data
            )

            # Test delete rule
            self.test(
                f"DELETE /firewall-rules/{created_rule_id}",
                "DELETE",
                f"firewall-rules/{created_rule_id}",
                200,
                token=self.admin_token
            )

        # Test reorder (just verify endpoint accepts request)
        success, response = self.test(
            "GET /firewall-rules/ for reorder test",
            "GET",
            "firewall-rules/",
            200,
            token=self.admin_token
        )
        if success and isinstance(response, list) and len(response) >= 2:
            rule_ids = [r['id'] for r in response[:3]]
            rule_ids_reversed = list(reversed(rule_ids))
            self.test(
                "POST /firewall-rules/reorder",
                "POST",
                "firewall-rules/reorder",
                200,
                token=self.admin_token,
                data={"ids": rule_ids_reversed}
            )

    def test_other_modules(self):
        """Test other module endpoints (NAT, Aliases, DNS, DHCP, Interfaces, VPN)"""
        self.log("=" * 60, "INFO")
        self.log("TESTING OTHER MODULES", "INFO")
        self.log("=" * 60, "INFO")

        # Test Aliases
        self.test("GET /aliases/", "GET", "aliases/", 200, token=self.admin_token)

        # Test Interfaces
        self.test("GET /interfaces/", "GET", "interfaces/", 200, token=self.admin_token)

        # Test NAT
        self.test("GET /nat/", "GET", "nat/", 200, token=self.admin_token)

        # Test VPN
        self.test("GET /vpn/", "GET", "vpn/", 200, token=self.admin_token)

        # Test DHCP config
        self.test("GET /dhcp/config", "GET", "dhcp/config", 200, token=self.admin_token)

        # Test DHCP leases
        self.test("GET /dhcp/leases", "GET", "dhcp/leases", 200, token=self.admin_token)

        # Test DNS config
        self.test("GET /dns/config", "GET", "dns/config", 200, token=self.admin_token)

        # Test DNS records
        self.test("GET /dns/records", "GET", "dns/records", 200, token=self.admin_token)

    def test_users(self):
        """Test users CRUD and RBAC"""
        self.log("=" * 60, "INFO")
        self.log("TESTING USERS", "INFO")
        self.log("=" * 60, "INFO")

        # Test list users
        success, response = self.test(
            "GET /users/",
            "GET",
            "users/",
            200,
            token=self.admin_token
        )
        if success and isinstance(response, list):
            self.log(f"Users returned {len(response)} users", "INFO")

        # Test create user (admin)
        new_user_data = {
            "email": f"testuser_{datetime.now().strftime('%H%M%S')}@firewall.local",
            "name": "Test User",
            "role": "viewer",
            "password": "TestPass@123",
            "enabled": True
        }
        success, response = self.test(
            "POST /users/ (admin)",
            "POST",
            "users/",
            200,
            token=self.admin_token,
            data=new_user_data
        )
        created_user_id = response.get('id') if success else None

        # Test create user (viewer - should fail)
        self.test(
            "POST /users/ (viewer - should be 403)",
            "POST",
            "users/",
            403,
            token=self.viewer_token,
            data=new_user_data
        )

        if created_user_id:
            # Test update user
            self.test(
                f"PUT /users/{created_user_id}",
                "PUT",
                f"users/{created_user_id}",
                200,
                token=self.admin_token,
                data={"name": "Updated Test User", "role": "operator"}
            )

            # Test delete user
            self.test(
                f"DELETE /users/{created_user_id}",
                "DELETE",
                f"users/{created_user_id}",
                200,
                token=self.admin_token
            )

        # Test cannot delete self
        success, me_response = self.test(
            "GET /auth/me to get admin ID",
            "GET",
            "auth/me",
            200,
            token=self.admin_token
        )
        if success and 'id' in me_response:
            admin_id = me_response['id']
            self.test(
                f"DELETE /users/{admin_id} (self - should be 400)",
                "DELETE",
                f"users/{admin_id}",
                400,
                token=self.admin_token
            )

    def test_export(self):
        """Test export endpoints"""
        self.log("=" * 60, "INFO")
        self.log("TESTING EXPORT", "INFO")
        self.log("=" * 60, "INFO")

        # Test nftables export
        url = f"{self.base_url}/export/nftables"
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        try:
            response = requests.get(url, headers=headers, timeout=10)
            self.tests_run += 1
            if response.status_code == 200:
                content = response.text
                if content.startswith('#!/usr/sbin/nft -f') and 'table inet firewall' in content:
                    self.tests_passed += 1
                    self.log("✅ PASSED - nftables export returns valid script", "PASS")
                else:
                    self.tests_failed += 1
                    self.log("❌ FAILED - nftables export content invalid", "FAIL")
                    self.failures.append("GET /export/nftables: Content does not start with shebang or missing table")
            else:
                self.tests_failed += 1
                self.log(f"❌ FAILED - Expected 200, got {response.status_code}", "FAIL")
                self.failures.append(f"GET /export/nftables: Expected 200, got {response.status_code}")
        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - Exception: {str(e)}", "FAIL")
            self.failures.append(f"GET /export/nftables: {str(e)}")

        # Test iptables export
        url = f"{self.base_url}/export/iptables"
        try:
            response = requests.get(url, headers=headers, timeout=10)
            self.tests_run += 1
            if response.status_code == 200:
                content = response.text
                if content.startswith('#!/bin/bash') and 'iptables' in content:
                    self.tests_passed += 1
                    self.log("✅ PASSED - iptables export returns valid script", "PASS")
                else:
                    self.tests_failed += 1
                    self.log("❌ FAILED - iptables export content invalid", "FAIL")
                    self.failures.append("GET /export/iptables: Content does not start with #!/bin/bash or missing iptables")
            else:
                self.tests_failed += 1
                self.log(f"❌ FAILED - Expected 200, got {response.status_code}", "FAIL")
                self.failures.append(f"GET /export/iptables: Expected 200, got {response.status_code}")
        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - Exception: {str(e)}", "FAIL")
            self.failures.append(f"GET /export/iptables: {str(e)}")

    def run_all_tests(self):
        """Run all test suites"""
        self.log("=" * 60, "INFO")
        self.log("FIREWALL CONSOLE BACKEND API TESTING", "INFO")
        self.log(f"Base URL: {self.base_url}", "INFO")
        self.log("=" * 60, "INFO")

        # Run test suites
        if not self.test_auth():
            self.log("CRITICAL: Authentication failed - stopping tests", "ERROR")
            return 1

        self.test_metrics()
        self.test_logs()
        self.test_firewall_rules()
        self.test_other_modules()
        self.test_users()
        self.test_export()

        # Print summary
        self.log("=" * 60, "INFO")
        self.log("TEST SUMMARY", "INFO")
        self.log("=" * 60, "INFO")
        self.log(f"Total Tests: {self.tests_run}", "INFO")
        self.log(f"Passed: {self.tests_passed}", "PASS")
        self.log(f"Failed: {self.tests_failed}", "FAIL")
        
        if self.tests_failed > 0:
            self.log("=" * 60, "INFO")
            self.log("FAILURES:", "ERROR")
            for failure in self.failures:
                self.log(f"  - {failure}", "ERROR")

        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%", "INFO")
        self.log("=" * 60, "INFO")

        return 0 if self.tests_failed == 0 else 1


if __name__ == "__main__":
    tester = FirewallAPITester()
    sys.exit(tester.run_all_tests())
