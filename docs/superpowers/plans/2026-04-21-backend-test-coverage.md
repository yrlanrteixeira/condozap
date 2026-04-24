# Backend Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Spec: `docs/superpowers/specs/2026-04-21-backend-test-coverage-design.md`.

**Goal:** Atingir ≥90% de cobertura global no backend (`/backend`), com thresholds tiered por criticidade (95%/90%/80%), cobrindo o sistema como está, sem refatorar código de negócio.

**Architecture:** Vitest (já instalado) + `@vitest/coverage-v8`. Três camadas: unit (pura), integration (`createApp()` + Fastify `inject()` + Postgres real em DB dedicado), contract (webhooks disparados contra rotas reais). Serviços externos 100% mockados via `vi.mock`. Isolamento por teste via transação + rollback. Paralelização por módulo via subagentes `test-automator`.

**Tech Stack:** Node 22, Fastify 5, Prisma 7, Vitest 3, Postgres 16, `@vitest/coverage-v8`, `@faker-js/faker` (opcional).

**Estrutura do plano:** A Fase 0 (fundação) é altamente prescritiva — erros aqui bloqueiam todo o resto. As Fases 1-3 seguem um **playbook repetível por módulo** (Task Template) que cada subagente executa. A Fase 4 é sequencial e finaliza CI + docs + gate.

---

## Mapa de arquivos

**Criados (Fase 0):**
- `backend/.env.test`
- `backend/vitest.config.ts` (substitui o existente)
- `backend/test/global-setup.ts`
- `backend/test/setup.ts`
- `backend/test/helpers/build-test-app.ts`
- `backend/test/helpers/auth.ts`
- `backend/test/helpers/db.ts`
- `backend/test/factories/index.ts`
- `backend/test/factories/user.factory.ts`
- `backend/test/factories/condominium.factory.ts`
- `backend/test/factories/resident.factory.ts`
- `backend/test/factories/complaint.factory.ts`
- `backend/test/factories/bill.factory.ts`
- `backend/test/factories/notification.factory.ts`
- `backend/test/factories/sector.factory.ts`
- `backend/test/fixtures/abacatepay-webhook.json`
- `backend/test/fixtures/evolution-webhook.json`
- `backend/test/mocks/evolution-client.ts`
- `backend/test/mocks/abacatepay-client.ts`
- `backend/test/mocks/supabase-storage.ts`
- `backend/test/smoke.integration.test.ts`
- `backend/scripts/db-test-reset.ts`

**Modificados (Fase 0):**
- `backend/package.json` (scripts + devDependencies)
- `backend/.gitignore` (coverage/)

**Criados (Fases 1-3):** `src/modules/<mod>/**/*.test.ts` + `src/modules/<mod>/**/*.integration.test.ts`. Paths exatos definidos no Task Template.

**Criados (Fase 4):**
- `.github/workflows/test.yml`
- `docs/testing.md`

---

## Fase 0 — Fundação

Objetivo: até o final da fase, `npm test -- --coverage` roda verde com 1 teste smoke passando, infraestrutura toda funcional e thresholds configurados (sem atingir ainda — fase 0 não trava a build).

### Task 0.1 — Criar `.env.test` e variável de ambiente

**Files:**
- Create: `backend/.env.test`

- [ ] **Step 1: Criar `.env.test`**

Conteúdo (ajustar `DATABASE_URL_TEST` conforme Postgres local):

```dotenv
NODE_ENV=test
PORT=0
HOST=127.0.0.1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/condozap_test
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/condozap_test
JWT_SECRET=test-jwt-secret-not-for-prod-please
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
SUPABASE_ANON_KEY=test-anon-key
EVOLUTION_API_URL=http://localhost:9999
EVOLUTION_API_KEY=test-evolution-key
ABACATEPAY_API_KEY=test-abacatepay-key
ABACATEPAY_WEBHOOK_SECRET=test-webhook-secret
LOG_LEVEL=silent
```

- [ ] **Step 2: Adicionar `.env.test` ao controle de versão**

`.env.test` deve ser commitado (contém apenas valores fake). Verificar se `.gitignore` não bloqueia explicitamente — se bloquear, adicionar exceção `!.env.test`.

- [ ] **Step 3: Commit**

```bash
git add backend/.env.test backend/.gitignore
git commit -m "test: add .env.test with fake credentials for test suite"
```

### Task 0.2 — Criar database `condozap_test` e script de reset

**Files:**
- Create: `backend/scripts/db-test-reset.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Criar `backend/scripts/db-test-reset.ts`**

```typescript
import { execSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.test" });

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  throw new Error("DATABASE_URL_TEST not set in .env.test");
}

process.env.DATABASE_URL = url;

console.log("[db-test-reset] dropping and recreating schema...");
execSync("npx prisma migrate reset --force --skip-seed", {
  stdio: "inherit",
  env: process.env,
});
console.log("[db-test-reset] done.");
```

- [ ] **Step 2: Adicionar script no `package.json`**

Em `scripts`, adicionar:

```json
"db:test:reset": "tsx scripts/db-test-reset.ts",
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 3: Criar o database manualmente (uma vez)**

```bash
psql -U postgres -h localhost -c "CREATE DATABASE condozap_test;"
```

Expected: `CREATE DATABASE` (ou erro "already exists" — OK).

- [ ] **Step 4: Rodar reset**

```bash
cd backend && npm run db:test:reset
```

Expected: migrations aplicadas sem erro.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/db-test-reset.ts backend/package.json
git commit -m "test: add db:test:reset script and test/test:coverage npm scripts"
```

### Task 0.3 — Instalar `@vitest/coverage-v8` e `@faker-js/faker`

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Instalar**

```bash
cd backend && npm install --save-dev @vitest/coverage-v8@^3.0.5 @faker-js/faker@^9.0.0
```

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "test: add coverage-v8 and faker dev dependencies"
```

### Task 0.4 — Reescrever `vitest.config.ts` com coverage tiered

**Files:**
- Modify: `backend/vitest.config.ts`

- [ ] **Step 1: Substituir conteúdo**

```typescript
import { defineConfig } from "vitest/config";

const T1 = ["lines", "functions", "branches", "statements"].reduce(
  (acc, k) => ({ ...acc, [k]: 95 }),
  {}
);
const T2 = ["lines", "functions", "branches", "statements"].reduce(
  (acc, k) => ({ ...acc, [k]: 90 }),
  {}
);
const T3 = ["lines", "functions", "branches", "statements"].reduce(
  (acc, k) => ({ ...acc, [k]: 80 }),
  {}
);

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.integration.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/modules/**", "src/auth/**", "src/shared/**"],
      exclude: [
        "src/generated/**",
        "src/config/**",
        "src/server.ts",
        "src/app/**",
        "src/plugins/**",
        "**/*.routes.ts",
        "**/*.d.ts",
        "**/types/**",
        "prisma/**",
        "scripts/**",
        "test/**",
        "**/index.ts",
      ],
      thresholds: {
        // Tier 1 — 95%+
        "src/auth/**": T1,
        "src/modules/billing/**": T1,
        "src/modules/user-approval/**": T1,
        "src/modules/user-management/**": T1,
        "src/modules/complaints/**": T1,
        // Tier 2 — 90%+
        "src/modules/messages/**": T2,
        "src/modules/messaging/**": T2,
        "src/modules/notifications/**": T2,
        "src/modules/whatsapp/**": T2,
        "src/modules/evolution/**": T2,
        "src/modules/residents/**": T2,
        "src/modules/condominiums/**": T2,
        "src/modules/sla-cron/**": T2,
        "src/modules/automation/**": T2,
        "src/modules/canned-responses/**": T2,
        "src/shared/**": T2,
        // Tier 3 — 80%+
        "src/modules/dashboard/**": T3,
        "src/modules/sector-dashboard/**": T3,
        "src/modules/reports/**": T3,
        "src/modules/history/**": T3,
        "src/modules/announcements/**": T3,
        "src/modules/platform/**": T3,
        "src/modules/public/**": T3,
        "src/modules/structure/**": T3,
        "src/modules/notifier/**": T3,
        "src/modules/uploads/**": T3,
      },
    },
  },
});
```

> **Nota:** `pool: "forks"` com `singleFork: true` evita que múltiplos workers compartilhem o mesmo DB e corrompam transações. Em CI, pode-se trocar para paralelismo por arquivo depois que a suite estiver estável (otimização pós-Fase 4).

- [ ] **Step 2: Commit**

```bash
git add backend/vitest.config.ts
git commit -m "test: configure vitest coverage with tiered thresholds"
```

### Task 0.5 — `global-setup.ts`: migrate deploy antes da suite

**Files:**
- Create: `backend/test/global-setup.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
import { execSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

export default async function globalSetup(): Promise<void> {
  loadEnv({ path: ".env.test", override: true });

  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST not set — ensure backend/.env.test exists."
    );
  }

  process.env.DATABASE_URL = url;

  console.log("[test/global-setup] applying migrations to test database...");
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
  console.log("[test/global-setup] migrations applied.");
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/test/global-setup.ts
git commit -m "test: add global-setup to run prisma migrate deploy on test DB"
```

### Task 0.6 — `setup.ts`: hooks por teste (env + mocks globais)

**Files:**
- Create: `backend/test/setup.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
import { afterEach, beforeAll, vi } from "vitest";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.test", override: true });
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

// Mocks globais de serviços externos. Cada teste pode sobrescrever com vi.mocked(...).
vi.mock("axios");

beforeAll(() => {
  // Sanity: garante que estamos apontando para DB de teste.
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      `REFUSING TO RUN: DATABASE_URL does not contain "test": ${process.env.DATABASE_URL}`
    );
  }
});

afterEach(async () => {
  vi.restoreAllMocks();
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/test/setup.ts
git commit -m "test: add per-test setup with env guard and vi.restoreAllMocks"
```

### Task 0.7 — Helper `db.ts`: truncate entre testes

**Files:**
- Create: `backend/test/helpers/db.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
import { PrismaClient } from "../../src/generated/prisma";

let prisma: PrismaClient | null = null;

export const getTestPrisma = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL_TEST! } },
    });
  }
  return prisma;
};

export const truncateAll = async (): Promise<void> => {
  const p = getTestPrisma();
  // Ordem importa por FKs; usamos TRUNCATE CASCADE para cortar dependências.
  const tables: string[] = await p.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations'`
  ).then((rows: any[]) => rows.map((r) => r.tablename));

  if (tables.length === 0) return;

  const list = tables.map((t) => `"public"."${t}"`).join(", ");
  await p.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE;`);
};

export const disconnectTestPrisma = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};
```

> **Nota sobre estratégia de isolamento:** o spec menciona transação+rollback como preferência. A dificuldade: Fastify `inject()` + rotas que abrem transação própria quebram o aninhamento. Começamos com TRUNCATE (simples e à prova de bala). Se performance virar problema, migra para transação em sessão posterior.

- [ ] **Step 2: Import correto do Prisma client**

Confirmar com `ls src/generated/` que o caminho do client é `src/generated/prisma`. Se diferente, ajustar o import.

Run: `ls backend/src/generated/ | head`
Expected: diretório contendo o client gerado.

- [ ] **Step 3: Commit**

```bash
git add backend/test/helpers/db.ts
git commit -m "test: add db helper with truncateAll and shared test prisma client"
```

### Task 0.8 — Helper `build-test-app.ts`

**Files:**
- Create: `backend/test/helpers/build-test-app.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
import type { FastifyInstance } from "fastify";
import { createApp } from "../../src/app/app";
import { truncateAll } from "./db";
import { afterAll, afterEach, beforeAll } from "vitest";

let sharedApp: FastifyInstance | null = null;

export const getTestApp = async (): Promise<FastifyInstance> => {
  if (!sharedApp) {
    sharedApp = await createApp();
    await sharedApp.ready();
  }
  return sharedApp;
};

export const closeTestApp = async (): Promise<void> => {
  if (sharedApp) {
    await sharedApp.close();
    sharedApp = null;
  }
};

/**
 * Use no topo de cada arquivo integration.test.ts:
 *   setupIntegrationSuite();
 * Cuida de: criar app uma vez, truncar DB depois de cada teste, fechar ao final.
 */
export const setupIntegrationSuite = (): void => {
  beforeAll(async () => {
    await getTestApp();
  });

  afterEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await closeTestApp();
  });
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/test/helpers/build-test-app.ts
git commit -m "test: add build-test-app helper with setupIntegrationSuite"
```

### Task 0.9 — Helper `auth.ts`: signAsUser + authedInject

**Files:**
- Create: `backend/test/helpers/auth.ts`

- [ ] **Step 1: Criar arquivo**

```typescript
import type { FastifyInstance, InjectOptions } from "fastify";

export type TestUser = {
  id: string;
  role: string;
  condominiumId?: string | null;
};

export const signAsUser = (
  app: FastifyInstance,
  user: TestUser
): string => {
  // @fastify/jwt: app.jwt.sign usa o mesmo JWT_SECRET do .env.test
  return (app as any).jwt.sign({
    sub: user.id,
    role: user.role,
    condominiumId: user.condominiumId ?? null,
  });
};

export const authedInject = async (
  app: FastifyInstance,
  user: TestUser,
  opts: InjectOptions
) => {
  const token = signAsUser(app, user);
  return app.inject({
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
};
```

> **Nota:** o shape do payload JWT (`sub`, `role`, `condominiumId`) deve bater com o que o `authPlugin` espera. Verificar em `src/auth/` e ajustar se necessário (ex.: pode ser `userId` em vez de `sub`).

- [ ] **Step 2: Verificar shape do JWT no authPlugin**

Run: `grep -r "jwt.verify\|jwt.decode\|request.user" backend/src/auth/ backend/src/plugins/ | head -30`

Ajustar o payload acima conforme o shape real. Commit só depois disso.

- [ ] **Step 3: Commit**

```bash
git add backend/test/helpers/auth.ts
git commit -m "test: add auth helpers signAsUser and authedInject"
```

### Task 0.10 — Factories base (user, condominium, resident, complaint, bill, notification, sector)

**Files:**
- Create: `backend/test/factories/index.ts`
- Create: `backend/test/factories/user.factory.ts`
- Create: `backend/test/factories/condominium.factory.ts`
- Create: `backend/test/factories/resident.factory.ts`
- Create: `backend/test/factories/complaint.factory.ts`
- Create: `backend/test/factories/bill.factory.ts`
- Create: `backend/test/factories/notification.factory.ts`
- Create: `backend/test/factories/sector.factory.ts`

- [ ] **Step 1: Conferir shape das entidades no Prisma**

Run: `grep -A 30 "^model User\|^model Condominium\|^model Complaint\|^model PaymentBill" backend/prisma/schema.prisma | head -200`

Use o output para escrever factories com campos obrigatórios corretos. Sem essa verificação, as factories quebram no primeiro teste.

- [ ] **Step 2: Criar `user.factory.ts`**

```typescript
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { getTestPrisma } from "../helpers/db";

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "SYNDIC"
  | "SECTOR"
  | "RESIDENT";

export const makeUser = async (overrides: Partial<{
  email: string;
  name: string;
  role: UserRole;
  condominiumId: string | null;
  password: string;
}> = {}) => {
  const p = getTestPrisma();
  const plain = overrides.password ?? "test-password-123";
  return p.user.create({
    data: {
      email: overrides.email ?? faker.internet.email().toLowerCase(),
      name: overrides.name ?? faker.person.fullName(),
      role: overrides.role ?? "RESIDENT",
      passwordHash: await bcrypt.hash(plain, 4),
      condominiumId: overrides.condominiumId ?? null,
      // Demais campos obrigatórios: ajustar conforme schema.prisma
    },
  });
};
```

> **AÇÃO OBRIGATÓRIA DO EXECUTOR:** ler `backend/prisma/schema.prisma` e preencher TODOS os campos `@required` sem default. Se faltar campo, `p.user.create` falha com Prisma error — use a mensagem pra identificar o que falta.

- [ ] **Step 3: Criar `condominium.factory.ts`**

```typescript
import { faker } from "@faker-js/faker";
import { getTestPrisma } from "../helpers/db";

export const makeCondominium = async (overrides: Partial<{
  name: string;
  cnpj: string;
}> = {}) => {
  const p = getTestPrisma();
  return p.condominium.create({
    data: {
      name: overrides.name ?? faker.company.name(),
      cnpj: overrides.cnpj ?? faker.string.numeric(14),
      // Ajustar conforme schema.prisma
    },
  });
};
```

- [ ] **Step 4: Criar factories restantes**

Mesmo padrão para `resident`, `complaint`, `bill`, `notification`, `sector`. Cada uma:
1. Import `faker` e `getTestPrisma`.
2. Função `make<Entity>(overrides)` que chama `p.<entity>.create`.
3. Campos obrigatórios do schema preenchidos com valores razoáveis.
4. Relações (ex.: `complaint` precisa de `resident` e `condominium`): aceitar ID via override, ou criar inline se não passado.

Exemplo para `complaint.factory.ts`:

```typescript
import { faker } from "@faker-js/faker";
import { getTestPrisma } from "../helpers/db";
import { makeCondominium } from "./condominium.factory";
import { makeUser } from "./user.factory";

export const makeComplaint = async (overrides: Partial<{
  condominiumId: string;
  createdById: string;
  title: string;
  description: string;
  status: string;
}> = {}) => {
  const p = getTestPrisma();
  const condominiumId =
    overrides.condominiumId ?? (await makeCondominium()).id;
  const createdById =
    overrides.createdById ??
    (await makeUser({ role: "RESIDENT", condominiumId })).id;

  return p.complaint.create({
    data: {
      title: overrides.title ?? faker.lorem.sentence(),
      description: overrides.description ?? faker.lorem.paragraph(),
      status: overrides.status ?? "OPEN",
      condominiumId,
      createdById,
      // Ajustar conforme schema.prisma (sector, priority, dueAt, etc.)
    },
  });
};
```

- [ ] **Step 5: Criar `index.ts` reexportando tudo**

```typescript
export * from "./user.factory";
export * from "./condominium.factory";
export * from "./resident.factory";
export * from "./complaint.factory";
export * from "./bill.factory";
export * from "./notification.factory";
export * from "./sector.factory";
```

- [ ] **Step 6: Commit**

```bash
git add backend/test/factories/
git commit -m "test: add entity factories (user, condominium, resident, complaint, bill, notification, sector)"
```

### Task 0.11 — Mocks globais de serviços externos

**Files:**
- Create: `backend/test/mocks/evolution-client.ts`
- Create: `backend/test/mocks/abacatepay-client.ts`
- Create: `backend/test/mocks/supabase-storage.ts`
- Create: `backend/test/fixtures/abacatepay-webhook.json`
- Create: `backend/test/fixtures/evolution-webhook.json`

- [ ] **Step 1: Localizar os clients reais**

Run: `grep -rn "axios.create\|new S3Client\|createClient.*supabase" backend/src/modules/ backend/src/shared/ | head -30`

Identifique os arquivos de client (ex.: `src/modules/evolution/evolution.client.ts`). Cada mock deve ter o mesmo caminho relativo para `vi.mock` funcionar.

- [ ] **Step 2: Criar `evolution-client.ts` mock**

Exemplo (ajustar path e API conforme cliente real):

```typescript
import { vi } from "vitest";

export const mockEvolutionClient = {
  sendTextMessage: vi.fn().mockResolvedValue({ status: "sent", id: "msg_1" }),
  sendMediaMessage: vi.fn().mockResolvedValue({ status: "sent", id: "msg_1" }),
  createInstance: vi.fn().mockResolvedValue({ instanceName: "test-instance" }),
};

vi.mock("../../src/modules/evolution/evolution.client", () => ({
  evolutionClient: mockEvolutionClient,
  default: mockEvolutionClient,
}));
```

- [ ] **Step 3: Criar `abacatepay-client.ts` mock** — mesma estrutura.

- [ ] **Step 4: Criar `supabase-storage.ts` mock** — mesma estrutura, retornando URLs fake para upload/download.

- [ ] **Step 5: Criar fixtures JSON**

Disparar uma chamada real em staging (ou copiar de logs existentes) e salvar payloads em `test/fixtures/abacatepay-webhook.json` e `test/fixtures/evolution-webhook.json`. Garantem que contract tests usem payloads reais de provedor.

Se não houver payload disponível, criar um stub documentado com os campos mínimos usados pelo parser do módulo.

- [ ] **Step 6: Importar mocks no `setup.ts`**

Editar `backend/test/setup.ts` adicionando após `vi.mock("axios")`:

```typescript
import "./mocks/evolution-client";
import "./mocks/abacatepay-client";
import "./mocks/supabase-storage";
```

- [ ] **Step 7: Commit**

```bash
git add backend/test/mocks/ backend/test/fixtures/ backend/test/setup.ts
git commit -m "test: mock external clients (evolution, abacatepay, supabase) globally"
```

### Task 0.12 — Smoke integration test

**Files:**
- Create: `backend/test/smoke.integration.test.ts`

- [ ] **Step 1: Criar o teste**

```typescript
import { describe, expect, it } from "vitest";
import { getTestApp, setupIntegrationSuite } from "./helpers/build-test-app";

setupIntegrationSuite();

describe("smoke", () => {
  it("app starts and responds to /health (or 404 if route absent)", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    // Aceita 200 se a rota existir, 404 se não — o que importa é que o app subiu.
    expect([200, 404]).toContain(res.statusCode);
  });

  it("rejects protected route without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/complaints",
    });
    expect([401, 403]).toContain(res.statusCode);
  });
});
```

- [ ] **Step 2: Ajustar `vitest.config.ts` para incluir `test/`**

Editar `include`:

```typescript
include: [
  "src/**/*.test.ts",
  "src/**/*.integration.test.ts",
  "test/**/*.test.ts",
  "test/**/*.integration.test.ts",
],
```

- [ ] **Step 3: Rodar**

```bash
cd backend && npm test -- test/smoke.integration.test.ts
```

Expected: 2 testes passando.

- [ ] **Step 4: Rodar com coverage**

```bash
cd backend && npm run test:coverage
```

Expected: execução completa, relatório impresso, thresholds **não atingidos** (esperado na Fase 0 — muitos arquivos ainda sem teste). Falha do threshold é aceitável aqui; o importante é que a infra funciona.

- [ ] **Step 5: Commit**

```bash
git add backend/test/smoke.integration.test.ts backend/vitest.config.ts
git commit -m "test: add smoke integration test validating test infra"
```

### Task 0.13 — Ajustar `.gitignore` e fechar Fase 0

**Files:**
- Modify: `backend/.gitignore`

- [ ] **Step 1: Adicionar cobertura ao .gitignore**

Adicionar linha `coverage/` se não existir.

- [ ] **Step 2: Commit final da fase**

```bash
git add backend/.gitignore
git commit -m "test: ignore coverage/ directory"
```

- [ ] **Step 3: Gate Fase 0 — rodar suite completa**

```bash
cd backend && npm test
```

Expected: suite roda, smoke tests passam, nenhum erro de infraestrutura. Thresholds podem falhar — OK na Fase 0.

---

## Task Template — Fases 1, 2 e 3 (por módulo)

Cada módulo listado nas Fases 1-3 executa este template. **Um subagente `test-automator` por módulo** (ou grupo definido no spec).

### Template: Cobertura do módulo `<MOD>`

**Tier:** `<T1 95% | T2 90% | T3 80%>`
**Files:**
- Create: `backend/src/modules/<MOD>/<arquivo>.test.ts` (unit — para lógica pura existente)
- Create: `backend/src/modules/<MOD>/<arquivo>.integration.test.ts` (integration — para cada `*.controller.ts` / `*.routes.ts`)

- [ ] **Step 1: Mapear arquivos do módulo**

```bash
ls backend/src/modules/<MOD>/
```

Para cada arquivo não excluído por `coverage.exclude` (ver `vitest.config.ts`), haverá teste correspondente.

- [ ] **Step 2: Classificar**
  - `*.schema.ts` → unit (validar inputs válidos/inválidos em cada schema Zod)
  - `*.service.ts` → coberto por integration; unit só se tiver lógica pura isolável
  - `*.controller.ts` → integration (rotas)
  - `*.repository.ts` → coberto por integration
  - `*.routes.ts` → excluído do coverage, mas exercitado por integration
  - Lógica pura (`complaints.sla.ts`, `complaints.transitions.ts`, mappers) → unit

- [ ] **Step 3: Escrever unit tests (uma função pura de cada vez, TDD inverso)**

Para cada função pura:
1. Ler a assinatura e a implementação.
2. Escrever um teste que exercita o caminho feliz.
3. Escrever testes para cada branch (`if`/`else`, `switch`, early returns, throws).
4. Rodar `npm test -- src/modules/<MOD>/<file>.test.ts`.
5. Se cobertura do arquivo < threshold do tier, identificar linhas descobertas via `npm run test:coverage` (HTML em `coverage/index.html`) e adicionar testes direcionados.

Exemplo de estrutura:

```typescript
import { describe, expect, it } from "vitest";
import { calculateSlaDeadline } from "./complaints.sla";

describe("calculateSlaDeadline", () => {
  it("returns createdAt + slaHours for LOW priority", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const result = calculateSlaDeadline(createdAt, "LOW");
    expect(result.toISOString()).toBe("2026-01-08T00:00:00Z"); // 168h = 7d
  });
  // + outros casos por prioridade, overrides, edge cases...
});
```

- [ ] **Step 4: Escrever integration tests (uma rota de cada vez)**

Para cada rota registrada em `*.routes.ts` ou `*.controller.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { makeUser, makeCondominium } from "../../../test/factories";

setupIntegrationSuite();

describe("<MOD> routes", () => {
  describe("POST /api/<MOD>", () => {
    it("creates a <resource> for authenticated SYNDIC", async () => {
      const app = await getTestApp();
      const condo = await makeCondominium();
      const syndic = await makeUser({
        role: "SYNDIC",
        condominiumId: condo.id,
      });

      const res = await authedInject(
        app,
        { id: syndic.id, role: "SYNDIC", condominiumId: condo.id },
        {
          method: "POST",
          url: "/api/<MOD>",
          payload: {
            /* payload válido conforme schema */
          },
        }
      );

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ id: expect.any(String) });
    });

    it("rejects when role is RESIDENT", async () => { /* ... */ });
    it("returns 400 when payload is invalid", async () => { /* ... */ });
    it("returns 401 when unauthenticated", async () => { /* ... */ });
    it("enforces condominium isolation (cross-condo forbidden)", async () => { /* ... */ });
  });
  // Repetir para cada rota: GET list, GET :id, PATCH, DELETE, rotas específicas.
});
```

**Casos mínimos obrigatórios por rota:**
- Caminho feliz para cada role autorizado.
- 401 sem token.
- 403 para role não autorizado.
- 400 para payload inválido (campo faltando, tipo errado).
- 404 para recurso inexistente (quando aplicável).
- Isolamento por condomínio (quando aplicável).
- Efeito colateral esperado validado no DB (query pós-request via `getTestPrisma()`).

- [ ] **Step 5: Rodar coverage do módulo isolado**

```bash
cd backend && npm run test:coverage -- src/modules/<MOD>
```

Verificar output: cada arquivo ≥ threshold do tier.

- [ ] **Step 6: Preencher gaps**

Abrir `coverage/index.html`, navegar até `src/modules/<MOD>`, identificar linhas vermelhas/amarelas, escrever testes direcionados.

- [ ] **Step 7: Commit por módulo**

```bash
git add backend/src/modules/<MOD>/
git commit -m "test(<MOD>): add unit+integration tests — <N>% coverage"
```

---

## Fase 1 — Tier 1 (paralelo, 5 tasks)

Dispatch 5 subagentes `test-automator` em paralelo via `superpowers:dispatching-parallel-agents`. Cada um recebe o Task Template com `<MOD>` preenchido. **Meta: 95% por módulo.**

### Task 1.A — `auth` (95%)

- [ ] **Step 1: Executar Task Template para `src/auth/`** — note que este módulo fica em `src/auth/`, não em `src/modules/`.
- [ ] **Step 2: Expandir `role-permissions.test.ts` existente** se cobertura parcial.
- [ ] **Step 3: Casos específicos obrigatórios:**
  - JWT: sign/verify com payload válido e inválido.
  - Expiração de token (use JWT com `exp` passado).
  - Bcrypt: hash consistente, compare correto, compare com hash inválido.
  - Guards: `requireRole(["SYNDIC"])` passa/falha conforme role, `requireCondominiumAccess` rejeita cross-tenant.
  - Rate-limit em `/auth/login` (X tentativas → 429).
- [ ] **Step 4: Rodar `npm run test:coverage -- src/auth` e confirmar ≥95%.**
- [ ] **Step 5: Commit.**

### Task 1.B — `billing` (95%)

- [ ] **Step 1: Executar Task Template para `src/modules/billing/`.**
- [ ] **Step 2: Casos específicos obrigatórios:**
  - Cálculo de preço por tier (incluindo descontos por volume — ver memória S971).
  - `toPublicBillDto` nunca retorna `providerPayload` (regression 4105/4106/4115).
  - Webhook AbacatePay: status pago, falhou, estornado — usando fixture real.
  - Idempotência de webhook: disparar o mesmo payload 2x → 1 `PaymentBill` criado.
  - Autorização: RESIDENT não lista bills de outros; SUPER_ADMIN removido (regression S983) — confirmar rota não aceita esse role.
- [ ] **Step 3: Rodar coverage e confirmar ≥95%.**
- [ ] **Step 4: Commit.**

### Task 1.C — `user-approval` + `user-management` (95%)

- [ ] **Step 1: Executar Task Template para ambos os módulos.**
- [ ] **Step 2: Casos específicos obrigatórios:**
  - Fluxo resident → approval: criar pending, aprovar, confirmar notificação disparada, confirmar user ativo.
  - Rejeição: criar pending, rejeitar, confirmar user não criado.
  - LGPD consent: aceitar → sessão válida (regression S982 "tela preta").
  - Troca de senha: senha antiga correta/incorreta, validação de força.
  - Role ceiling em runtime: SYNDIC não pode criar SUPER_ADMIN; ADMIN não pode promover além do próprio.
- [ ] **Step 3: Rodar coverage e confirmar ≥95% em cada módulo.**
- [ ] **Step 4: Commit.**

### Task 1.D — `complaints` unit (SLA + transitions) (95%)

- [ ] **Step 1: Executar Task Template, SOMENTE `.test.ts` unit.**
- [ ] **Step 2: Cobertura obrigatória:**
  - `complaints.sla.ts`: cada prioridade, cada estado de pausa, breach detection, horário comercial se aplicável.
  - `complaints.transitions.ts`: cada transição de state machine (OPEN → IN_PROGRESS, etc.); cada transição inválida rejeitada; efeitos colaterais documentados.
  - `complaints.schema.ts`: cada schema Zod com 1 input válido + 1 inválido por campo.
- [ ] **Step 3: Rodar coverage só desses arquivos e confirmar ≥95%.**
- [ ] **Step 4: Commit.**

### Task 1.E — `complaints` integration (todos os controllers) (95%)

- [ ] **Step 1: Executar Task Template, SOMENTE `.integration.test.ts` para cada controller:**
  - `complaints.controller.ts` — CRUD, filtros, paginação.
  - `complaints-chat.controller.ts` — envio/listagem de mensagens.
  - `complaints-reopen.controller.ts` — reabertura.
  - `complaints-return.controller.ts` — devolução.
  - `complaints-nudge.controller.ts` — "cobrar setor" disparando notificação (regression S1010).
  - `complaints-complement.controller.ts` — complemento.
- [ ] **Step 2: Casos específicos obrigatórios:**
  - Criação atômica com anexos (regression 4073: verifica que anexo + complaint persistem juntos ou nada persiste em caso de erro).
  - CSAT: confirmar validação explícita de coerção (regression 4076).
  - Anexos 403 (regression S1007): resident do condo X não acessa anexo do condo Y.
- [ ] **Step 3: Rodar coverage do módulo completo (junto com Task 1.D) e confirmar ≥95%.**
- [ ] **Step 4: Commit.**

### Task 1.F — Gate Fase 1

- [ ] **Step 1: Rodar suite completa.**

```bash
cd backend && npm run test:coverage
```

- [ ] **Step 2: Confirmar thresholds Tier 1 atendidos no output.**

Expected: sem erro de threshold para `src/auth/**`, `src/modules/billing/**`, `src/modules/user-approval/**`, `src/modules/user-management/**`, `src/modules/complaints/**`. Tiers 2 e 3 ainda falham — OK.

- [ ] **Step 3: Merge/commit das 5 tasks.**

---

## Fase 2 — Tier 2 (paralelo, 4 tasks)

Dispatch 4 subagentes em paralelo. **Meta: 90% por módulo.**

### Task 2.F — `messages` + `messaging` + `whatsapp` + `evolution` (90%)

- [ ] **Step 1: Executar Task Template para cada um dos 4 módulos.**
- [ ] **Step 2: Casos específicos obrigatórios:**
  - `whatsapp`/`evolution`: webhook inbound usando fixture (`test/fixtures/evolution-webhook.json`) — parser produz mensagem persistida correta.
  - Outbound: chamada ao mock `evolutionClient.sendTextMessage` com payload correto; falha simulada → retry ou erro propagado conforme código atual.
- [ ] **Step 3: Coverage ≥90% em cada módulo.**
- [ ] **Step 4: Commit.**

### Task 2.G — `notifications` + `sla-cron` + `automation` (90%)

- [ ] **Step 1: Executar Task Template para os 3 módulos.**
- [ ] **Step 2: Casos específicos obrigatórios:**
  - `notifications`: builders de payload por tipo (cada branch do switch/if/match).
  - `sla-cron`: chamar a função do job diretamente (sem cron) contra DB populado com complaints em breach; confirmar notifications criadas.
  - Navegação a partir de notificação (regression S1010): endpoint retorna metadados corretos.
- [ ] **Step 3: Coverage ≥90%.**
- [ ] **Step 4: Commit.**

### Task 2.H — `residents` + `condominiums` (90%)

- [ ] **Step 1: Executar Task Template para ambos.**
- [ ] **Step 2: Casos específicos obrigatórios:**
  - `condominiums`: estrutura (torres/unidades) — criar condomínio, adicionar torres/unidades, listar.
  - Associação síndico/sector: um condomínio pode ter N síndicos; remoção.
  - `residents`: vínculo com unidade (não pode vincular em unidade inexistente ou de outro condo).
- [ ] **Step 3: Coverage ≥90%.**
- [ ] **Step 4: Commit.**

### Task 2.I — `canned-responses` (90%)

- [ ] **Step 1: Executar Task Template.**
- [ ] **Step 2: Casos específicos obrigatórios:**
  - SYNDIC consegue criar canned response (regression S982 — bug anterior bloqueava isso).
  - SECTOR member consegue criar.
  - Listagem filtrada por condomínio.
  - Edição/exclusão restrita ao criador ou SYNDIC.
- [ ] **Step 3: Coverage ≥90%.**
- [ ] **Step 4: Commit.**

### Task 2.J — `shared/**` (90%)

Esta é uma task sequencial (sem paralelização — muito cross-cutting). Entra como "limpeza" após as 4 paralelas.

- [ ] **Step 1: Listar arquivos em `src/shared/`.**
- [ ] **Step 2: Para cada função exportada, escrever unit test exaustivo.**
- [ ] **Step 3: Coverage ≥90%.**
- [ ] **Step 4: Commit.**

### Task 2.K — Gate Fase 2

- [ ] **Step 1: `npm run test:coverage` — confirmar thresholds Tier 1 + Tier 2 OK.**

---

## Fase 3 — Tier 3 (paralelo, 2 tasks)

Dispatch 2 subagentes. **Meta: 80% por módulo.**

### Task 3.J — `dashboard` + `sector-dashboard` + `reports` + `history` (80%)

- [ ] **Step 1: Executar Task Template para cada.**
- [ ] **Step 2: Casos específicos:**
  - Queries agregadas em `dashboard`/`reports`: popular DB via factories, chamar endpoint, confirmar números (contagens, médias).
  - `history`: listagem com paginação (opt-in — regression commit 9d73774).
- [ ] **Step 3: Coverage ≥80%.**
- [ ] **Step 4: Commit.**

### Task 3.K — `announcements` + `platform` + `public` + `structure` + `notifier` + `uploads` (80%)

- [ ] **Step 1: Executar Task Template para cada.**
- [ ] **Step 2: Casos específicos:**
  - `uploads`: upload via multipart (Fastify `inject` com `payload` multipart), download, autorização por condomínio (regression 403 do S1007).
  - `public`: endpoints anônimos — sem token, não vazam dados de outros condomínios.
- [ ] **Step 3: Coverage ≥80%.**
- [ ] **Step 4: Commit.**

### Task 3.L — Gate Fase 3

- [ ] **Step 1: `npm run test:coverage` — todos os thresholds verdes.**

---

## Fase 4 — Fechamento

### Task 4.1 — GitHub Actions workflow

**Files:**
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Criar workflow**

```yaml
name: Backend Tests

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: condozap_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/condozap_test
      DATABASE_URL_TEST: postgresql://postgres:postgres@localhost:5432/condozap_test
      JWT_SECRET: ci-jwt-secret
      SUPABASE_URL: http://localhost:54321
      SUPABASE_SERVICE_ROLE_KEY: ci-service-role
      SUPABASE_ANON_KEY: ci-anon-key
      EVOLUTION_API_URL: http://localhost:9999
      EVOLUTION_API_KEY: ci-evolution-key
      ABACATEPAY_API_KEY: ci-abacatepay-key
      ABACATEPAY_WEBHOOK_SECRET: ci-webhook-secret
      LOG_LEVEL: silent

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Apply migrations
        run: npx prisma migrate deploy

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: backend/coverage/
          retention-days: 14
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add GitHub Actions workflow for backend tests with coverage gates"
```

### Task 4.2 — Documentação

**Files:**
- Create: `docs/testing.md`

- [ ] **Step 1: Criar `docs/testing.md`**

Conteúdo (cabeçalhos mínimos, preencher em prosa):

```markdown
# Testing Guide — Condozap Backend

## Prerequisites
- Postgres 16 rodando localmente
- Database `condozap_test` criado: `psql -U postgres -c "CREATE DATABASE condozap_test;"`
- `backend/.env.test` presente (valores default do repo funcionam para dev local)

## Running Tests
- `cd backend && npm test` — roda toda a suite
- `npm run test:watch` — watch mode
- `npm run test:coverage` — com relatório de cobertura (abre `coverage/index.html`)
- `npm run db:test:reset` — reseta o DB de teste (em caso de corrupção/migration nova)

## Writing New Tests
### Unit
- Arquivo: `src/modules/<mod>/<file>.test.ts`
- Sem I/O; mocke dependências com `vi.mock`.

### Integration
- Arquivo: `src/modules/<mod>/<file>.integration.test.ts`
- Use `setupIntegrationSuite()` no topo
- Use factories de `test/factories/`
- Use `authedInject(app, user, opts)` para requests autenticadas

## Coverage Thresholds
Tiered por criticidade — ver `vitest.config.ts`.

## Conventions
- Um arquivo de teste por arquivo de código
- Truncate acontece no `afterEach` — cada teste começa com DB limpo
- Mocks globais de serviços externos em `test/mocks/`
- Fixtures em `test/fixtures/`
```

- [ ] **Step 2: Commit**

```bash
git add -f docs/testing.md
git commit -m "docs: add backend testing guide"
```

### Task 4.3 — Gate final

- [ ] **Step 1: Rodar suite completa local**

```bash
cd backend && npm run test:coverage
```

Expected: suite verde. Output deve mostrar:
- 0 testes com `.skip`, `.todo`, `.only` — confirmar com: `grep -rn "test.skip\|test.todo\|it.only\|describe.only\|it.skip\|describe.skip" backend/src backend/test`
- Cobertura global ≥90% (lines + branches + functions)
- Nenhum threshold violado

- [ ] **Step 2: Subir branch, abrir PR, aguardar CI verde**

```bash
git push -u origin <branch>
gh pr create --title "test: backend test suite with >=90% coverage" --body "See docs/superpowers/specs/2026-04-21-backend-test-coverage-design.md"
```

- [ ] **Step 3: Invocar `superpowers:verification-before-completion`** para validar gate antes de declarar pronto.

- [ ] **Step 4: Declarar Fase 1 (backend) concluída**

Após merge, backend está pronto. Frontend começa em plano separado.

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** Todas as 7 seções do spec estão cobertas — Seção 1 (arquitetura) nas Tasks 0.4-0.12; Seção 2 (infra) na Fase 0; Seção 3 (mapeamento) nas Fases 1-3; Seção 4 (ordem) reflete a estrutura; Seção 5 (thresholds/CI/critérios) nas Tasks 0.4 + 4.1 + 4.3; Seção 6 (deps novas) na Task 0.3; Seção 7 (riscos) tratada com fallback TRUNCATE na Task 0.7.
- **Placeholders:** Cada task tem comando e código executáveis. Nas Fases 1-3 o Task Template substitui a repetição literal — intencional, pois escrever todos os testes individualmente resultaria em ~800 tasks; o executor humano/agente expande o template com contexto do módulo.
- **Consistência de tipos:** helpers (`signAsUser`, `authedInject`, `setupIntegrationSuite`, `getTestApp`, `makeUser`, `getTestPrisma`, `truncateAll`) usados nas Fases 1-3 são todos definidos nas Tasks 0.7-0.10.
- **Pontos abertos conhecidos (decisões do executor, não placeholders):**
  1. Shape exato do payload JWT (Task 0.9 Step 2) — exige leitura do `authPlugin`.
  2. Campos obrigatórios do Prisma nas factories (Task 0.10 Step 1) — exige leitura do `schema.prisma`.
  3. Paths dos clients externos para `vi.mock` (Task 0.11 Step 1) — exige grep.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-21-backend-test-coverage.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatcho um subagente fresh por task, reviso entre tasks, itero rápido. Combina bem com a paralelização já planejada nas Fases 1-3.

**2. Inline Execution** — Executo as tasks nesta sessão via `superpowers:executing-plans`, com checkpoints de revisão entre fases.

**Qual abordagem?**
