# Backend Test Coverage — Design Spec

**Data:** 2026-04-21
**Escopo:** Backend (`/backend`). Frontend é fase 2 e só começa após a meta global de backend ser batida.
**Meta:** Cobertura global ≥ 90% (lines + branches + functions) no código de negócio do backend, com tiers por criticidade.
**Princípio:** Cobrir o sistema **como está hoje** — não refatorar para testar, não corrigir bugs descobertos durante a escrita (documentar em issue separada).

---

## 1. Arquitetura de testes

Três camadas via Vitest (já instalado):

1. **Unit** — sem I/O. Cobre: schemas Zod (`*.schema.ts`), lógica pura (`complaints.sla.ts`, `complaints.transitions.ts`, `role-permissions`), helpers de `shared/`, mappers/DTOs (ex.: `toPublicBillDto`), guards de middleware com request/reply mockados.
2. **Integration** — Fastify `app.inject()` + Postgres real. Cobre rotas HTTP end-to-end, com assertions em status, body e estado do banco. Substitui a necessidade de testar controller/service/repository isoladamente — são exercitados pelo fluxo.
3. **Contract/Webhook** — subset de integration. Dispara payloads reais (AbacatePay, Evolution) contra as rotas de webhook, garantindo parsing e efeitos colaterais.

**Fora do escopo:** E2E com navegador, testes de carga, mutation testing.

## 2. Infraestrutura

### 2.1 Banco de teste
- Database dedicado `condozap_test` via `DATABASE_URL_TEST` em `.env.test`.
- `globalSetup` do Vitest executa `prisma migrate deploy` uma vez antes da suite.
- Isolamento entre testes: cada teste roda em uma transação com `ROLLBACK` no `afterEach` (via `$transaction` do Prisma + client injetado no app de teste). Fallback: `TRUNCATE ... CASCADE` em todas as tabelas se a abordagem transacional conflitar com algum fluxo.
- **Seeds de produção (`prisma/seed.ts`) NÃO devem ser reusados.** Testes usam factories dedicadas.

### 2.2 App Factory
- Extrair (ou expor) um `buildApp(opts)` de `src/app/` que retorna uma instância Fastify sem `listen()`. Testes usam `app.inject({ method, url, payload, headers })`.
- Helper `signAsUser(user)` usa `app.jwt.sign` com a mesma chave.

### 2.3 Mocks de serviços externos
- `vi.mock()` nos adapters: Evolution, AbacatePay, Supabase Storage (S3), qualquer cliente `axios` dedicado.
- Fixtures em `test/fixtures/` (payloads de webhook, respostas de Evolution).
- SSE: testar que o evento é publicado no emissor, não o canal em si.

### 2.4 Estrutura
```
backend/
  src/modules/<mod>/<arquivo>.test.ts              (unit, colocado)
  src/modules/<mod>/<arquivo>.integration.test.ts  (integration, colocado)
  test/
    setup.ts               (hooks globais: begin tx / rollback)
    global-setup.ts        (migrate deploy)
    factories/             (makeUser, makeCondominium, makeComplaint, makeBill...)
    fixtures/              (webhooks, payloads externos)
    helpers/               (buildTestApp, signAsUser, authedInject)
  vitest.config.ts         (coverage v8, thresholds tiered por path)
  .env.test
```

### 2.5 Cobertura
- Provider: `@vitest/coverage-v8`.
- Reporters: `text`, `html`, `lcov`.
- Thresholds por diretório configurados no `vitest.config.ts` (ver Seção 5).

## 3. Mapeamento por módulo

### Tier 1 — crítico (95%+)

- **`auth`** — Unit: `role-permissions` (existente, expandir), JWT sign/verify, bcrypt hash, guards (`requireRole`, `requireCondominiumAccess`). Integration: `/auth/login`, `/auth/refresh`, `/auth/logout`, expiração, rate-limit.
- **`billing`** — Unit: cálculo por tier, descontos por volume, DTO omite `providerPayload`, parser de webhook. Integration: CRUD bill, listagem paginada, webhook AbacatePay (pago/falhou/estornado), idempotência, autorização.
- **`user-approval`** — Integration: fluxo resident→approval→notificação, aprovação/rejeição, LGPD consent (regression S982 — tela preta).
- **`user-management`** — Integration: CRUD por role, troca de senha, soft delete, role ceiling em runtime.
- **`complaints` (core)** — Unit: `complaints.sla.ts` (deadline/breach), `complaints.transitions.ts` (state machine). Integration: criação atômica com anexos (regression 4073), "cobrar setor" disparando notificação (S1010), reopen, return, nudge, chat, complement, CSAT com coerção validada (4076).

### Tier 2 — core (90%+)

- **`messages`, `messaging`** — Integration: envio, recebimento, paginação, autorização por condomínio.
- **`notifications`** — Unit: builders por tipo. Integration: criação em eventos, marcar como lida, navegação (S1010).
- **`whatsapp`, `evolution`** — Unit: mappers de webhook inbound, serialização outbound. Integration: webhook recebido (cliente mockado), envio outbound com retry.
- **`residents`** — Integration: CRUD, vínculo com torre/unidade, convite.
- **`condominiums`** — Integration: CRUD, estrutura (torres/unidades), associação síndico/sector.
- **`sla-cron`, `automation`** — Unit: seleção de breaches, montagem de notificação. Integration: execução manual do job contra DB populado.
- **`canned-responses`** — Integration: CRUD por síndico/sector (regression S982).

### Tier 3 — apoio (80%+)

- **`dashboard`, `sector-dashboard`, `reports`** — Integration: queries agregadas retornam números corretos em dataset conhecido. Unit: transformadores quando houver.
- **`history`, `announcements`, `platform`, `public`, `structure`, `notifier`** — Integration: smoke tests de rotas principais e autorização.
- **`uploads`** — Integration com S3/Supabase mockado: upload, download, autorização (regression 403 do S1007).

### Cross-cutting (entra em `shared/`)
Middleware de erro, rate-limit por rota, logger (pino), plugins (CORS, helmet, multipart, JWT).

## 4. Ordem de ataque e paralelização

Via `superpowers:dispatching-parallel-agents` + agente `test-automator`.

**Fase 0 — Fundação (sequencial, bloqueante).** Uma única PR:
1. `.env.test` + `DATABASE_URL_TEST` + script `db:test:reset`.
2. `vitest.config.ts`: coverage v8, thresholds tiered, `globalSetup`, `setupFiles`.
3. `test/setup.ts` (transação + rollback por teste).
4. `test/factories/*` para todas as entidades principais.
5. `test/helpers/*` (`buildTestApp`, `signAsUser`, `authedInject`).
6. Mocks globais dos clients externos (`vi.mock` em `setupFiles`).
7. Smoke test de integração (`GET /health`) verde.

**Fase 1 — Tier 1 em paralelo (5 agentes):**
- A: `auth`
- B: `billing` + webhook AbacatePay
- C: `user-approval` + `user-management`
- D: `complaints` unit (SLA/transitions)
- E: `complaints` integration (CRUD + chat + reopen + return + nudge + complement)

Cada agente só reporta pronto com 95% no próprio escopo.

**Fase 2 — Tier 2 em paralelo (4 agentes):**
- F: `messages` + `messaging` + `whatsapp` + `evolution`
- G: `notifications` + `sla-cron` + `automation`
- H: `residents` + `condominiums`
- I: `canned-responses`

Meta: 90% por módulo.

**Fase 3 — Tier 3 em paralelo (2 agentes):**
- J: `dashboard` + `sector-dashboard` + `reports` + `history`
- K: `announcements` + `platform` + `public` + `structure` + `notifier` + `uploads`

Meta: 80% por módulo.

**Fase 4 — Fechamento (sequencial):**
1. `vitest --coverage` consolidado; identificar arquivos abaixo do threshold.
2. Preencher gaps em `shared/` e middlewares cross-cutting.
3. GitHub Actions workflow: service Postgres, `npm test -- --coverage`, falha se thresholds não baterem.
4. Artefato de CI: `lcov.info` + HTML.
5. Gate final via `superpowers:verification-before-completion`.

## 5. Thresholds, CI, critérios de conclusão

### 5.1 Thresholds (em `vitest.config.ts`, `coverage.thresholds`)
```
src/auth/**                     → 95 / 95 / 95 (lines / branches / functions)
src/modules/billing/**          → 95 / 95 / 95
src/modules/user-approval/**    → 95 / 95 / 95
src/modules/user-management/**  → 95 / 95 / 95
src/modules/complaints/**       → 95 / 95 / 95

src/modules/messages/**         → 90 / 90 / 90
src/modules/messaging/**        → 90 / 90 / 90
src/modules/notifications/**    → 90 / 90 / 90
src/modules/whatsapp/**         → 90 / 90 / 90
src/modules/evolution/**        → 90 / 90 / 90
src/modules/residents/**        → 90 / 90 / 90
src/modules/condominiums/**     → 90 / 90 / 90
src/modules/sla-cron/**         → 90 / 90 / 90
src/modules/automation/**       → 90 / 90 / 90
src/modules/canned-responses/** → 90 / 90 / 90

src/modules/dashboard/**        → 80 / 80 / 80
src/modules/sector-dashboard/** → 80 / 80 / 80
src/modules/reports/**          → 80 / 80 / 80
src/modules/history/**          → 80 / 80 / 80
src/modules/announcements/**    → 80 / 80 / 80
src/modules/platform/**         → 80 / 80 / 80
src/modules/public/**           → 80 / 80 / 80
src/modules/structure/**        → 80 / 80 / 80
src/modules/notifier/**         → 80 / 80 / 80
src/modules/uploads/**          → 80 / 80 / 80

src/shared/**                   → 90 / 90 / 90
```

### 5.2 Exclusões (`coverage.exclude`)
- `src/generated/**` (Prisma client)
- `src/config/**`
- `src/server.ts`
- `src/app.ts` (wiring; exercitado via integration mas não conta para threshold)
- `src/plugins/**` (bootstrap)
- `**/*.routes.ts` (wiring declarativo)
- `**/*.d.ts`, `**/types/**`
- `prisma/**`, `scripts/**`, `test/**`

### 5.3 CI (`.github/workflows/test.yml`)
- Service: `postgres:16` com healthcheck.
- Steps: checkout → setup-node → `npm ci` → `prisma migrate deploy` no DB de teste → `npm test -- --coverage`.
- Falha do job em qualquer threshold não atingido (Vitest falha sozinho).
- Artefatos: `coverage/lcov.info` + HTML.

### 5.4 Critérios de "pronto" (gate para iniciar frontend)
1. `npm test -- --coverage` verde local e em CI.
2. Cobertura global ≥ 90% (lines + branches + functions).
3. Todos os thresholds por tier cumpridos.
4. Zero `test.skip` / `test.todo` / `it.only` no código.
5. Workflow CI verde na `develop`.
6. `docs/testing.md` com: como rodar, como escrever novos testes (padrão factory + inject), como ler relatório de cobertura.

### 5.5 Explicitamente fora
- Refatorar código para facilitar teste.
- Corrigir bugs descobertos (registrar em issue; severidade alta vira PR separada).
- Performance/load/mutation testing.
- Frontend (fase 2).

## 6. Dependências novas (devDependencies)

- `@vitest/coverage-v8` — provider de cobertura.
- (Opcional) `supertest` — não necessário; Fastify `inject()` cobre o caso.
- (Opcional) `@faker-js/faker` — para factories, se dados variáveis ajudarem a encontrar bugs latentes.

## 7. Riscos e mitigações

- **Risco:** estratégia transacional conflita com código que abre transação própria (Prisma `$transaction` aninhado). **Mitigação:** cair no fallback `TRUNCATE CASCADE` por teste, mais lento mas confiável.
- **Risco:** `app.ts` / plugins acoplados a `listen()` dificultam `buildApp`. **Mitigação:** extração controlada é parte da Fase 0; se precisar mexer em wiring é refactor mínimo (não conta como "refatorar código de negócio").
- **Risco:** 95% em módulos grandes (`complaints`, `billing`) pode esbarrar em ramos defensivos irrelevantes. **Mitigação:** `/* istanbul ignore next */` cirúrgico em branches de defesa puramente triviais (com justificativa em comentário).
- **Risco:** tempo de CI explodir. **Mitigação:** paralelização por arquivo do Vitest + Postgres local no runner.
