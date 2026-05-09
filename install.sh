#!/usr/bin/env bash
# Firewall Console - one-shot installer for Ubuntu 24
# Usage: sudo bash install.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}➜${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }

if [[ $EUID -ne 0 ]]; then
    err "Este script precisa rodar como root (use: sudo bash install.sh)"
    exit 1
 fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "=================================================="
echo "  Firewall Console - Instalador (Ubuntu 24)"
echo "=================================================="
echo ""

# 1) Verificar dist
if ! grep -qiE "ubuntu|debian" /etc/os-release; then
    warn "Sistema não é Ubuntu/Debian. O script segue, mas pode falhar."
fi

# 2) Atualizar apt + dependencies (nftables, curl etc.)
log "Atualizando apt e instalando dependências do host (nftables, curl, openssl)..."
apt-get update -y
apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg lsb-release \
    nftables openssl
ok "Dependências do host instaladas."

# 3) Docker
if ! command -v docker >/dev/null 2>&1; then
    log "Docker não encontrado. Instalando via get.docker.com..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    ok "Docker instalado."
else
    ok "Docker já está instalado: $(docker --version)"
fi

if ! docker compose version >/dev/null 2>&1; then
    log "Instalando docker compose plugin..."
    apt-get install -y docker-compose-plugin
    ok "docker compose plugin instalado."
else
    ok "docker compose já disponível: $(docker compose version --short)"
fi

# 4) Habilitar IP forwarding (necessário para roteamento/NAT)
log "Habilitando IP forwarding (sysctl)..."
cat >/etc/sysctl.d/99-firewall-console.conf <<EOF
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
EOF
sysctl --system >/dev/null
ok "IP forwarding habilitado."

# 5) Habilitar módulos nftables (geralmente já carregados em Ubuntu 24)
log "Carregando módulos nf_tables..."
modprobe nf_tables 2>/dev/null || true
modprobe nft_ct 2>/dev/null || true
cat >/etc/modules-load.d/firewall-console.conf <<EOF
nf_tables
nft_ct
EOF
ok "Módulos nftables prontos."

# 6) Verificar arquivos do projeto
for f in docker-compose.yml backend/Dockerfile frontend/Dockerfile .env.production.example; do
    if [ ! -f "$SCRIPT_DIR/$f" ]; then
        err "Arquivo necessário não encontrado: $f. Execute o script no diretório do projeto."
        exit 1
    fi
done
ok "Arquivos do projeto encontrados."

# 7) .env
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    log "Criando .env a partir do template..."
    cp "$SCRIPT_DIR/.env.production.example" "$SCRIPT_DIR/.env"
    JWT=$(openssl rand -hex 64)
    sed -i "s|CHANGE_ME_TO_A_LONG_RANDOM_STRING|$JWT|g" "$SCRIPT_DIR/.env"
    chmod 600 "$SCRIPT_DIR/.env"
    ok ".env criado com JWT_SECRET aleatório."
else
    ok ".env já existe (mantendo configuração atual)."
fi

# 8) Build e start
log "Build de imagens (pode levar alguns minutos no primeiro deploy)..."
docker compose build --pull
ok "Build concluído."

log "Iniciando containers..."
docker compose up -d
ok "Containers iniciados."

sleep 4

# 9) Aviso firewall conflitantes
if systemctl is-active --quiet ufw; then
    warn "UFW está ATIVO no host - isso pode interferir com o nftables aplicado pelo console."
    warn "Recomendação: 'sudo systemctl disable --now ufw' antes de aplicar regras pelo console."
fi
if systemctl is-active --quiet firewalld; then
    warn "firewalld está ATIVO no host - desabilite antes de usar o console em modo REAL."
    warn "Comando: sudo systemctl disable --now firewalld"
fi

# 10) Resumo final
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=================================================="
echo -e "  ${GREEN}Firewall Console pronto!${NC}"
echo "=================================================="
echo ""
echo -e "  URL:    ${CYAN}http://${IP}${NC}"
echo -e "  Login:  ${CYAN}admin@firewall.local${NC} / ${CYAN}Admin@123${NC}"
echo ""
echo -e "  ${YELLOW}⚠  TROQUE A SENHA APÓS O PRIMEIRO LOGIN${NC} (Página Usuários > editar admin)"
echo ""
echo "--------------------------------------------------"
echo "  Comandos úteis:"
echo "    docker compose ps          # status"
echo "    docker compose logs -f     # logs"
echo "    docker compose restart     # reiniciar"
echo "    docker compose down        # parar"
echo "    docker compose pull && docker compose up -d --build  # atualizar"
echo ""
echo "  Emergência (se você se trancar fora):"
echo "    sudo nft flush ruleset     # remove todas as regras (libera tudo)"
echo ""
echo "  Documentação completa: DEPLOY.md"
echo "=================================================="
