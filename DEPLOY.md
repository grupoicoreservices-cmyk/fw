# Firewall Console — Deploy em produção (Ubuntu 24)

Painel web de firewall (estilo pfSense, mas com UX moderna) para Ubuntu 24, com aplicação **REAL** de regras `nftables` no host, backups automáticos e rollback.

---

## ✅ Requisitos

- **Servidor Ubuntu 24.04 LTS** (recomendado) ou 22.04 LTS
- **2 vCPU / 2 GB RAM / 8 GB disco** (mínimo) — recomendado 4 vCPU / 4 GB
- Acesso **root** (sudo)
- Conexão à Internet (para baixar Docker e dependências)
- Pelo menos **2 interfaces de rede** se for usar como roteador/firewall (WAN + LAN)
- Portas necessárias no host: **80** (UI), **8001** (API local), **27117** (Mongo loopback)

> ⚠️ **Importante:** este pacote foi configurado para aplicar regras `nftables` reais no host (modo `FIREWALL_APPLY_REAL=true`). Regras mal configuradas podem **bloquear seu próprio acesso (SSH, web)**. Sempre teste em ambiente de laboratório primeiro e mantenha um console físico/IPMI à mão.

---

## 🚀 Instalação rápida (1 comando)

```bash
# 1) No seu servidor Ubuntu 24, copie este projeto inteiro
#    (via git clone, scp, rsync — como preferir)
cd /opt
sudo mkdir firewall-console
sudo chown $USER firewall-console
# scp -r /caminho/local/firewall-console/* user@servidor:/opt/firewall-console/
cd /opt/firewall-console

# 2) Rode o instalador
sudo bash install.sh
```

O script faz tudo:
1. Instala Docker + Docker Compose se não estiverem instalados
2. Habilita IP forwarding (sysctl) e módulos `nf_tables`
3. Cria `.env` com `JWT_SECRET` aleatório forte (64 bytes hex)
4. Faz build das imagens Docker (backend + frontend)
5. Sobe a stack (`docker compose up -d`)
6. Mostra a URL final, credenciais e comandos úteis

Ao final você verá algo como:

```
==================================================
  Firewall Console pronto!
==================================================

  URL:    http://192.168.1.10
  Login:  admin@firewall.local / Admin@123

  ⚠ TROQUE A SENHA APÓS O PRIMEIRO LOGIN
```

---

## 📁 Estrutura entregue

```
firewall-console/
├── backend/                  # FastAPI (Python)
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── server.py
│   └── app/
│       ├── routers/         # auth, firewall, nat, vpn, dhcp, dns, attacks, apply, ...
│       ├── system_apply.py  # aplica nftables no host (com backup/rollback)
│       └── seed.py
├── frontend/                 # React + Tailwind + shadcn/ui
│   ├── Dockerfile
│   ├── nginx.conf            # serve estáticos + proxy /api → backend
│   ├── .env.production
│   └── src/
├── docker-compose.yml        # 3 serviços: mongo, backend, frontend (host network)
├── .env.production.example   # template — install.sh gera o .env real
├── install.sh                # one-shot installer Ubuntu 24
└── DEPLOY.md                 # este arquivo
```

---

## 🔧 Configuração via .env

Variáveis principais (em `.env`):

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `JWT_SECRET` | (gerado pelo install.sh) | Segredo HMAC para tokens JWT. **Nunca compartilhe.** |
| `DB_NAME` | `firewall_console` | Nome do banco MongoDB |
| `CORS_ORIGINS` | `*` | Origens CORS aceitas (separe com vírgula) |
| `SEED_DEMO_DATA` | `false` | Se `true`, cria regras/aliases/atacantes de demo no primeiro boot |
| `FIREWALL_APPLY_REAL` | `true` | Se `true`, o botão "Aplicar" executa `nft -f` no host de verdade |
| `ADMIN_EMAIL` | `admin@firewall.local` | Email do admin inicial |
| `ADMIN_PASSWORD` | `Admin@123` | Senha do admin inicial (troque depois!) |

Após editar `.env`, reinicie o backend:
```bash
docker compose up -d --force-recreate backend
```

---

## 🛡️ Modo REAL (aplicar nftables no host)

Quando `FIREWALL_APPLY_REAL=true`:

1. Cadastre suas **interfaces** (LAN/WAN/OPT) na UI com os nomes reais (`eth0`, `enp1s0`, etc.) em **device**.
2. Cadastre **aliases** (grupos de IPs nomeados).
3. Cadastre **regras de Firewall** e **NAT** (entrada/saída).
4. Em **Exportar** → clique em **"Aplicar no host agora"**.
5. O backend:
   - Salva o ruleset atual em `/var/lib/firewall-console/backups/ruleset-AAAAMMDDTHHMMSSZ.nft`
   - Escreve o novo ruleset em `/var/lib/firewall-console/current.nft`
   - Executa `nft -f /var/lib/firewall-console/current.nft`
   - Registra a aplicação no banco (histórico)
6. Para **reverter**, clique em **"Reverter última"** (re-aplica o backup mais recente).

### Verificar que o ruleset está ativo

```bash
sudo nft list ruleset
```

### Backups automáticos

Listados na própria UI (página Exportar) e em:
```bash
ls -lh /var/lib/firewall-console/backups/
```

---

## 🚨 Recuperação de emergência

Se você se **trancar fora** (bloqueou SSH ou web):

### Opção A — você ainda tem console físico/IPMI
```bash
sudo nft flush ruleset       # remove todas as regras (libera tudo)
docker compose restart backend  # reinicia o backend
# Acesse a UI e ajuste/desative as regras problemáticas
```

### Opção B — não tem console físico
Antes de aplicar regras críticas, instale o **timer de segurança** manualmente:

```bash
# Em outra sessão SSH, agende um flush em 60s caso você se desconecte:
( sleep 60 && sudo nft flush ruleset ) &
echo "Tem 60s para confirmar. Se não cancelar, regras serão removidas."
# Se a UI continuar acessível, cancele:
kill %1
```

---

## 🔄 Operação diária

```bash
# Status
docker compose ps

# Logs (siga em tempo real)
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongo

# Reiniciar tudo
docker compose restart

# Parar
docker compose down

# Atualizar (após receber nova versão do código)
git pull   # ou substituir arquivos
docker compose pull
docker compose up -d --build

# Backup manual do MongoDB
docker compose exec mongo mongodump --port 27117 --out /data/db/backup-$(date +%F)
```

---

## 🔒 Hardening recomendado (pós-deploy)

1. **Trocar a senha do admin**: login → menu Usuários → editar → nova senha forte.
2. **Criar usuários por papel**: admin (poucos), operator (CRUD sem RBAC sensível), viewer (read-only).
3. **Desabilitar UFW e firewalld** no host (eles conflitam com o nftables aplicado pelo console):
   ```bash
   sudo systemctl disable --now ufw
   sudo systemctl disable --now firewalld
   ```
4. **Limitar acesso à porta 80** apenas à rede de gerenciamento — adicione uma regra de Firewall na própria UI (`interface=LAN, source=192.168.1.0/24, action=allow, port=80`) e bloqueie o resto.
5. **HTTPS (futuro)**: na sua escolha foi HTTP por IP. Se quiser HTTPS depois, recomendo colocar Caddy ou Nginx + Certbot na frente.
6. **Rotação do `JWT_SECRET`**: gere um novo, edite `.env`, reinicie backend (todos os usuários terão que logar de novo).

---

## 🛠️ Solução de problemas

### "Aplicação real desativada (FIREWALL_APPLY_REAL=false)"
Edite `.env`, defina `FIREWALL_APPLY_REAL=true` e:
```bash
docker compose up -d --force-recreate backend
```

### "nft binary not found"
Container backend não está com `nftables` instalado. Rebuild:
```bash
docker compose build --no-cache backend && docker compose up -d backend
```

### "Operation not permitted" ao aplicar
Container precisa de `CAP_NET_ADMIN`. Já está no `docker-compose.yml`. Confirme:
```bash
docker inspect firewall-backend | grep -A3 CapAdd
```

### Backend não conecta no MongoDB
Verifique se MongoDB está em `127.0.0.1:27117`:
```bash
docker compose logs mongo
ss -tnlp | grep 27117
```

### A UI carrega mas /api dá 502
Backend não respondeu. Logs:
```bash
docker compose logs backend | tail -100
```

### Reset total (apaga TUDO incluindo Mongo)
```bash
docker compose down -v   # -v remove volumes
sudo rm -rf /var/lib/firewall-console/backups/*
docker compose up -d --build
```

---

## 📊 Recursos do sistema

| Componente | Uso típico |
|------------|------------|
| backend (Python/FastAPI) | 80–150 MB RAM |
| frontend (Nginx) | 20 MB RAM |
| mongo (MongoDB 7) | 200–400 MB RAM |
| **Total** | **~500 MB RAM** |

---

## ⚙️ Arquitetura

```
┌─────────────────────────────────────────────┐
│              Ubuntu 24 host                  │
│                                              │
│   ┌────────────┐                            │
│   │ Browser    │  http://server-ip:80       │
│   └─────┬──────┘                            │
│         │                                   │
│         ▼                                   │
│   ┌────────────────┐                        │
│   │ frontend       │  nginx serve estáticos │
│   │ (host:80)      │  + proxy /api/*        │
│   └─────┬──────────┘                        │
│         │ /api/*                            │
│         ▼                                   │
│   ┌────────────────┐  ┌──────────────────┐ │
│   │ backend        │  │ mongo            │ │
│   │ (host:8001)    │──│ (loopback:27117) │ │
│   │ NET_ADMIN cap  │  └──────────────────┘ │
│   └─────┬──────────┘                        │
│         │ nft -f                            │
│         ▼                                   │
│   ┌────────────────┐                        │
│   │ kernel nftables│  rules atuais ativas  │
│   └────────────────┘                        │
└─────────────────────────────────────────────┘
```

---

## ✉️ Suporte

Edite os arquivos diretamente — todo o código fonte está no projeto. Backend em Python (FastAPI), frontend em React. Logs detalhados via `docker compose logs -f`.

**Bons firewalls!** 🔥🛡️
