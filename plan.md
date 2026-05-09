# plan.md

## Objectives
- Deliver a pfSense-like **web management UI** (not an OS) for Ubuntu 24: **FastAPI + React + MongoDB**.
- Provide **bilingual UI (PT/EN)** with instant language toggle.
- Implement modules: Dashboard (live metrics), Firewall Rules, NAT, VPN (OpenVPN/WireGuard), DHCP, DNS, Aliases, Interfaces, Logs/Alerts, Users/Roles.
- Operate in **Simulation/Demo mode** (Mongo-backed data + realistic simulated metrics/logs), plus **export** nftables/iptables scripts.
- Ship polished **dark NOC/SOC premium** theme (cyan/emerald accents, glass panels, monospace numerics).

## Phase 1: Core Flow POC (skipped)
- No external/high-risk integrations (no real nftables execution, no OAuth, no payments). Core is standard CRUD + JWT + simulated streaming.
- Proceed directly to V1 app build.

## Phase 2: V1 App Development (MVP, end-to-end working)
### User stories (V1)
1. As a user, I can log in with email/senha and receive a JWT to access the system.
2. As a user, I can switch UI language PT/EN instantly.
3. As a user, I see a dashboard with live-updating metrics (CPU/RAM, tráfego, conexões, bloqueios).
4. As an admin/operator, I can create/edit/enable/disable firewall rules and reorder priority.
5. As an admin, I can export the current config as **nftables.conf** and **iptables.sh**.

### Backend (FastAPI)
- Project skeleton: `/backend/app` with routers, services, models, auth, i18n labels (if needed), and seed.
- Mongo collections: users, firewall_rules, nat_rules, vpn_configs, dhcp_config, dhcp_leases, dns_config, dns_records, aliases, interfaces, logs, alerts, metrics_samples.
- Auth: email/password (bcrypt) + JWT (access token), role-based guards (admin/operator/viewer).
- Seed default admin: `admin@firewall.local / Admin@123`.
- Core APIs under `/api`:
  - `/auth/login`, `/auth/me`, `/auth/logout` (client-side), `/users/*`
  - `/metrics/live` (WS or polling), `/logs/live` (WS or polling)
  - CRUD: `/firewall-rules`, `/nat`, `/vpn`, `/dhcp`, `/dns`, `/aliases`, `/interfaces`
  - `/export/nftables`, `/export/iptables`
- Simulator service:
  - Background task generates metrics + logs based on “enabled rules”, interfaces, and random-but-plausible traffic.
  - Store recent samples for charts; stream deltas via WebSocket (fallback polling).
- Script export:
  - Deterministic template generator from Mongo state; include comments + rule ordering.

### Frontend (React)
- Stack: React + react-router-dom + shadcn/ui + Tailwind, recharts, lucide-react, axios, react-i18next.
- UX shell:
  - Left sidebar modules + top bar (language toggle, user menu).
  - Dark NOC theme tokens; Inter + JetBrains Mono for numbers/IPs.
- Screens (V1):
  - Login
  - Dashboard (live charts/cards)
  - Firewall Rules (table + create/edit drawer + enable toggle + drag reorder)
  - Logs (live tail + filters)
  - Export (download buttons + preview)
  - Basic pages for remaining modules with “MVP CRUD” forms (NAT/VPN/DHCP/DNS/Aliases/Interfaces/Users)
- Data layer:
  - Axios JWT interceptor, centralized API client.
  - WebSocket hook with reconnect + fallback polling.

### Conclude Phase 2
- Run 1 round of end-to-end testing with testing_agent_v3 focusing on login, dashboard updates, rule CRUD/reorder, logs, export.
- Fix all blockers found.

## Phase 3: Feature Completion + Hardening (expand modules to “pfSense-like” depth)
### User stories (Phase 3)
1. As an admin, I can manage users and assign roles; viewers are read-only.
2. As an admin, I can manage NAT port forwards with validation (ports/protocols).
3. As an admin, I can configure VPN (OpenVPN/WireGuard) and see simulated peers/status.
4. As an admin, I can configure DHCP pool and view simulated leases.
5. As an admin/operator, I can manage DNS records and resolver settings.

### Work items
- Implement role restrictions per route/action (viewer read-only; operator can edit rules; admin full).
- Improve forms/validation for all modules (ports, CIDR, IP/MAC formats, duplicates).
- Alerts pipeline: derive alerts from log severity bursts (e.g., repeated blocks, port scans).
- Interfaces page: status + traffic counters + enable/disable (simulated) + tagging (LAN/WAN/OPT).
- Aliases integration: allow rule fields to reference alias names; resolve in export.
- Polish UX: empty states, error states, optimistic updates where safe.

### Conclude Phase 3
- Run testing_agent_v3 for full module coverage and RBAC checks.
- Fix regressions and stabilize.

## Phase 4: Production-readiness + Packaging
### User stories (Phase 4)
1. As an admin, I can configure environment settings (sim rate, retention) from UI.
2. As an operator, I can search/filter logs quickly and export them.
3. As an admin, I can backup/restore configuration (JSON export/import).
4. As a user, I can use the app reliably after refresh (token persistence + guarded routes).
5. As an admin, I can deploy via Docker Compose on Ubuntu 24.

### Work items
- Config import/export (JSON) + migrations/versions.
- Log retention + pagination + search indexes.
- Docker Compose (frontend, backend, mongo) + seed script + env docs.
- Security basics: password policy, rate limit login, CORS tightening.

### Conclude Phase 4
- Run final testing_agent_v3 round; fix all critical issues.

## Implementation Steps (high-level sequence)
1. Scaffold backend + Mongo connection + seed admin + JWT auth.
2. Add core CRUD for firewall rules + rule ordering + export generator.
3. Add simulator + live metrics/logs streaming.
4. Build frontend shell + login + dashboard + rules + logs + export.
5. Add remaining modules CRUD + RBAC + validation + bilingual strings.
6. Hardening: alerts, import/export, Docker deploy.

## Next Actions
- Confirm final naming/branding for UI (app name + sidebar labels).
- Start Phase 2 implementation: repo structure + backend auth/seed + frontend login/shell first.

## Success Criteria
- User can log in (seeded admin), navigate all modules, and log out.
- Dashboard metrics and logs update live (WS or polling) with plausible simulation.
- Firewall rules support CRUD, enable/disable, and reorder; changes reflected in export.
- Export downloads nftables + iptables scripts without errors.
- PT/EN toggle works across the UI.
- testing_agent_v3 passes end-to-end flows for all key user stories without critical bugs.
