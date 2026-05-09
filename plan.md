# plan.md (Updated)

## Objectives
- Deliver a pfSense-like **web management UI** (not an OS) for Ubuntu 24: **FastAPI + React + MongoDB**.
- Provide **bilingual UI (PT/EN)** with instant language toggle.
- Implement modules: **Dashboard (live metrics)**, **Firewall Rules**, **NAT**, **VPN (OpenVPN/WireGuard)**, **DHCP**, **DNS**, **Aliases**, **Interfaces**, **Logs**, **Users/Roles**.
- Operate in **Simulation/Demo mode** (Mongo-backed state + realistic simulated metrics/logs), plus **export** of nftables/iptables scripts.
- Ship polished **dark NOC/SOC premium** theme (cyan/emerald accents, glass surfaces, monospace numerics).

**Current status:** Objectives above are **implemented and verified end-to-end** (Phase 2 complete, 100% test pass).

## Phase 1: Core Flow POC (skipped)
- No external/high-risk integrations (no real nftables execution in preview, no OAuth). Core is standard CRUD + JWT + simulated telemetry.
- Proceeded directly to V1 build.

## Phase 2: V1 App Development (MVP, end-to-end working) — ✅ COMPLETE
### User stories (V1)
1. As a user, I can log in with email/senha and receive a JWT to access the system. ✅
2. As a user, I can switch UI language PT/EN instantly. ✅
3. As a user, I see a dashboard with live-updating metrics (CPU/RAM, tráfego, conexões, bloqueios). ✅
4. As an admin/operator, I can create/edit/enable/disable firewall rules and reorder priority. ✅
5. As an admin, I can export the current config as **nftables.conf** and **iptables.sh**. ✅

### Backend (FastAPI) — ✅ COMPLETE
- Project structure implemented under `/app/backend` with modular routers.
- Mongo collections implemented/used: users, firewall_rules, nat_rules, vpn_configs, dhcp_config, dhcp_leases, dns_config, dns_records, aliases, interfaces, logs, metrics_samples.
- Auth: email/password (bcrypt) + JWT (access token), role-based guards (**admin/operator/viewer**). ✅
- Seeded users:
  - `admin@firewall.local / Admin@123`
  - `operator@firewall.local / Operator@123`
  - `viewer@firewall.local / Viewer@123`
- Routers implemented (12):
  - `/auth` (login, me)
  - `/users` (admin-only writes)
  - `/metrics` (live, summary)
  - `/logs` (filter/search)
  - `/firewall-rules` (CRUD, toggle, reorder)
  - `/nat` (CRUD)
  - `/vpn` (CRUD + peers)
  - `/dhcp` (config + leases)
  - `/dns` (resolver config + records CRUD)
  - `/aliases` (CRUD)
  - `/interfaces` (CRUD + toggle)
  - `/export` (nftables + iptables)
- Simulator service:
  - Background task generates plausible metrics and logs every ~2s and updates interface counters.
  - Retention trimming for metrics/logs.
- Script export:
  - Deterministic generators from Mongo state.
  - Aliases resolved into export output.
- Testing agent result: **Backend 100% pass (36/36)**.
- Minor fix applied: user creation returns safe JSON by dropping `_id` prior to response.

### Frontend (React) — ✅ COMPLETE
- Stack: React (CRA) + react-router-dom + shadcn/ui + Tailwind, recharts, lucide-react, axios, sonner toasts, framer-motion, i18next.
- UX shell:
  - Sidebar grouped (Overview / Network / Firewall / Services / Monitoring / Administration).
  - Topbar includes PT/EN toggle + user menu (logout) + role badge.
- Theme:
  - Dark NOC/SOC premium theme tokens applied.
  - Fonts: **Space Grotesk** (UI) + **JetBrains Mono** (IPs/ports/logs/code/numerics).
- Screens implemented (all modules functional):
  - Login (split layout)
  - Dashboard (6 KPIs + traffic/resources/events charts + recent events + secondary KPIs)
  - Firewall Rules (table, toggle, create/edit sheet, delete, drag reorder via @dnd-kit)
  - NAT (CRUD + sheet)
  - VPN (WireGuard/OpenVPN tabs, peers add/remove)
  - DHCP (config edit + leases CRUD)
  - DNS (resolver config + records CRUD)
  - Aliases (cards + CRUD)
  - Interfaces (cards + live RX/TX; admin toggle)
  - Logs (live tail with pause/resume + severity filter + search)
  - Users (admin-only; CRUD; cannot delete self)
  - Export (nftables/iptables preview + copy/download)
- Data layer:
  - Axios JWT interceptor
  - Polling hooks updating metrics/logs every ~2–3s.
- Testing agent result: **All critical flows verified**, including navigation, RBAC, exports, i18n.

### Conclude Phase 2 — ✅ COMPLETE
- End-to-end testing via `testing_agent_v3`: **overall 100%**.
- One minor backend serialization issue fixed.

## Phase 3: Feature Completion + Hardening (optional enhancements)
> Note: Many Phase 3 goals are already met at MVP level (RBAC, full module coverage). This phase is now focused on **depth**, **validation**, **alerts**, and **operator productivity**.

### User stories (Phase 3)
1. As an admin, I can manage users/roles with stronger safeguards (audit trail, password policy, optional 2FA). 
2. As an admin/operator, I get better validation and ergonomics across all modules (CIDR/IP/port/MAC validators, duplicates, bulk actions).
3. As an operator, I can use an **Alerts** view derived from logs (bursts, port scans, brute force patterns).
4. As an admin, I can manage Interfaces with richer settings (VLAN tags, DHCP relay toggles, interface groups) in simulation.
5. As an admin, Aliases are first-class rule inputs (autocomplete, validation) and export shows resolved values + original alias.

### Work items
- Stronger validation for:
  - Firewall rules (CIDR/IP/alias refs, port ranges, protocol-specific fields)
  - NAT (port collisions, interface restrictions)
  - DNS (record constraints)
  - DHCP (range validation)
- Alerts pipeline:
  - Derive alerts from critical/warning patterns and event rate thresholds.
  - Alerts dashboard + acknowledge workflow.
- UX enhancements:
  - Global search (rule/id/ip) via command palette.
  - Pagination + indexing for logs.
  - Bulk actions on rules.
  - Better empty states and inline help.

### Conclude Phase 3
- Run a new testing_agent_v3 pass including validation/alerts and any new workflows.
- Stabilize and document changes.

## Phase 4: Production-readiness + Packaging
### User stories (Phase 4)
1. As an admin, I can backup/restore full configuration (JSON export/import with versioning).
2. As an operator, I can export logs and run advanced search (time range, filters, correlation id).
3. As an admin, I can configure simulator settings (rate, retention, noise profiles) in UI.
4. As a user, I can deploy reliably via **Docker Compose** on Ubuntu 24 (frontend + backend + mongo).
5. As an admin, I can harden security (rate limiting, CORS allowlist, optional HTTPS, environment-based secrets).

### Work items
- Config import/export (JSON) + versioning/migrations.
- Log retention policies + server-side pagination + search indexes.
- Docker Compose + env docs + one-command startup.
- Security improvements:
  - Password policy + login rate limits
  - CORS tightening and secret management
  - Optional refresh tokens

### Conclude Phase 4
- Final testing_agent_v3 run covering backup/restore, deploy readiness, log export.
- Fix all critical issues.

## Implementation Steps (high-level sequence)
1. **(Completed)** Scaffold backend + Mongo connection + seed users + JWT auth.
2. **(Completed)** Implement CRUD across all modules + RBAC.
3. **(Completed)** Add simulator generating metrics/logs + interface counters.
4. **(Completed)** Build frontend AppShell + login + dashboard + all module pages.
5. **(Completed)** Implement firewall rule reorder + export preview/download.
6. **(Completed)** Verify i18n PT/EN and RBAC flows.
7. **(Completed)** End-to-end testing with testing_agent_v3; apply fixes.
8. **(Next, optional)** Phase 3: validation + alerts + productivity enhancements.
9. **(Next, optional)** Phase 4: backup/restore + Docker packaging + hardening.

## Next Actions
- (Optional) Decide if you want to proceed with:
  - **Phase 3** (alerts, deeper validations, power-user UX)
  - **Phase 4** (backup/restore + Docker Compose deployment + security hardening)
- Confirm preferred branding/name (if you want to rename from “Firewall Console”).

## Success Criteria
- ✅ User can log in (admin/operator/viewer), navigate all modules, and log out.
- ✅ Dashboard metrics and logs update live with plausible simulation.
- ✅ Firewall rules support CRUD, enable/disable, and reorder; changes reflected in export.
- ✅ Export downloads nftables + iptables scripts without errors.
- ✅ PT/EN toggle works across the UI.
- ✅ testing_agent_v3 passes end-to-end flows for key stories with no critical bugs.