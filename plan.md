# plan.md (Atualizado)

## Objectives
- Entregar um console estilo pfSense (UI web de gerenciamento, não um SO) para Ubuntu 24: **FastAPI + React + MongoDB**.
- Fornecer UI **bilíngue (PT/EN)** com alternância instantânea.
- Implementar módulos: **Dashboard (métricas reais/live)**, **Regras de Firewall**, **NAT**, **VPN**, **DHCP**, **DNS**, **Aliases**, **Interfaces**, **Logs**, **Usuários/Roles**, **Análise de Ataques**.
- Operar em **modo produção via Docker Compose** aplicando regras **REAIS** de `nftables` no host (backend privilegiado), mantendo capacidade de simulação quando aplicável.
- Gerar e exportar artefatos reais de sistema: `nftables.conf` e **Netplan YAML**.
- Incluir funcionalidades adicionais pedidas: **bloqueio/redirect por IP**, **página pública de bloqueio customizável**, **URL Filter (bloqueio por domínio resolvido → IP)**.
- **Atualização visual:** adotar design **corporate clean** inspirado na imagem enviada: **conteúdo claro + sidebar escura sempre**, fonte **Open Sans**.

**Status atual:** Console V1 estável e funcional com RBAC + i18n + métricas reais do host + autodescoberta de interfaces. O tema foi refatorado para o novo padrão visual (sem toggle), a UI de URL Filter foi implementada e o visualizador de Netplan YAML foi adicionado em Interfaces. Testes E2E recentes passaram 100%.

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
- Métricas reais do host via `psutil` + contadores Linux (`/proc/net/dev`). ✅
- Autodescoberta real de interfaces (`POST /api/interfaces/discover`). ✅
- Export Netplan YAML (`GET /api/interfaces/export/netplan`). ✅
- URL Filtering (resolver domínio → IP + CRUD) em `/api/url-filter`. ✅
- Aplicação real de regras via `nft` (subprocess) para ambiente de produção. ✅

### Frontend (React) — ✅ COMPLETE
- AppShell com Sidebar/Topbar, navegação por módulos. ✅
- Páginas principais implementadas e funcionais. ✅
- i18n PT/EN e RBAC integrados. ✅

### Conclude Phase 2 — ✅ COMPLETE
- Testes E2E anteriores passaram (testing_agent_v3). ✅

---

## Phase 3: Feature Completion + Hardening (optional enhancements)
> Mantida como backlog de robustez/ergonomia.

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

## Phase 5: Visual Refactor + URL Filter UI + Netplan Viewer — ✅ COMPLETE

### Escopo e decisões confirmadas
- **a2:** substituir o tema atual pelo novo padrão (sem toggle light/dark).
- **b1:** **sidebar sempre escura**.
- **c3:** fonte principal **Open Sans**.
- **d1:** executar as entregas em sequência: **Tema → URL Filter UI → Netplan Viewer (Interfaces)**.

### User stories (Phase 5)
1. Como usuário, quero que toda a interface siga o novo padrão visual (corporate clean) conforme a imagem fornecida. ✅
2. Como admin/operator, quero gerenciar filtros de URL (domínios) e aplicar/atualizar resolução de IPs pela UI. ✅
3. Como admin, quero visualizar/copiar o **Netplan YAML** gerado para as interfaces (incluindo PPPoE). ✅

### Work items (Phase 5) — ✅ Delivered
#### 5.1 Refatoração visual global (P0) — ✅
- Tipografia global alterada para **Open Sans** (`public/index.html` + `index.css`).
- Removido toggle dark/light:
  - Botão removido do `Topbar`.
  - `ThemeContext` fixo (tema único), mantendo compatibilidade com código legado.
  - `Toaster` padronizado para tema claro.
- Tokens de tema atualizados para refletir a referência:
  - Conteúdo claro, cards brancos, bordas suaves e sombras leves.
  - Sidebar grafite/preto, item ativo em azul (primary), sidebar sempre escura.
- Ajustes de layout:
  - `AppShell`, `Sidebar`, `Topbar`, `PageHeader` adaptados ao estilo corporate clean.

#### 5.2 URL Filter UI (P0) — ✅
- Implementada página `/url-filter`:
  - Listagem (`GET /api/url-filter/`).
  - CRUD (create/edit/delete) via Sheet.
  - Toggle enable/disable.
  - Resolve now por filtro e resolve-all.
  - Exibição de `last_resolved_at`, contadores e lista colapsável de domínios/IPs.
- Integração completa:
  - Rota adicionada no `App.js`.
  - Item adicionado ao `Sidebar`.
  - i18n atualizado (`pt.json`, `en.json`).

#### 5.3 Interfaces: Netplan Viewer (P1) — ✅
- Botão “Ver Netplan / View Netplan” em `Interfaces.jsx`.
- Modal (Dialog) exibindo YAML real de `GET /api/interfaces/export/netplan`.
- Ações: copiar para clipboard e download do arquivo `99-firewall-console.yaml`.

### Testing summary (Phase 5)
- **testing_agent_v3:** ✅ **100% aprovado**
  - Backend: **18/18** endpoints testados com sucesso (inclui URL Filter e Netplan export).
  - Frontend: **45/45** checks de UI/integração (navegação, criação/toggle/resolve/delete URL Filter, modal Netplan, ausência do toggle de tema, sidebar escura constante, PT/EN).
- Relatório salvo em: `/app/test_reports/iteration_3.json`.

### Critérios de aceite (Phase 5) — ✅ Met
- UI global aderente ao padrão da imagem (clean, sidebar dark sempre, primary azul). ✅
- Fonte Open Sans aplicada em toda a UI. ✅
- URL Filter funcional via UI: CRUD + toggle + resolve now + resolve all. ✅
- Interfaces: visualizador Netplan exibindo YAML real gerado pelo backend + copiar/baixar. ✅

---

## Implementation Steps (high-level sequence)
1. **(Completed)** Scaffold backend + Mongo + seed + JWT/RBAC.
2. **(Completed)** CRUD módulos principais + i18n.
3. **(Completed)** Métricas reais do host + autodescoberta de interfaces.
4. **(Completed)** Backend URL Filter + Export Netplan.
5. **(Completed / Phase 5)** Refatorar tema global (corporate clean) + Open Sans + remover toggle.
6. **(Completed / Phase 5)** Implementar página URL Filter (frontend) + rotas + i18n.
7. **(Completed / Phase 5)** Adicionar Netplan Viewer em Interfaces.
8. **(Completed)** Rodar testes E2E (testing_agent_v3) e registrar relatório.
9. **(Next, optional)** Phase 3: validações avançadas + alertas.
10. **(Next, optional)** Phase 4: backup/restore + hardening + packaging.

---

## Next Actions
- Decidir se o próximo foco será:
  - **Phase 3** (validações, UX avançada, alertas e produtividade), e/ou
  - **Phase 4** (backup/restore, hardening, documentação e empacotamento final para produção).
- (Opcional) Ajustar pequenas consistências de copy/strings (ex.: “URL Filter” vs “Filtro de URLs”) conforme preferência do cliente.

---

## Success Criteria
- ✅ Login + RBAC funcionando.
- ✅ PT/EN funcionando.
- ✅ Dashboard/Interfaces exibindo métricas reais (CPU/RAM/RX/TX) e NICs descobertas.
- ✅ Regras de firewall/NAT/VPN/DHCP/DNS/Aliases/Logs/Usuários funcionais.
- ✅ **Tema corporate clean** aplicado globalmente (sem toggle), com sidebar escura permanente.
- ✅ URL Filter UI implementado e integrado ao backend.
- ✅ Netplan YAML visível/copíavel/baixável pela UI.
- ✅ `testing_agent_v3` sem bugs críticos após mudanças (100% pass).