# Changelog

Todos os mudanças notáveis deste projeto serão documentadas neste arquivo.

## [1.0.0] - 2026-05-09

### Adicionado
- Auth JWT + RBAC (admin / operator / viewer)
- Dashboard com métricas ao vivo (CPU/RAM/RX/TX/conexões/bloqueios) + 3 charts (recharts)
- Regras de Firewall com drag-to-reorder (@dnd-kit), allow/block/reject, log
- NAT entrada (DNAT) + saída (SNAT/MASQUERADE) com **Auto-criar saída**
- VPN: WireGuard + OpenVPN com peers
- DHCP server (config + leases estáticas)
- DNS resolver + records A/AAAA/CNAME/MX/TXT
- Aliases (grupos nomeados de IPs/redes)
- Interfaces de rede (WAN/LAN/OPT) com RX/TX ao vivo
- Logs em tempo real com filtros + pause/resume
- **Análise de Ataques** com visão agregada + **Live Feed** em tempo real
- Bloqueio de IP em 1 clique (cria regra + alias + NAT redirect opcional)
- **Página pública de bloqueio** customizável (`/blocked`)
- Editor admin da Block Page com preview ao vivo
- Export `nftables.conf` e `iptables.sh` com cópia + download
- **Aplicação real no host** (`nft -f`) com backup automático e rollback
- Histórico de aplicações persistido
- **Tema claro/escuro** com toggle persistido (localStorage)
- **Bilíngue PT/EN** com toggle instantâneo (react-i18next)
- Tema NOC/SOC premium (Space Grotesk + JetBrains Mono)
- Docker Compose stack (mongo + backend + frontend nginx) em network_mode host
- Backend com CAP_NET_ADMIN para aplicar nftables
- Instalador one-shot `install.sh` para Ubuntu 24
- Quick-install via curl `quick-install.sh` clonando do GitHub
- Documentação completa em PT-BR (`README.md` e `DEPLOY.md`)

[1.0.0]: https://github.com/SEU_USUARIO/firewall-console/releases/tag/v1.0.0
