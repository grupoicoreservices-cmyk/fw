<div align="center">

# 🛡️ Firewall Console

**Painel web de firewall moderno para Ubuntu 24** — alternativa de UI ao pfSense, com aplicação real de regras `nftables`, análise de ataques em tempo real, NAT entrada/saída automático, página de bloqueio customizável e VPN/DHCP/DNS.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ubuntu 24](https://img.shields.io/badge/Ubuntu-24.04-E95420?logo=ubuntu&logoColor=white)](https://ubuntu.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)

</div>

---

## ⚡ Instalação rápida no Ubuntu 24

```bash
curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/firewall-console/main/quick-install.sh | sudo bash
```

> Substitua `SEU_USUARIO` pelo seu usuário do GitHub. O script:
> 1. Instala Docker + Docker Compose se necessário
> 2. Clona este repo em `/opt/firewall-console`
> 3. Habilita IP forwarding e módulos `nf_tables`
> 4. Gera `JWT_SECRET` aleatório e cria `.env`
> 5. Faz build e sobe a stack

Fim: acesse `http://<IP-do-servidor>` → login `admin@firewall.local` / `Admin@123` → **TROQUE A SENHA**.

Prefere fazer manual?
```bash
git clone https://github.com/SEU_USUARIO/firewall-console.git /opt/firewall-console
cd /opt/firewall-console
sudo bash install.sh
```

---

## ✨ Funcionalidades

### 🌐 Rede
- **Interfaces**: WAN/LAN/OPT com status UP/DOWN ao vivo, RX/TX em tempo real, MAC, MTU, IPv4, gateway
- **Aliases**: grupos nomeados de IPs/redes para reuso em regras (`WEB_SERVERS`, `BLOCKED_COUNTRIES`, etc.)
- **DHCP Server**: configuração de pool + leases + reservas estáticas
- **DNS Resolver**: forwarders, DNSSEC, listas de bloqueio + registros A/AAAA/CNAME/MX/TXT

### 🔥 Firewall
- **Regras** com drag-to-reorder de prioridade, allow/block/reject, por interface, direção, protocolo, origem, destino, portas, log
- **NAT entrada (DNAT)** — port forwarding
- **NAT saída (SNAT/MASQUERADE)** com botão **"Auto-criar saída"** (gera MASQUERADE para todas as WANs)
- **Aplicação REAL** no host (`nft -f`) com **backup automático** e **rollback** com 1 clique
- **Export** `nftables.conf` e `iptables.sh` prontos para `sudo nft -f` ou `sudo bash`

### 🚨 Análise de Ataques
- **Visão agregada** (15 min / 1h / 2h) por IP, hostname, país (com bandeiras), tipo de ataque (Port Scan, Brute Force, SQL Injection, Malware C2, etc.), contagem de hits
- **Live Feed** em tempo real (poll 1.5s) com animação de entrada — eventos individuais com botão **Bloquear**
- **Bloqueio em 1 clique** → adiciona IP a `BLOCKED_ATTACKERS`, cria regra de firewall, e opcionalmente cria NAT redirect para a página de bloqueio
- Filtros por origem (interno/externo) e severidade

### 🔐 VPN
- **WireGuard** + **OpenVPN** servers com peers, status conectado/desconectado, último handshake
- Adicionar/remover peers pela UI

### 📄 Página de Bloqueio Pública
- Página customizável (título, mensagem, contato, cor, organização) exibida a clientes bloqueados (`/blocked`)
- Mostra IP do visitante, ID de referência único, data/hora
- Pré-visualização ao vivo no editor

### 👥 Administração
- **Auth JWT** com **3 papéis**: admin / operator / viewer (RBAC enforçado backend e frontend)
- **Logs em tempo real** com filtro por severidade, interface, ação, busca textual, pause/resume

### 🎨 UI/UX
- **Tema claro/escuro** com toggle persistido
- **Bilíngue PT/EN** com toggle instantâneo
- Design **NOC/SOC premium** com Space Grotesk + JetBrains Mono
- Charts em tempo real (Recharts), animações sutis (framer-motion)
- Densidade de dados profissional, monospace para IPs/MACs/portas

---

## 📷 Screenshots

```
Dashboard         /                      # 6 KPIs ao vivo + 3 gráficos + recent events
Firewall Rules    /firewall              # Drag-reorder, ALLOW/BLOCK badges, log toggle
Attack Analysis   /attacks               # Aggregated + Live Feed (real-time)
NAT               /nat                   # Inbound + Outbound tabs + Auto-MASQUERADE
VPN               /vpn                   # WireGuard + OpenVPN peers
Logs              /logs                  # Live tail with filters
Export / Apply    /export                # nftables.conf preview + Apply on host + Rollback
Block Page (pub)  /blocked               # Página pública de bloqueio (sem auth)
Block Page admin  /block-page            # Editor com preview ao vivo (admin)
```

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────┐
│              Ubuntu 24 host                  │
│                                              │
│   Browser ──http://server-ip──▶ frontend     │
│                                 (nginx :80)  │
│                                       │      │
│                                /api/*│       │
│                                       ▼      │
│   ┌─────────┐    ┌──────────────────────┐   │
│   │ mongo   │◀───│ backend (FastAPI)    │   │
│   │ :27117  │    │ :8001 + NET_ADMIN    │   │
│   └─────────┘    └──────────┬───────────┘   │
│   (loopback)                │ nft -f         │
│                              ▼                │
│                      ┌────────────────┐      │
│                      │ kernel nftables│      │
│                      └────────────────┘      │
└─────────────────────────────────────────────┘

Todos os 3 serviços rodam em network_mode: host.
Mongo escuta apenas em 127.0.0.1.
```

**Stack:**
- **Backend:** Python 3.11 + FastAPI + Motor (MongoDB async) + PyJWT + bcrypt
- **Frontend:** React 19 + Tailwind + shadcn/ui + Recharts + framer-motion + react-i18next
- **Banco:** MongoDB 7
- **Reverse proxy:** Nginx alpine
- **Aplicação real:** `nftables` via subprocess com CAP_NET_ADMIN

---

## 🧰 Comandos úteis

```bash
cd /opt/firewall-console

docker compose ps                  # status
docker compose logs -f             # logs ao vivo
docker compose logs -f backend     # só backend
docker compose restart             # reiniciar
docker compose down                # parar
docker compose down -v             # parar + apagar volumes

# Atualizar para a última versão do GitHub:
cd /opt/firewall-console
git pull
docker compose pull
docker compose up -d --build

# Backup manual do MongoDB
docker compose exec mongo mongodump --port 27117 --out /data/db/backup-$(date +%F)

# Ver ruleset nftables atual aplicado no host
sudo nft list ruleset

# 🚨 Emergência (você se trancou fora):
sudo nft flush ruleset             # remove TODAS as regras (libera tudo)
```

---

## ⚙️ Configuração

Todas as opções estão em `.env` (criado pelo `install.sh` a partir de `.env.production.example`):

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `JWT_SECRET` | gerado | Segredo HMAC para tokens JWT |
| `DB_NAME` | `firewall_console` | Nome do banco |
| `CORS_ORIGINS` | `*` | Origens CORS |
| `SEED_DEMO_DATA` | `false` | Seed de dados de demo no 1º boot |
| `FIREWALL_APPLY_REAL` | `true` | Aplicar `nft -f` no host de verdade |
| `ADMIN_EMAIL` | `admin@firewall.local` | Admin inicial |
| `ADMIN_PASSWORD` | `Admin@123` | Senha inicial |

---

## 🛡️ Segurança

- **Sempre** troque `ADMIN_PASSWORD` após o primeiro login
- O `JWT_SECRET` é gerado automaticamente em 64 bytes hex pelo `install.sh`
- Mongo escuta **apenas em 127.0.0.1** — não é exposto à rede
- Backend cria **backup automático** do ruleset antes de cada apply (em `/var/lib/firewall-console/backups/`)
- Endpoint público `/api/block-page/` é o ÚNICO sem autenticação (necessário para a página de bloqueio funcionar)
- Recomenda-se desativar UFW e firewalld no host (eles conflitam com o nftables aplicado pelo console):
  ```bash
  sudo systemctl disable --now ufw firewalld
  ```

---

## 🗺️ Roadmap

- [ ] HTTPS com Let's Encrypt (via Caddy ou Nginx + Certbot)
- [ ] Métricas reais de host (CPU/RAM/network do `/proc` em vez de simulado)
- [ ] GeoIP MaxMind real (em vez de mock de países)
- [ ] Importação de regras pfSense `.xml` / OPNsense
- [ ] Alertas via webhook / e-mail / Telegram
- [ ] Auto-block por threshold (X port-scans em Y segundos)
- [ ] Pacote `.deb` para Ubuntu sem Docker
- [ ] Cluster HA (2 nós com VRRP/keepalived)

---

## 📚 Documentação completa

- **[DEPLOY.md](DEPLOY.md)** — Guia de deploy detalhado em PT-BR (requisitos, troubleshooting, hardening, recovery)

---

## 🤝 Contribuindo

PRs são bem-vindos! Para mudanças grandes, abra uma Issue antes para discutir.

```bash
git clone https://github.com/SEU_USUARIO/firewall-console.git
cd firewall-console

# Backend dev
cd backend && pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend dev
cd frontend && yarn && yarn start
```

---

## 📜 Licença

[MIT](LICENSE) — use, modifique, distribua à vontade.

---

<div align="center">

**Firewall Console** — feito com FastAPI + React + ❤️

[Reportar bug](https://github.com/SEU_USUARIO/firewall-console/issues) · [Pedir feature](https://github.com/SEU_USUARIO/firewall-console/issues/new) · [DEPLOY.md](DEPLOY.md)

</div>
