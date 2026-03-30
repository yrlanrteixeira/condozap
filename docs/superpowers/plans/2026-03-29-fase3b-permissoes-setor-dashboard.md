# Fase 3B — Permissões Granulares por Setor + Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement granular sector permissions with member overrides, a dedicated SETOR_MEMBER dashboard, and configurable action controls for complaint handling.

**Architecture:** Single Prisma migration for new models, then: permission resolution engine → CRUD endpoints → enforcement middleware → SETOR_MEMBER creation → dashboard backend → frontend (config, routing, dashboard, permission management, enforcement).

**Tech Stack:** React + TypeScript + TanStack Query + shadcn/ui + Tailwind (frontend), Fastify + Prisma + PostgreSQL (backend). Existing role `SETOR_MEMBER` in UserRole enum.

**Spec:** `docs/superpowers/specs/2026-03-29-fase3b-permissoes-setor-dashboard.md`

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add SectorPermission model**

After the `SectorMember` model (~line 391), add:

```prisma
model SectorPermission {
  id        String   @id @default(cuid())
  sectorId  String   @map("sector_id")
  action    String
  createdAt DateTime @default(now()) @map("created_at")

  sector    Sector   @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  @@unique([sectorId, action])
  @@index([sectorId])
  @@map("sector_permissions")
}
```

- [ ] **Step 2: Add SectorMemberPermissionOverride model**

```prisma
model SectorMemberPermissionOverride {
  id              String       @id @default(cuid())
  sectorMemberId  String       @map("sector_member_id")
  action          String
  granted         Boolean
  createdAt       DateTime     @default(now()) @map("created_at")

  sectorMember    SectorMember @relation(fields: [sectorMemberId], references: [id], onDelete: Cascade)

  @@unique([sectorMemberId, action])
  @@index([sectorMemberId])
  @@map("sector_member_permission_overrides")
}
```

- [ ] **Step 3: Add relations to existing models**

In the `Sector` model, add: `permissions SectorPermission[]`
In the `SectorMember` model, add: `permissionOverrides SectorMemberPermissionOverride[]`

- [ ] **Step 4: Generate Prisma client**

```bash
cd backend && npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(fase3b): add schema for sector permissions and member overrides"
```

---

## Task 2: Sector Permissions Resolution Engine + Middleware

**Files:**
- Create: `backend/src/auth/sector-permissions.ts`

- [ ] **Step 1: Create constants and resolution function**

```typescript
import { PrismaClient } from "@prisma/client";

export const SECTOR_ACTIONS = [
  "VIEW_COMPLAINTS",
  "COMMENT",
  "CHANGE_STATUS",
  "RESOLVE",
  "RETURN",
  "REASSIGN",
] as const;

export type SectorAction = (typeof SECTOR_ACTIONS)[number];

export const DEFAULT_SECTOR_PERMISSIONS: SectorAction[] = [
  "VIEW_COMPLAINTS",
  "COMMENT",
  "CHANGE_STATUS",
];

export async function resolveSectorMemberPermissions(
  prisma: PrismaClient,
  sectorMemberId: string,
  sectorId: string
): Promise<Set<string>> {
  const sectorPerms = await prisma.sectorPermission.findMany({
    where: { sectorId },
    select: { action: true },
  });
  const allowed = new Set(sectorPerms.map((p) => p.action));

  const overrides = await prisma.sectorMemberPermissionOverride.findMany({
    where: { sectorMemberId },
    select: { action: true, granted: true },
  });
  for (const override of overrides) {
    if (override.granted) allowed.add(override.action);
    else allowed.delete(override.action);
  }

  return allowed;
}
```

- [ ] **Step 2: Create requireSectorAction middleware**

In the same file, add:

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../shared/db/prisma";

// Map target status → required action for granular checks
const STATUS_ACTION_MAP: Record<string, SectorAction> = {
  RESOLVED: "RESOLVE",
  RETURNED: "RETURN",
};

export const requireSectorAction = (action: SectorAction) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as any;
    // Skip for non-SETOR_MEMBER roles (SETOR_MANAGER, SYNDIC, ADMIN etc have full access)
    if (!user || user.role !== "SETOR_MEMBER") return;

    const complaintId = Number((request.params as any).id);
    if (isNaN(complaintId)) return reply.status(400).send({ error: "ID inválido" });

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint?.sectorId) return reply.status(403).send({ error: "Ocorrência sem setor" });

    const membership = await prisma.sectorMember.findFirst({
      where: { userId: user.id, sectorId: complaint.sectorId, isActive: true },
    });
    if (!membership) return reply.status(403).send({ error: "Você não pertence a este setor" });

    const permissions = await resolveSectorMemberPermissions(prisma, membership.id, complaint.sectorId);

    // Check base action
    if (!permissions.has(action)) {
      return reply.status(403).send({ error: `Sem permissão para: ${action}` });
    }

    // For CHANGE_STATUS, also check granular status-specific actions from request body
    if (action === "CHANGE_STATUS") {
      const body = request.body as any;
      const targetStatus = body?.status as string;
      const requiredAction = STATUS_ACTION_MAP[targetStatus];
      if (requiredAction && !permissions.has(requiredAction)) {
        return reply.status(403).send({ error: `Sem permissão para: ${requiredAction}` });
      }
    }
  };
};
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/auth/sector-permissions.ts
git commit -m "feat(fase3b): add sector permissions resolution engine and middleware"
```

---

## Task 3: Integrate Middleware into Complaint Routes

**Files:**
- Modify: `backend/src/modules/complaints/complaints.routes.ts`

- [ ] **Step 1: Add requireSectorAction to existing endpoints**

Read `complaints.routes.ts` first. Import `requireSectorAction` from `../../auth/sector-permissions`.

Add the middleware to these existing routes (as an additional onRequest handler):
- `POST /:id/comment` → add `requireSectorAction("COMMENT")`
- `PATCH /:id/status` → add `requireSectorAction("CHANGE_STATUS")`
- `POST /:id/return` → add `requireSectorAction("RETURN")`

The middleware is a no-op for non-SETOR_MEMBER users, so existing behavior is preserved.

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/complaints/complaints.routes.ts
git commit -m "feat(fase3b): integrate sector permission middleware into complaint routes"
```

---

## Task 4: Sector Permissions CRUD Endpoints

**Files:**
- Create: `backend/src/modules/structure/sector-permissions.controller.ts`
- Modify: `backend/src/modules/structure/structure.routes.ts`

- [ ] **Step 1: Create permissions controller**

`sector-permissions.controller.ts`:

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { NotFoundError } from "../../shared/errors";
import { SECTOR_ACTIONS } from "../../auth/sector-permissions";

const updatePermissionsSchema = z.object({
  actions: z.array(z.enum(SECTOR_ACTIONS as any)).min(0),
});

const updateMemberOverridesSchema = z.object({
  overrides: z.array(z.object({
    action: z.enum(SECTOR_ACTIONS as any),
    granted: z.boolean(),
  })),
});

export async function getSectorPermissionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { sectorId } = request.params as { sectorId: string };

  const sector = await prisma.sector.findUnique({
    where: { id: sectorId },
    include: {
      permissions: { select: { action: true } },
      members: {
        where: { isActive: true },
        include: {
          user: { select: { name: true } },
          permissionOverrides: { select: { action: true, granted: true } },
        },
      },
    },
  });
  if (!sector) throw new NotFoundError("Setor");

  return reply.send({
    sectorPermissions: sector.permissions.map((p) => p.action),
    memberOverrides: sector.members.map((m) => ({
      memberId: m.id,
      memberName: m.user.name,
      overrides: m.permissionOverrides,
    })),
  });
}

export async function updateSectorPermissionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { sectorId } = request.params as { sectorId: string };
  const { actions } = updatePermissionsSchema.parse(request.body);

  // Verify sector exists
  const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
  if (!sector) throw new NotFoundError("Setor");

  // Replace all permissions
  await prisma.$transaction([
    prisma.sectorPermission.deleteMany({ where: { sectorId } }),
    ...actions.map((action) =>
      prisma.sectorPermission.create({ data: { sectorId, action } })
    ),
  ]);

  return reply.send({ actions });
}

export async function updateMemberPermissionOverridesHandler(request: FastifyRequest, reply: FastifyReply) {
  const { sectorId, memberId } = request.params as { sectorId: string; memberId: string };
  const { overrides } = updateMemberOverridesSchema.parse(request.body);

  const member = await prisma.sectorMember.findFirst({
    where: { id: memberId, sectorId },
  });
  if (!member) throw new NotFoundError("Membro do setor");

  await prisma.$transaction([
    prisma.sectorMemberPermissionOverride.deleteMany({ where: { sectorMemberId: memberId } }),
    ...overrides.map((o) =>
      prisma.sectorMemberPermissionOverride.create({
        data: { sectorMemberId: memberId, action: o.action, granted: o.granted },
      })
    ),
  ]);

  return reply.send({ overrides });
}
```

- [ ] **Step 2: Add routes**

In `structure.routes.ts`, add:

```typescript
import {
  getSectorPermissionsHandler,
  updateSectorPermissionsHandler,
  updateMemberPermissionOverridesHandler,
} from "./sector-permissions.controller";

// Inside the route function:
fastify.get("/:condominiumId/sectors/:sectorId/permissions", {
  onRequest: [fastify.authenticate, requireCondoAccess()],
}, getSectorPermissionsHandler);

fastify.put("/:condominiumId/sectors/:sectorId/permissions", {
  onRequest: [fastify.authenticate, requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]), requireCondoAccess()],
}, updateSectorPermissionsHandler);

fastify.put("/:condominiumId/sectors/:sectorId/members/:memberId/permissions", {
  onRequest: [fastify.authenticate, requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]), requireCondoAccess()],
}, updateMemberPermissionOverridesHandler);
```

Import `requireRole` from `../../shared/middlewares` if not already imported.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/structure/
git commit -m "feat(fase3b): add sector permissions CRUD endpoints"
```

---

## Task 5: Default Permissions on Sector Creation

**Files:**
- Modify: `backend/src/modules/structure/sectors.service.ts`

- [ ] **Step 1: Add default permissions when creating a sector**

Read `sectors.service.ts`. In the `createSector` function (lines 23-37), after creating the sector, add:

```typescript
import { DEFAULT_SECTOR_PERMISSIONS } from "../../auth/sector-permissions";

// After: const sector = await prisma.sector.create(...)
// Add default permissions:
await prisma.sectorPermission.createMany({
  data: DEFAULT_SECTOR_PERMISSIONS.map((action) => ({
    sectorId: sector.id,
    action,
  })),
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/structure/sectors.service.ts
git commit -m "feat(fase3b): add default permissions on sector creation"
```

---

## Task 6: Create SETOR_MEMBER User Endpoint

**Files:**
- Create: `backend/src/modules/user-management/sector-member.controller.ts`
- Modify: `backend/src/modules/user-management/user-management.routes.ts`

- [ ] **Step 1: Create controller**

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { ConflictError, NotFoundError } from "../../shared/errors";
import bcrypt from "bcryptjs";
import { UserRole as PrismaUserRole } from "@prisma/client";

const createSectorMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  password: z.string().min(8),
  condominiumId: z.string().min(1),
  sectorId: z.string().min(1),
});

export async function createSectorMemberHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = createSectorMemberSchema.parse(request.body);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new ConflictError("Email já está cadastrado no sistema");

  const sector = await prisma.sector.findUnique({ where: { id: body.sectorId } });
  if (!sector || sector.condominiumId !== body.condominiumId) {
    throw new NotFoundError("Setor");
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: hashedPassword,
        role: "SETOR_MEMBER" as PrismaUserRole,
        permissionScope: "LOCAL",
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: (request.user as any).id,
      },
    });

    await tx.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: body.condominiumId,
        role: "SETOR_MEMBER" as PrismaUserRole,
      },
    });

    const membership = await tx.sectorMember.create({
      data: {
        sectorId: body.sectorId,
        userId: user.id,
        isActive: true,
      },
    });

    return { user, membership };
  });

  return reply.code(201).send({
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
    sectorMemberId: result.membership.id,
  });
}
```

- [ ] **Step 2: Add route**

In `user-management.routes.ts`:
```typescript
import { createSectorMemberHandler } from "./sector-member.controller";

fastify.post("/create-sector-member", {
  onRequest: [fastify.authenticate, requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"])],
}, createSectorMemberHandler);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/user-management/
git commit -m "feat(fase3b): add create SETOR_MEMBER user endpoint"
```

---

## Task 7: Sector Dashboard Backend + GET /me Expansion

**Files:**
- Create: `backend/src/modules/sector-dashboard/sector-dashboard.controller.ts`
- Create: `backend/src/modules/sector-dashboard/sector-dashboard.routes.ts`
- Modify: `backend/src/app/app.ts`
- Modify: `backend/src/modules/auth/auth.routes.ts`

- [ ] **Step 1: Create dashboard controller**

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError } from "../../shared/errors";

export async function getSectorDashboardStatsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as any;
  const sectorId = (request.query as any).sectorId as string | undefined;

  // Find member's sector(s)
  const memberships = await prisma.sectorMember.findMany({
    where: { userId: user.id, isActive: true },
    select: { sectorId: true },
  });

  const targetSectorId = sectorId || memberships[0]?.sectorId;
  if (!targetSectorId || !memberships.some((m) => m.sectorId === targetSectorId)) {
    throw new BadRequestError("Setor não encontrado ou sem acesso");
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [openCount, resolvedLast30Days, slaData] = await Promise.all([
    prisma.complaint.count({
      where: { sectorId: targetSectorId, status: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } },
    }),
    prisma.complaint.count({
      where: {
        sectorId: targetSectorId,
        status: { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.complaint.findMany({
      where: {
        sectorId: targetSectorId,
        responseDueAt: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { responseAt: true, responseDueAt: true },
    }),
  ]);

  // Calculate SLA compliance
  const slaTotal = slaData.length;
  const slaCompliant = slaData.filter(
    (c) => c.responseAt && c.responseDueAt && new Date(c.responseAt) <= new Date(c.responseDueAt)
  ).length;
  const slaCompliancePercent = slaTotal > 0 ? Math.round((slaCompliant / slaTotal) * 100) : 100;

  // Calculate avg response time
  const responded = slaData.filter((c) => c.responseAt);
  const avgResponseTimeHours = responded.length > 0
    ? Math.round(
        responded.reduce((sum, c) => {
          return sum + (new Date(c.responseAt!).getTime() - new Date(c.responseDueAt!).getTime());
        }, 0) / responded.length / (1000 * 60 * 60)
      )
    : 0;

  return reply.send({
    openCount,
    resolvedLast30Days,
    slaCompliancePercent,
    avgResponseTimeHours: Math.abs(avgResponseTimeHours),
  });
}
```

- [ ] **Step 2: Create routes and register**

`sector-dashboard.routes.ts`:
```typescript
import { FastifyInstance } from "fastify";
import { getSectorDashboardStatsHandler } from "./sector-dashboard.controller";
import { requireRole } from "../../shared/middlewares";

export async function sectorDashboardRoutes(fastify: FastifyInstance) {
  fastify.get("/stats", {
    onRequest: [fastify.authenticate, requireRole(["SETOR_MEMBER", "SETOR_MANAGER"])],
  }, getSectorDashboardStatsHandler);
}
```

In `app.ts`, register:
```typescript
import { sectorDashboardRoutes } from "../modules/sector-dashboard/sector-dashboard.routes";
await fastify.register(sectorDashboardRoutes, { prefix: "/api/sector-dashboard" });
```

- [ ] **Step 3: Expand GET /me for SETOR_MEMBER**

In `auth.routes.ts`, in the GET /me handler, after building `userCondominiums`, add sector data for SETOR_MEMBER:

```typescript
// After existing code...
let sectors: any[] = [];
if (user.role === "SETOR_MEMBER" || user.role === "SETOR_MANAGER") {
  const sectorMemberships = await prisma.sectorMember.findMany({
    where: { userId: user.id, isActive: true },
    include: {
      sector: { select: { id: true, name: true } },
      permissionOverrides: { select: { action: true, granted: true } },
    },
  });

  for (const sm of sectorMemberships) {
    const sectorPerms = await prisma.sectorPermission.findMany({
      where: { sectorId: sm.sectorId },
      select: { action: true },
    });
    const allowed = new Set(sectorPerms.map((p) => p.action));
    for (const override of sm.permissionOverrides) {
      if (override.granted) allowed.add(override.action);
      else allowed.delete(override.action);
    }
    sectors.push({
      sectorId: sm.sector.id,
      sectorName: sm.sector.name,
      permissions: Array.from(allowed),
    });
  }
}

// Include in response:
return reply.send({
  ...userWithoutPassword,
  condominiums: userCondominiums,
  residentId: resident?.id,
  ...(sectors.length > 0 && { sectors }),
});
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/sector-dashboard/ backend/src/app/app.ts backend/src/modules/auth/auth.routes.ts
git commit -m "feat(fase3b): add sector dashboard backend and expand GET /me with sector permissions"
```

---

## Task 8: Frontend — Permissions Config + Sidebar + Routing

**Files:**
- Modify: `frontend/src/config/permissions.ts`
- Modify: `frontend/src/shared/components/layout/Sidebar.tsx`
- Modify: `frontend/src/shared/components/guards/InitialRedirect.tsx`
- Modify: Router file (find where routes are defined)

- [ ] **Step 1: Update frontend permissions**

In `permissions.ts`, add new permissions to the `Permissions` object:
```typescript
VIEW_SECTOR_DASHBOARD: "view_sector_dashboard",
VIEW_SECTOR_COMPLAINTS: "view_sector_complaints",
```

Replace `SETOR_MEMBER` permissions (currently lines 394-406):
```typescript
[UserRoles.SETOR_MEMBER]: [
  Permissions.VIEW_SECTOR_DASHBOARD,
  Permissions.VIEW_SECTOR_COMPLAINTS,
  Permissions.VIEW_COMPLAINTS,
  Permissions.VIEW_ANNOUNCEMENTS,
],
```

- [ ] **Step 2: Update Sidebar**

In `Sidebar.tsx`, add a "Dashboard do Setor" menu item visible for SETOR_MEMBER:
```typescript
{
  title: "Dashboard do Setor",
  href: "/sector-dashboard",
  icon: LayoutDashboard,
  permission: Permissions.VIEW_SECTOR_DASHBOARD,
},
```

Ensure other items like "Enviar Mensagens", "Moradores", "Estrutura", "Corpo Diretivo" are NOT shown for SETOR_MEMBER (they require permissions that SETOR_MEMBER no longer has).

- [ ] **Step 3: Update InitialRedirect**

In `InitialRedirect.tsx`, add case:
```typescript
} else if (userRole === UserRoles.SETOR_MEMBER || userRole === UserRoles.SETOR_MANAGER) {
  redirectTo = "/sector-dashboard";
}
```

- [ ] **Step 4: Add route for /sector-dashboard**

Find the router file and add route for `/sector-dashboard` → `SectorDashboardPage` with appropriate guard.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/config/permissions.ts frontend/src/shared/components/ frontend/src/
git commit -m "feat(fase3b): configure SETOR_MEMBER permissions, sidebar, and routing"
```

---

## Task 9: Frontend — Sector Dashboard Page

**Files:**
- Create: `frontend/src/features/sector-dashboard/pages/SectorDashboardPage.tsx`
- Create: `frontend/src/features/sector-dashboard/components/SectorDashboardKPIs.tsx`

- [ ] **Step 1: Create KPI component**

`SectorDashboardKPIs.tsx` — 4 cards:
- Abertas (number, orange icon)
- Tempo Médio de Resposta (hours, blue icon)
- Resolvidas 30d (number, green icon)
- SLA Cumprido (percentage, purple icon)

Fetch from `GET /api/sector-dashboard/stats?sectorId=X`. Use `useQuery`.

- [ ] **Step 2: Create dashboard page**

`SectorDashboardPage.tsx`:
- If user belongs to multiple sectors: show selector dropdown at the top
- KPIs section
- Complaints list filtered by sector (reuse existing complaint list components or create a simple table)
- Get sectors from `user.sectors` array (from GET /me response)

Use `useAuth()` to get user data. The `user.sectors` array has `sectorId`, `sectorName`, `permissions`.

- [ ] **Step 3: Export and register**

Create barrel exports. Register the page component in the route.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/sector-dashboard/
git commit -m "feat(fase3b): add sector dashboard page with KPIs and complaints list"
```

---

## Task 10: Frontend — Permission Management in SectorManagementDialog

**Files:**
- Modify: `frontend/src/features/structure/components/SectorManagementDialog.tsx`

- [ ] **Step 1: Add permissions section to sector management**

Read `SectorManagementDialog.tsx` first. Expand it with:

**Sector permissions section:**
- 6 toggles with Portuguese labels
- Fetch current via `GET /api/structure/:condoId/sectors/:sectorId/permissions`
- Save via `PUT /api/structure/:condoId/sectors/:sectorId/permissions`

**Member overrides:**
- In the members section, add "Permissões" button per member
- Opens sub-section with 3-state toggles: "Herdar" / "Conceder" / "Revogar"
- Save via `PUT /api/structure/:condoId/sectors/:sectorId/members/:memberId/permissions`

**Create SETOR_MEMBER button:**
- Add "Criar membro" button that opens a form (email, name, password)
- Calls `POST /api/users/create-sector-member`

Action labels map:
```typescript
const ACTION_LABELS: Record<string, string> = {
  VIEW_COMPLAINTS: "Ver ocorrências",
  COMMENT: "Comentar",
  CHANGE_STATUS: "Alterar status",
  RESOLVE: "Resolver",
  RETURN: "Devolver ao morador",
  REASSIGN: "Reatribuir",
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/structure/
git commit -m "feat(fase3b): add permission management to sector dialog"
```

---

## Task 11: Frontend — Enforcement in ComplaintDetailSheet

**Files:**
- Modify: `frontend/src/features/complaints/components/ComplaintDetailSheet.tsx`

- [ ] **Step 1: Add permission-based action visibility**

Read `ComplaintDetailSheet.tsx`. Get user's sector permissions from auth context:

```typescript
const { user } = useAuth();
const isSectorMember = user?.role === "SETOR_MEMBER";
const sectorPermissions = user?.sectors
  ?.find((s: any) => s.sectorId === complaint.sectorId)
  ?.permissions ?? [];

const canComment = !isSectorMember || sectorPermissions.includes("COMMENT");
const canChangeStatus = !isSectorMember || sectorPermissions.includes("CHANGE_STATUS");
const canResolve = !isSectorMember || sectorPermissions.includes("RESOLVE");
const canReturn = !isSectorMember || sectorPermissions.includes("RETURN");
const canReassign = !isSectorMember || sectorPermissions.includes("REASSIGN");
```

Apply conditionally:
- Comment textarea + template picker: disabled when `!canComment`
- Status select: hidden when `!canChangeStatus`
- "Resolvida" option in status select: removed when `!canResolve`
- "Devolver" button: hidden when `!canReturn`
- Reassign controls: hidden when `!canReassign`

For non-SETOR_MEMBER users, all `can*` variables are `true` — no change in behavior.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/complaints/
git commit -m "feat(fase3b): add permission-based action enforcement in complaint detail"
```

---

## Task 12: Final Verification

- [ ] **Step 1: TypeScript check frontend**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 2: TypeScript check backend**

```bash
cd backend && npx tsc --noEmit
```

Verify no new errors.

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd backend && npx prisma generate
```

- [ ] **Step 4: Commit fixes if needed**

```bash
git add -A && git commit -m "fix(fase3b): resolve final TypeScript and integration issues"
```
