# plan.md (Atualizado)

## Objectives
- Entregar um console estilo pfSense (UI web de gerenciamento, não um SO) para Ubuntu 24: **FastAPI + React + MongoDB**.
- Fornecer UI **bilíngue (PT/EN)** com alternância instantânea.
- Implementar módulos: **Dashboard (métricas reais/live)**, **Regras de Firewall**, **NAT**, **VPN**, **DHCP**, **DNS**, **Aliases**, **Interfaces**, **Logs**, **Usuários/Roles**, **Análise de Ataques**.
- Operar em **modo produção via Docker Compose** aplicando regras **REAIS** de `nftables` no host (backend privilegiado), mantendo capacidade de simulação quando aplicável.
- Gerar e exportar artefatos reais de sistema: `nftables.conf` e **Netplan YAML**.
- Incluir funcionalidades adicionais pedidas: **bloqueio/redirect por IP**, **página pública de bloqueio customizável**, **URL Filter (bloqueio por domínio resolvido → IP)**.
- **Atualização visual (prioridade):** adotar novo design **corporate clean** inspirado na imagem enviada: **conteúdo claro + sidebar escura sempre**.

**Status atual:** V1 funcional com RBAC + i18n + métricas reais do host + autodescoberta de interfaces; UI existente será **refatorada** para o novo padrão visual. Backend de URL Filter e export Netplan já existem; falta finalizar UI do URL Filter e adicionar visualizador Netplan na tela Interfaces.

---

## Phase 1: Core Flow POC (skipped)
- Projeto avançou diretamente para V1.

---

## Phase 2: V1 App Development (MVP, end-to-end working) — ✅ COMPLETE

### User stories (V1)
1. Como usuário, consigo logar (email/senha) e receber JWT. ✅
2. Como usuário, consigo alternar idioma PT/EN instantaneamente. ✅
3. Como usuário, vejo dashboard com métricas em tempo real. ✅ *(agora com leitura real do host)*
4. Como admin/operator, consigo criar/editar/habilitar/desabilitar regras de firewall e reordenar prioridade. ✅
5. Como admin, consigo exportar configuração (`nftables.conf` / `iptables.sh`). ✅

### Backend (FastAPI) — ✅ COMPLETE
- Estrutura modular em `/app/backend` com routers.
- RBAC via JWT (admin/operator/viewer). ✅
- Seed de usuários e coleções principais. ✅
- Métricas reais do host via `psutil` + contadores Linux (`/proc/net/dev`) (substituiu simulação para métricas). ✅
- Autodescoberta real de interfaces (`POST /api/interfaces/discover`). ✅
- Export Netplan YAML (`GET /api/interfaces/export/netplan`). ✅
- URL Filtering (resolver domínio → IP + CRUD) em `/api/url-filter`. ✅ *(backend pronto; UI pendente)*
- Aplicação real de regras via `nft` (subprocess) para ambiente de produção. ✅

### Frontend (React) — ✅ COMPLETE
- AppShell com Sidebar/Topbar, navegação por módulos. ✅
- Páginas principais implementadas e funcionais. ✅
- Tema anterior (dark NOC/SOC) implementado com toggle light/dark. ✅ *(será substituído na Phase 5 conforme decisão do usuário)*

### Conclude Phase 2 — ✅ COMPLETE
- Testes E2E anteriores passaram (testing_agent_v3). ✅

---

## Phase 3: Feature Completion + Hardening (optional enhancements)
> Muitos itens de Phase 3 já foram parcialmente atendidos com RBAC, módulos completos e produção via Docker Compose. Mantida como backlog de robustez/ergonomia.

### User stories (Phase 3)
1. Como admin, quero mais salvaguardas (auditoria, política de senha, 2FA opcional). 
2. Como admin/operator, quero melhores validações e ergonomia (CIDR/IP/porta/MAC, duplicidades, bulk actions).
3. Como operador, quero alertas derivados de logs (port scan, brute force, bursts).

### Work items
- Validações mais fortes e UX power-user (busca global, paginação, bulk actions).
- Pipeline de alertas baseado em logs/eventos.

### Conclude Phase 3
- Rodar `testing_agent_v3` focado em validações/alertas.

---

## Phase 4: Production-readiness + Packaging
### User stories (Phase 4)
1. Backup/restore de configuração (JSON) versionado.
2. Busca avançada/export de logs.
3. Hardening (rate limiting, CORS allowlist, HTTPS opcional, secrets por env).

### Work items
- Import/export de config + migrações.
- Paginação/index de logs.
- Segurança e documentação de deploy.

### Conclude Phase 4
- `testing_agent_v3` cobrindo deploy e fluxos críticos.

---

## Phase 5: Visual Refactor + URL Filter UI + Netplan Viewer — 🚧 IN PROGRESS (Nova)

### Escopo e decisões confirmadas
- **a2:** substituir o tema atual pelo novo padrão (sem toggle light/dark).
- **b1:** **sidebar sempre escura**.
- **c3:** fonte principal **Open Sans**.
- **d1:** executar as entregas em sequência: **Tema → URL Filter UI → Netplan Viewer (Interfaces)**.

### User stories (Phase 5)
1. Como usuário, quero que toda a interface siga o novo padrão visual (corporate clean) conforme a imagem fornecida. 
2. Como admin/operator, quero gerenciar filtros de URL (domínios) e aplicar/atualizar resolução de IPs pela UI.
3. Como admin, quero visualizar/copiar o **Netplan YAML** gerado para as interfaces (incluindo PPPoE).

### Work items (Phase 5)
#### 5.1 Refatoração visual global (P0)
- Ajustar tipografia global para **Open Sans** (`public/index.html` + `index.css`).
- Remover dependência do toggle dark/light na UI:
  - Remover botão de tema do `Topbar`.
  - Ajustar `ThemeContext` para fixar tema único (ex.: `light`) mantendo **sidebar dark via tokens**.
  - Garantir `Toaster` sempre no tema correto (sem depender de `isDark`).
- Atualizar tokens do tema para refletir a imagem:
  - Conteúdo: fundo branco/near-white, cards brancos, bordas suaves, sombras leves.
  - Sidebar: grafite/preto (#1A1A1A aprox), item ativo com azul primary (#007BFF aprox).
  - Raio de borda mais discreto (~6px) e “cards limpos”.
- Ajustar componentes de layout:
  - `AppShell` (remover “SOC grid/radial” se conflitar com o estilo clean).
  - `Sidebar` e `Topbar` para estilo corporate.
- Revisar páginas principais (Dashboard/Firewall/NAT/etc.) para consistência (cards, tabelas, headers) com o novo tema.

#### 5.2 Criar página de URL Filter no frontend (P0)
- Criar `/app/frontend/src/pages/URLFilter.jsx`:
  - Listagem dos filtros (`GET /api/url-filter/`).
  - Criar/editar (Sheet/Modal) com campos: `name`, `enabled`, `source`, `action (block|redirect)`, `domains[]`, `description`.
  - Ações: toggle (`PATCH /api/url-filter/{id}/toggle`), delete, resolve now (`POST /api/url-filter/{id}/resolve`), resolve-all (`POST /api/url-filter/resolve-all`).
  - Exibir `last_resolved_at`, contador de IPs resolvidos e lista (colapsável) de `resolved_ips`.
- Integrar navegação:
  - Adicionar item no `Sidebar` (grupo Services ou Firewall, conforme UX).
  - Adicionar rota em `App.js`.
- i18n:
  - Adicionar chaves em `pt.json` e `en.json`.

#### 5.3 Finalizar Interfaces (Netplan Viewer + pequenos ajustes) (P1)
- Adicionar botão “Ver Netplan” na página `Interfaces.jsx`:
  - Consumir `GET /api/interfaces/export/netplan`.
  - Exibir YAML em modal/sheet com `pre` + fonte mono + botão copiar/download.
- Conferir fluxo PPPoE:
  - Garantir que senha mascarada não sobrescreve valor real no update (já previsto no backend; manter comportamento no frontend).

### Critérios de aceite (Phase 5)
- UI global aderente ao padrão da imagem: **layout clean**, cards com sombra leve, sidebar escura permanente, primary azul.
- Fonte Open Sans aplicada em toda a UI.
- URL Filter funcional via UI: CRUD + toggle + resolve now + resolve all.
- Interfaces: visualizador Netplan exibindo YAML real gerado pelo backend.

---

## Implementation Steps (high-level sequence)
1. **(Completed)** Scaffold backend + Mongo + seed + JWT/RBAC.
2. **(Completed)** CRUD módulos principais + i18n.
3. **(Completed)** Métricas reais do host + autodescoberta de interfaces.
4. **(Completed)** Backend URL Filter + Export Netplan.
5. **(Next / Phase 5 - P0)** Refatorar tema global (corporate clean) + aplicar Open Sans + remover toggle.
6. **(Next / Phase 5 - P0)** Implementar página URL Filter (frontend) + rotas + i18n.
7. **(Next / Phase 5 - P1)** Adicionar Netplan Viewer em Interfaces.
8. **(After Phase 5)** Rodar testes de frontend (frontend testing agent) + regressão geral com `testing_agent_v3`.

---

## Next Actions
- Executar Phase 5 na ordem confirmada: **Tema → URL Filter UI → Netplan Viewer**.
- Após validação visual e funcional: decidir se avança para Phase 3 (validações/alertas) e/ou Phase 4 (backup/restore, hardening).

---

## Success Criteria
- ✅ Login + RBAC funcionando.
- ✅ PT/EN funcionando.
- ✅ Dashboard/Interfaces exibindo métricas reais (CPU/RAM/RX/TX) e NICs descobertas.
- ✅ Regras de firewall/NAT/VPN/DHCP/DNS/Aliases/Logs/Usuários funcionais.
- ✅ **Novo tema corporate clean** aplicado globalmente (sem toggle), com sidebar escura permanente.
- ✅ URL Filter UI implementado e integrado ao backend.
- ✅ Netplan YAML visível/copíavel pela UI.
- ✅ `testing_agent_v3` sem bugs críticos após mudanças.
