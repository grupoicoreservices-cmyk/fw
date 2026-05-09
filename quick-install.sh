#!/usr/bin/env bash
# Firewall Console - One-liner installer for Ubuntu 24 (clones from GitHub)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/firewall-console/main/quick-install.sh | sudo bash
#
# Or with a custom repo URL:
#   curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/firewall-console/main/quick-install.sh \
#     | sudo REPO_URL=https://github.com/seuuser/firewall-console.git BRANCH=main bash

set -e

# Default values - edit these or override via env
REPO_URL="${REPO_URL:-https://github.com/SEU_USUARIO/firewall-console.git}"
BRANCH="${BRANCH:-main}"
INSTALL_DIR="${INSTALL_DIR:-/opt/firewall-console}"

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
    err "Este script precisa rodar como root."
    err "Use: curl -fsSL <URL> | sudo bash"
    exit 1
fi

echo ""
echo "=================================================="
echo "  Firewall Console - Instalador via GitHub"
echo "=================================================="
echo "  Repo:  $REPO_URL"
echo "  Branch: $BRANCH"
echo "  Dir:   $INSTALL_DIR"
echo "=================================================="
echo ""

# 1) Verificar git
if ! command -v git >/dev/null 2>&1; then
    log "Instalando git..."
    apt-get update -y
    apt-get install -y git
    ok "git instalado."
fi

# 2) Clonar ou atualizar
if [ -d "$INSTALL_DIR/.git" ]; then
    log "Repositório já existe em $INSTALL_DIR. Atualizando (git pull)..."
    cd "$INSTALL_DIR"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull --ff-only origin "$BRANCH"
    ok "Repositório atualizado para $(git rev-parse --short HEAD)."
else
    log "Clonando $REPO_URL para $INSTALL_DIR..."
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    ok "Repositório clonado em $(git rev-parse --short HEAD)."
fi

# 3) Delegar para o install.sh do projeto
cd "$INSTALL_DIR"
if [ ! -f install.sh ]; then
    err "install.sh não encontrado em $INSTALL_DIR"
    exit 1
fi

log "Executando install.sh do projeto..."
bash install.sh
