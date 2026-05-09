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
                    # Check for NAT rules (Phase 3)
                    if 'masquerade' in content.lower() or 'dnat' in content.lower():
                        self.log("✅ nftables export includes NAT rules", "INFO")
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
                    # Check for NAT rules (Phase 3)
                    if 'MASQUERADE' in content or 'DNAT' in content:
                        self.log("✅ iptables export includes NAT rules", "INFO")
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

    def test_phase3_attacks_and_block_page(self):
        """Test Phase 3: Attack Analysis, Block Page, and NAT Outbound"""
        self.log("=" * 60, "INFO")
        self.log("TESTING PHASE 3: ATTACKS & BLOCK PAGE", "INFO")
        self.log("=" * 60, "INFO")

        # Test GET /attacks/ with default params
        success, response = self.test(
            "GET /attacks/ (default)",
            "GET",
            "attacks/",
            200,
            token=self.admin_token
        )
        if success:
            if 'items' in response and 'total' in response and 'window_minutes' in response:
                self.log(f"Attacks returned {response['total']} attackers in {response['window_minutes']} min window", "INFO")
                # Check structure of first item if exists
                if response['items']:
                    item = response['items'][0]
                    required_fields = ['src_ip', 'src_hostname', 'src_country', 'src_flag', 'direction', 
                                     'attack_types', 'count', 'severity_max', 'targets', 'is_blocked']
                    missing = [f for f in required_fields if f not in item]
                    if missing:
                        self.failures.append(f"GET /attacks/: Missing fields in item: {missing}")
                    else:
                        self.log("✅ Attack item structure is correct", "INFO")
            else:
                self.failures.append("GET /attacks/: Missing required fields (items, total, window_minutes)")

        # Test GET /attacks/ with direction filter
        for direction in ['internal', 'external', 'all']:
            self.test(
                f"GET /attacks/?direction={direction}",
                "GET",
                "attacks/",
                200,
                token=self.admin_token,
                params={"direction": direction}
            )

        # Test GET /attacks/ with severity filter
        for severity in ['warning', 'critical', 'all']:
            self.test(
                f"GET /attacks/?severity={severity}",
                "GET",
                "attacks/",
                200,
                token=self.admin_token,
                params={"severity": severity}
            )

        # Test GET /attacks/ with window filter
        for minutes in [5, 15, 60, 120]:
            self.test(
                f"GET /attacks/?minutes={minutes}",
                "GET",
                "attacks/",
                200,
                token=self.admin_token,
                params={"minutes": minutes}
            )

        # Test GET /attacks/summary
        success, response = self.test(
            "GET /attacks/summary",
            "GET",
            "attacks/summary",
            200,
            token=self.admin_token
        )
        if success:
            required_fields = ['unique_attackers', 'total_blocked_events', 'attack_types', 
                             'severity_counts', 'currently_blocked_ips', 'window_minutes']
            missing = [f for f in required_fields if f not in response]
            if missing:
                self.failures.append(f"GET /attacks/summary: Missing fields: {missing}")
            else:
                self.log(f"✅ Summary: {response['unique_attackers']} attackers, {response['currently_blocked_ips']} blocked", "INFO")

        # Test POST /attacks/block (admin - should work)
        test_ip = "203.0.113.99"
        success, response = self.test(
            "POST /attacks/block (admin)",
            "POST",
            "attacks/block",
            200,
            token=self.admin_token,
            data={
                "ip": test_ip,
                "hostname": "test-attacker.example.com",
                "reason": "Automated test block",
                "redirect_to_block_page": True
            }
        )
        if success:
            if 'ok' in response and response['ok']:
                self.log(f"✅ IP {test_ip} blocked successfully", "INFO")
            else:
                self.failures.append("POST /attacks/block: Response missing 'ok' field or ok=False")

        # Test POST /attacks/block (operator - should work)
        test_ip_operator = "203.0.113.100"
        self.test(
            "POST /attacks/block (operator)",
            "POST",
            "attacks/block",
            200,
            token=self.operator_token,
            data={
                "ip": test_ip_operator,
                "hostname": "test-attacker2.example.com",
                "reason": "Operator test block",
                "redirect_to_block_page": False
            }
        )

        # Test POST /attacks/block (viewer - should fail with 403)
        self.test(
            "POST /attacks/block (viewer - should be 403)",
            "POST",
            "attacks/block",
            403,
            token=self.viewer_token,
            data={
                "ip": "203.0.113.101",
                "hostname": "test.example.com",
                "reason": "Should fail",
                "redirect_to_block_page": True
            }
        )

        # Test GET /attacks/blocked-list
        success, response = self.test(
            "GET /attacks/blocked-list",
            "GET",
            "attacks/blocked-list",
            200,
            token=self.admin_token
        )
        if success:
            if 'addresses' in response and isinstance(response['addresses'], list):
                self.log(f"✅ Blocked list contains {len(response['addresses'])} IPs", "INFO")
                if test_ip in response['addresses']:
                    self.log(f"✅ Test IP {test_ip} is in blocked list", "INFO")
            else:
                self.failures.append("GET /attacks/blocked-list: Missing 'addresses' array")

        # Test POST /attacks/unblock
        success, response = self.test(
            "POST /attacks/unblock",
            "POST",
            "attacks/unblock",
            200,
            token=self.admin_token,
            data={"ip": test_ip}
        )
        if success and response.get('ok'):
            self.log(f"✅ IP {test_ip} unblocked successfully", "INFO")

        # Test GET /block-page/ (PUBLIC - no auth)
        url = f"{self.base_url}/block-page/"
        try:
            response = requests.get(url, timeout=10)
            self.tests_run += 1
            if response.status_code == 200:
                data = response.json()
                if 'config' in data and 'visitor' in data:
                    self.tests_passed += 1
                    self.log("✅ PASSED - Public block page accessible without auth", "PASS")
                    visitor = data['visitor']
                    if 'ip' in visitor and 'reference_id' in visitor and 'timestamp' in visitor:
                        self.log("✅ Visitor info includes ip, reference_id, timestamp", "INFO")
                    else:
                        self.failures.append("GET /block-page/: Visitor info missing required fields")
                else:
                    self.tests_failed += 1
                    self.failures.append("GET /block-page/: Missing 'config' or 'visitor' fields")
            else:
                self.tests_failed += 1
                self.failures.append(f"GET /block-page/: Expected 200, got {response.status_code}")
        except Exception as e:
            self.tests_failed += 1
            self.failures.append(f"GET /block-page/: {str(e)}")

        # Test GET /block-page/admin (auth required)
        success, response = self.test(
            "GET /block-page/admin (with auth)",
            "GET",
            "block-page/admin",
            200,
            token=self.admin_token
        )

        # Test GET /block-page/admin (no auth - should fail)
        self.test(
            "GET /block-page/admin (no auth - should be 401)",
            "GET",
            "block-page/admin",
            401
        )

        # Test PUT /block-page/admin (admin - should work)
        block_page_config = {
            "title": "Access Blocked - Test",
            "headline": "You have been blocked by the firewall",
            "message": "Your connection was automatically blocked due to security policy violation.",
            "contact_email": "security@test.local",
            "support_url": "https://support.test.local",
            "organization": "Test Firewall Console",
            "reference_id_visible": True,
            "show_reason": True,
            "show_ip": True,
            "accent_color": "#f87171"
        }
        success, response = self.test(
            "PUT /block-page/admin (admin)",
            "PUT",
            "block-page/admin",
            200,
            token=self.admin_token,
            data=block_page_config
        )
        if success:
            self.log("✅ Block page config updated successfully", "INFO")

        # Test PUT /block-page/admin (viewer - should fail with 403)
        self.test(
            "PUT /block-page/admin (viewer - should be 403)",
            "PUT",
            "block-page/admin",
            403,
            token=self.viewer_token,
            data=block_page_config
        )

        # Test GET /nat/?direction=outbound
        success, response = self.test(
            "GET /nat/?direction=outbound",
            "GET",
            "nat/",
            200,
            token=self.admin_token,
            params={"direction": "outbound"}
        )
        if success and isinstance(response, list):
            outbound_count = len(response)
            self.log(f"✅ NAT outbound rules: {outbound_count}", "INFO")
            # Check if any rule has nat_to=masquerade
            masquerade_rules = [r for r in response if r.get('nat_to') == 'masquerade']
            if masquerade_rules:
                self.log(f"✅ Found {len(masquerade_rules)} MASQUERADE rules", "INFO")

        # Test GET /nat/?direction=inbound
        success, response = self.test(
            "GET /nat/?direction=inbound",
            "GET",
            "nat/",
            200,
            token=self.admin_token,
            params={"direction": "inbound"}
        )
        if success and isinstance(response, list):
            self.log(f"✅ NAT inbound rules: {len(response)}", "INFO")

        # Test POST /nat/auto-outbound (admin - should work)
        success, response = self.test(
            "POST /nat/auto-outbound (admin - first call)",
            "POST",
            "nat/auto-outbound",
            200,
            token=self.admin_token
        )
        if success:
            if 'created' in response and 'count' in response:
                self.log(f"✅ Auto-outbound created {response['count']} rules", "INFO")
            else:
                self.failures.append("POST /nat/auto-outbound: Missing 'created' or 'count' fields")

        # Test POST /nat/auto-outbound (idempotent - second call should create 0)
        success, response = self.test(
            "POST /nat/auto-outbound (idempotent - second call)",
            "POST",
            "nat/auto-outbound",
            200,
            token=self.admin_token
        )
        if success:
            if response.get('count') == 0:
                self.log("✅ Auto-outbound is idempotent (no duplicates)", "INFO")
            else:
                self.log(f"⚠️  Auto-outbound created {response.get('count')} rules on second call (expected 0)", "WARN")

        # Test POST /nat/auto-outbound (operator - should work)
        self.test(
            "POST /nat/auto-outbound (operator)",
            "POST",
            "nat/auto-outbound",
            200,
            token=self.operator_token
        )

        # Test POST /nat/auto-outbound (viewer - should fail with 403)
        self.test(
            "POST /nat/auto-outbound (viewer - should be 403)",
            "POST",
            "nat/auto-outbound",
            403,
            token=self.viewer_token
        )

    def run_all_tests(self):
        """Run all test suites"""
        self.log("=" * 60, "INFO")
        self.log("FIREWALL CONSOLE BACKEND API TESTING - PHASE 3", "INFO")
        self.log(f"Base URL: {self.base_url}", "INFO")
        self.log("=" * 60, "INFO")

        # Run test suites
        if not self.test_auth():
            self.log("CRITICAL: Authentication failed - stopping tests", "ERROR")
            return 1

        # Quick smoke tests for existing modules
        self.log("Running quick smoke tests for existing modules...", "INFO")
        self.test_metrics()
        self.test_logs()
        
        # Phase 3 focus: Attack Analysis, Block Page, NAT Outbound
        self.test_phase3_attacks_and_block_page()
        
        # Other modules
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
