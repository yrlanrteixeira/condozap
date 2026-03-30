# Fase 3A — Melhorias Operacionais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 3 operational improvements: canned responses for complaint handling, complaint return/finalization flow with auto-close and reopen, and council member tower restriction.

**Architecture:** Single Prisma migration for all schema changes, then feature-by-feature: backend endpoints → frontend integration. Canned responses are independent. Complaint flow extends existing transitions system. Tower restriction extends AccessContext.

**Tech Stack:** React + TypeScript + TanStack Query + shadcn/ui + Tailwind (frontend), Fastify + Prisma + PostgreSQL + node-cron (backend), WhatsApp via `whatsappService.sendTextMessage()`.

**Spec:** `docs/superpowers/specs/2026-03-29-fase3a-melhorias-operacionais.md`

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add CannedResponse model**

After the existing models, add:

```prisma
model CannedResponse {
  id              String       @id @default(cuid())
  condominiumId   String?      @map("condominium_id")
  sectorId        String?      @map("sector_id")
  title           String
  content         String       @db.Text
  createdBy       String       @map("created_by")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  condominium     Condominium? @relation(fields: [condominiumId], references: [id])
  sector          Sector?      @relation(fields: [sectorId], references: [id])

  @@index([condominiumId])
  @@index([sectorId])
  @@map("canned_responses")
}
```

Add `cannedResponses CannedResponse[]` relation to both the `Condominium` and `Sector` models.

- [ ] **Step 2: Add new ComplaintStatus enum values**

In the `ComplaintStatus` enum, add before the closing brace:
```prisma
  RETURNED
  REOPENED
```

- [ ] **Step 3: Add new fields**

In the `Complaint` model, after `lastNudgedAt`:
```prisma
  closedAt         DateTime?  @map("closed_at")
```

In the `Condominium` model, after `waitingAutoResolveDays`:
```prisma
  reopenDeadlineDays  Int @default(7) @map("reopen_deadline_days")
```

In the `UserCondominium` model, after `councilPosition`:
```prisma
  assignedTower  String?  @map("assigned_tower")
```

- [ ] **Step 4: Generate Prisma client**

```bash
cd backend && npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(fase3a): add schema for canned responses, complaint flow, and tower restriction"
```

---

## Task 2: Canned Responses — Backend CRUD

**Files:**
- Create: `backend/src/modules/canned-responses/canned-responses.schema.ts`
- Create: `backend/src/modules/canned-responses/canned-responses.service.ts`
- Create: `backend/src/modules/canned-responses/canned-responses.controller.ts`
- Create: `backend/src/modules/canned-responses/canned-responses.routes.ts`
- Modify: `backend/src/app/app.ts` (register routes — NOT server.ts)

- [ ] **Step 1: Create schema**

`canned-responses.schema.ts`:
```typescript
import { z } from "zod";

export const createCannedResponseSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  condominiumId: z.string().optional(),
  sectorId: z.string().optional(),
});

export const updateCannedResponseSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(2000).optional(),
  sectorId: z.string().nullable().optional(),
});

export type CreateCannedResponseRequest = z.infer<typeof createCannedResponseSchema>;
export type UpdateCannedResponseRequest = z.infer<typeof updateCannedResponseSchema>;
```

- [ ] **Step 2: Create service**

`canned-responses.service.ts`:
```typescript
import { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../../shared/errors";
import type { CreateCannedResponseRequest, UpdateCannedResponseRequest } from "./canned-responses.schema";

export async function listCannedResponses(
  prisma: PrismaClient,
  condominiumId?: string,
  sectorId?: string
) {
  // Return global + condominium + sector templates (hierarchical merge)
  const where: any = {
    OR: [
      { condominiumId: null }, // Global templates
      ...(condominiumId ? [
        { condominiumId, sectorId: null }, // Condominium templates
        ...(sectorId ? [{ condominiumId, sectorId }] : []), // Sector templates
      ] : []),
    ],
  };

  return prisma.cannedResponse.findMany({
    where,
    orderBy: [{ condominiumId: "asc" }, { sectorId: "asc" }, { title: "asc" }],
    include: { sector: { select: { name: true } } },
  });
}

export async function createCannedResponse(
  prisma: PrismaClient,
  data: CreateCannedResponseRequest,
  userId: string
) {
  return prisma.cannedResponse.create({
    data: { ...data, createdBy: userId },
  });
}

export async function updateCannedResponse(
  prisma: PrismaClient,
  id: string,
  data: UpdateCannedResponseRequest
) {
  const existing = await prisma.cannedResponse.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Resposta pré-cadastrada");
  return prisma.cannedResponse.update({ where: { id }, data });
}

export async function deleteCannedResponse(prisma: PrismaClient, id: string) {
  const existing = await prisma.cannedResponse.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Resposta pré-cadastrada");
  return prisma.cannedResponse.delete({ where: { id } });
}
```

- [ ] **Step 3: Create controller**

`canned-responses.controller.ts` — standard handlers that parse request, call service, return reply. GET accepts `?condominiumId=&sectorId=` query params.

- [ ] **Step 4: Create routes**

`canned-responses.routes.ts`:
- `GET /` — protected by `fastify.authenticate` only (no `requireCondoAccess` — the service handles filtering; SUPER_ADMINs may call without condominiumId to manage global templates)
- `POST /` — `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC", "ADMIN"])` for condo templates. Inside the controller: if `condominiumId` is null, check `requireSuperAdmin` programmatically
- `PATCH /:id` — same guards
- `DELETE /:id` — same guards

Register in `app.ts` with prefix `/api/canned-responses` (matching existing `/api/` convention — check `app.ts` lines 86-103 for the pattern).

- [ ] **Step 5: Add seed data**

In `backend/prisma/seed.ts`, add global canned responses:
```typescript
const globalTemplates = [
  { title: "Manutenção agendada", content: "Informamos que a manutenção foi agendada. Entraremos em contato com a data e horário." },
  { title: "Aguardando orçamento", content: "Estamos aguardando o orçamento do fornecedor. Assim que recebermos, daremos retorno." },
  { title: "Problema resolvido", content: "O problema relatado foi resolvido. Caso persista, por favor abra uma nova ocorrência." },
  { title: "Encaminhado ao setor", content: "Sua ocorrência foi encaminhada ao setor responsável para análise e providências." },
  { title: "Informações insuficientes", content: "Precisamos de mais detalhes para dar andamento. Por favor, complemente sua ocorrência com fotos ou descrição mais detalhada." },
  { title: "Visita técnica agendada", content: "Uma visita técnica foi agendada para avaliar a situação. Entraremos em contato para confirmar data e horário." },
  { title: "Em análise pelo fornecedor", content: "Sua ocorrência está em análise pelo fornecedor responsável. Retornaremos assim que tivermos um posicionamento." },
];
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/canned-responses/ backend/prisma/seed.ts backend/src/app/app.ts
git commit -m "feat(fase3a): add canned responses backend CRUD with seed data"
```

---

## Task 3: Canned Responses — Frontend Management

**Files:**
- Create: `frontend/src/features/settings/components/CannedResponsesManager.tsx`
- Modify: Settings page to include the new component

- [ ] **Step 1: Create CannedResponsesManager**

CRUD interface for managing canned responses:
- List existing templates (grouped: global read-only, condominium, sector-specific)
- Create form: title + content (textarea) + optional sector select
- Edit inline
- Delete with confirmation
- Use TanStack Query for data fetching/mutations

- [ ] **Step 2: Add to Settings page**

Visible for SYNDIC/PROFESSIONAL_SYNDIC roles. Add as a new card/section in the settings layout.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/settings/
git commit -m "feat(fase3a): add canned responses management UI"
```

---

## Task 4: Canned Responses — Usage in Complaint Detail

**Files:**
- Modify: `frontend/src/features/complaints/components/ComplaintDetailSheet.tsx`

- [ ] **Step 1: Add template picker to comment area**

Next to the comment textarea (lines 156-180), add a button/popover that:
1. Fetches `GET /canned-responses?condominiumId=X&sectorId=Y` (using complaint's sectorId)
2. Shows searchable list of templates grouped by scope (sector > condominium > global)
3. On select, fills the textarea with template content (editable before sending)

Use a `Popover` from shadcn/ui with `Command` component for searchable list:

```typescript
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { FileText } from "lucide-react";

// Button next to "Adicionar comentário":
<Button
  variant="outline"
  size="sm"
  onClick={() => setTemplateOpen(true)}
>
  <FileText className="h-4 w-4 mr-1" />
  Templates
</Button>

// Popover with searchable list:
// On select: setCommentText(template.content)
```

- [ ] **Step 2: Create useQuery hook for canned responses**

```typescript
export function useCannedResponses(condominiumId: string, sectorId?: string) {
  return useQuery({
    queryKey: ["canned-responses", condominiumId, sectorId],
    queryFn: async () => {
      const params = new URLSearchParams({ condominiumId });
      if (sectorId) params.set("sectorId", sectorId);
      const { data } = await api.get(`/canned-responses?${params}`);
      return data;
    },
    enabled: !!condominiumId,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/complaints/
git commit -m "feat(fase3a): add canned response picker to complaint detail"
```

---

## Task 5: Complaint Flow — Transitions + Return Endpoint

**Files:**
- Modify: `backend/src/modules/complaints/complaints.transitions.ts`
- Create: `backend/src/modules/complaints/complaints-return.controller.ts`
- Modify: `backend/src/modules/complaints/complaints.routes.ts`
- Modify: `backend/src/modules/complaints/complaints.service.ts`

- [ ] **Step 1: Update VALID_TRANSITIONS**

In `complaints.transitions.ts` (lines 35-58), make these exact changes to `VALID_TRANSITIONS`:

**Modify existing lines:**
- Line with `TRIAGE:` → add `ComplaintStatus.RETURNED` to the array
- Line with `IN_PROGRESS:` → add `ComplaintStatus.RETURNED` to the array
- Line with `CLOSED: []` → change to `CLOSED: [ComplaintStatus.REOPENED]`

**Add two new keys** at the end (required by `Record<ComplaintStatus, ComplaintStatus[]>`):
```typescript
RETURNED: [ComplaintStatus.IN_PROGRESS],
REOPENED: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.CANCELLED],
```

Ensure `ComplaintStatus` import includes the new enum values (they come from Prisma after migration).

- [ ] **Step 2: Create return controller**

`complaints-return.controller.ts`:
```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { ComplaintStatus } from "@prisma/client";
import { assertValidTransition } from "./complaints.transitions";
import { whatsappService } from "../whatsapp/whatsapp.service";

const returnSchema = z.object({
  reason: z.string().min(10),
});

export async function returnComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const complaintId = parseInt(id, 10);
  const user = request.user!;
  const body = returnSchema.parse(request.body);

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { resident: true },
  });

  if (!complaint) throw new NotFoundError("Ocorrência");

  assertValidTransition(complaint.status, ComplaintStatus.RETURNED);

  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: { status: ComplaintStatus.RETURNED },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus: ComplaintStatus.RETURNED,
      changedBy: user.id,
      action: "RETURN",
      notes: body.reason,
    },
  });

  // Notify resident via WhatsApp
  if (complaint.resident.consentWhatsapp) {
    whatsappService
      .sendTextMessage(
        complaint.resident.phone,
        `Sua ocorrência #${complaintId} foi devolvida: ${body.reason}. Acesse o sistema para complementar.`
      )
      .catch(() => {});
  }

  return reply.send(updated);
}
```

- [ ] **Step 3: Add route**

In `complaints.routes.ts`, add:
```typescript
import { returnComplaintHandler } from "./complaints-return.controller";

fastify.post(
  "/:id/return",
  {
    onRequest: [
      fastify.authenticate,
      requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC", "ADMIN"]),
      requireTicketModify(),
    ],
  },
  returnComplaintHandler
);
```

- [ ] **Step 4: Update updateComplaintStatus for closedAt**

In `complaints.service.ts` `updateComplaintStatus` function, **replace** the existing CLOSED case (lines ~207-211) with this version that adds `closedAt`:
```typescript
// REPLACE the existing block:
//   ...(nextStatus === ComplaintStatus.CLOSED && !complaint.resolvedAt && { resolvedAt: now, resolvedBy: userId }),
// WITH:
...(nextStatus === ComplaintStatus.CLOSED && {
  closedAt: now,
  ...(!complaint.resolvedAt && {
    resolvedAt: now,
    resolvedBy: userId,
  }),
}),
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/complaints/
git commit -m "feat(fase3a): add complaint return flow with transitions and WhatsApp notification"
```

---

## Task 6: Complaint Flow — Complement + Reopen Endpoints

**Files:**
- Create: `backend/src/modules/complaints/complaints-complement.controller.ts`
- Create: `backend/src/modules/complaints/complaints-reopen.controller.ts`
- Modify: `backend/src/modules/complaints/complaints.routes.ts`
- Modify: `backend/src/auth/authorize.ts`

- [ ] **Step 1: Create parameterized complaint owner guard**

In `authorize.ts`, create a reusable version of `requireComplaintOwner` with custom error message:

```typescript
export const requireComplaintOwnerAction = (errorMessage: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser | undefined;
    if (!user) return reply.status(401).send({ error: "Usuário não autenticado" });
    if (user.role !== "RESIDENT" || !user.residentId)
      return reply.status(403).send({ error: errorMessage });
    const complaintId = Number((request.params as Record<string, string>).id);
    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return reply.status(404).send({ error: "Ocorrência não encontrada" });
    if (complaint.residentId !== user.residentId)
      return reply.status(403).send({ error: errorMessage });
  };
};
```

- [ ] **Step 2: Create complement controller**

`complaints-complement.controller.ts`:
```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { ComplaintStatus } from "@prisma/client";

const complementSchema = z.object({
  message: z.string().min(10),
});

export async function complementComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const complaintId = parseInt(id, 10);
  const user = request.user!;
  const body = complementSchema.parse(request.body);

  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw new NotFoundError("Ocorrência");
  if (complaint.status !== ComplaintStatus.RETURNED) {
    throw new BadRequestError("Ocorrência não está aguardando complemento");
  }

  // Add comment
  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: ComplaintStatus.RETURNED,
      toStatus: ComplaintStatus.IN_PROGRESS,
      changedBy: user.id,
      action: "COMMENT",
      notes: body.message,
    },
  });

  // Transition back to IN_PROGRESS
  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: { status: ComplaintStatus.IN_PROGRESS },
    include: { resident: true },
  });

  // Notify syndic/admin about complement
  // Follow the notification pattern from addComplaintComment in complaints.service.ts
  // Use whatsappService or notify() to alert assignee/syndic

  return reply.send(updated);
}
```

- [ ] **Step 3: Create reopen controller**

`complaints-reopen.controller.ts`:
```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { ComplaintStatus } from "@prisma/client";

const reopenSchema = z.object({
  reason: z.string().min(10),
});

export async function reopenComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const complaintId = parseInt(id, 10);
  const user = request.user!;
  const body = reopenSchema.parse(request.body);

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { condominium: { select: { reopenDeadlineDays: true } } },
  });

  if (!complaint) throw new NotFoundError("Ocorrência");
  if (complaint.status !== ComplaintStatus.CLOSED) {
    throw new BadRequestError("Apenas ocorrências encerradas podem ser reabertas");
  }

  // Validate deadline using closedAt
  const closedAt = complaint.closedAt;
  if (!closedAt) {
    throw new BadRequestError("Ocorrência sem data de fechamento registrada");
  }

  const deadlineMs = complaint.condominium.reopenDeadlineDays * 24 * 60 * 60 * 1000;
  if (Date.now() - new Date(closedAt).getTime() > deadlineMs) {
    throw new BadRequestError(
      `O prazo de ${complaint.condominium.reopenDeadlineDays} dias para reabertura expirou`
    );
  }

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: ComplaintStatus.CLOSED,
      toStatus: ComplaintStatus.REOPENED,
      changedBy: user.id,
      action: "REOPEN",
      notes: body.reason,
    },
  });

  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: { status: ComplaintStatus.REOPENED },
    include: { resident: true },
  });

  // Notify syndic/admin about reopen
  // Follow the notification pattern from updateComplaintStatus in complaints.service.ts

  return reply.send(updated);
}
```

- [ ] **Step 4: Add routes**

In `complaints.routes.ts`:
```typescript
import { complementComplaintHandler } from "./complaints-complement.controller";
import { reopenComplaintHandler } from "./complaints-reopen.controller";
import { requireComplaintOwnerAction } from "../../auth/authorize";

fastify.post("/:id/complement", {
  onRequest: [fastify.authenticate, requireComplaintOwnerAction("Apenas o autor pode complementar a ocorrência")],
}, complementComplaintHandler);

fastify.post("/:id/reopen", {
  onRequest: [fastify.authenticate, requireComplaintOwnerAction("Apenas o autor pode reabrir a ocorrência")],
}, reopenComplaintHandler);
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/complaints/ backend/src/auth/authorize.ts
git commit -m "feat(fase3a): add complaint complement and reopen endpoints"
```

---

## Task 7: Complaint Flow — Auto-Close Enhancement

**Files:**
- Modify: `backend/src/modules/sla-cron/sla-cron.plugin.ts`

- [ ] **Step 1: Add closedAt and WhatsApp to existing auto_close handler**

In `sla-cron.plugin.ts`, the existing `auto_close` case (lines 43-69) already transitions RESOLVED → CLOSED. Enhance it:

After the `prisma.complaint.updateMany` call, also set `closedAt`:
```typescript
case "auto_close": {
  const autoCloseResult = await prisma.complaint.updateMany({
    where: { id: action.complaintId, status: ComplaintStatus.RESOLVED },
    data: { status: ComplaintStatus.CLOSED, closedAt: new Date() },
  });
  if (autoCloseResult.count > 0) {
    // ... existing history creation ...

    // NEW: Send WhatsApp notification to resident
    const complaint = await prisma.complaint.findUnique({
      where: { id: action.complaintId },
      include: {
        resident: true,
        condominium: { select: { reopenDeadlineDays: true } },
      },
    });
    if (complaint?.resident.consentWhatsapp) {
      whatsappService.sendTextMessage(
        complaint.resident.phone,
        `Sua ocorrência #${action.complaintId} foi encerrada automaticamente. Caso necessário, você pode reabri-la em até ${complaint.condominium.reopenDeadlineDays} dias.`
      ).catch(() => {});
    }
  }
  break;
}
```

Import `whatsappService` at the top of the file if not already imported.

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/sla-cron/
git commit -m "feat(fase3a): enhance auto-close with closedAt tracking and WhatsApp notification"
```

---

## Task 8: Complaint Flow — Frontend Admin

**Files:**
- Modify: `frontend/src/features/complaints/types/index.ts`
- Modify: `frontend/src/features/complaints/components/ComplaintDetailSheet.tsx`
- Modify: `frontend/src/features/complaints/components/ComplaintTimeline.tsx`

- [ ] **Step 1: Update frontend types**

In `types/index.ts`, add to `ComplaintStatus`:
```typescript
  | "RETURNED"
  | "REOPENED"
```

Add `closedAt?: string | null;` to the `Complaint` interface.

- [ ] **Step 2: Update ComplaintTimeline**

In `ComplaintTimeline.tsx`:

Add to `STATUS_LABELS`:
```typescript
RETURNED: "Devolvida",
REOPENED: "Reaberta",
```

Add new types to `TimelineItem["type"]` union: `"return" | "reopen" | "autoclose"`.

Update `buildTimelineItems` to handle new actions:
```typescript
} else if (entry.action === "RETURN") {
  items.push({
    id: entry.id, type: "return",
    label: "Devolvida ao morador",
    description: entry.notes || "",
    date: entry.createdAt, completed: true,
  });
} else if (entry.action === "REOPEN") {
  items.push({
    id: entry.id, type: "reopen",
    label: "Reaberta pelo morador",
    description: entry.notes || "",
    date: entry.createdAt, completed: true,
  });
} else if (entry.action === "AUTO_CLOSE") {
  items.push({
    id: entry.id, type: "autoclose",
    label: "Encerrada automaticamente",
    description: entry.notes || "",
    date: entry.createdAt, completed: true,
  });
}
```

Update `TimelineIcon` with new cases:
```typescript
case "return": return <Undo2 className={cn(size, "text-orange-500")} />;
case "reopen": return <RotateCcw className={cn(size, "text-blue-500")} />;
case "autoclose": return <Timer className={cn(size, "text-gray-500")} />;
```

Import `Undo2`, `RotateCcw`, `Timer` from lucide-react.

- [ ] **Step 3: Add return button to ComplaintDetailSheet**

In `ComplaintDetailSheet.tsx`, add "Devolver ao Morador" button:

```typescript
const canReturn = ["IN_PROGRESS", "TRIAGE"].includes(complaint.status);
const canAcceptReopen = complaint.status === "REOPENED";

// Button in the action area:
{canReturn && (
  <Button variant="outline" size="sm" onClick={() => setReturnDialogOpen(true)}>
    <Undo2 className="h-4 w-4 mr-1" />
    Devolver ao Morador
  </Button>
)}

// For reopened complaints, show Accept/Reject buttons:
{canAcceptReopen && (
  <div className="flex gap-2">
    <Button size="sm" onClick={() => handleStatusChange("IN_PROGRESS")}>
      Retomar Atendimento
    </Button>
    <Button variant="destructive" size="sm" onClick={() => handleStatusChange("CANCELLED")}>
      Rejeitar Reabertura
    </Button>
  </div>
)}
```

Add a Dialog for the return reason (textarea, min 10 chars, submit calls `POST /complaints/:id/return`).

Create mutation hook:
```typescript
export function useReturnComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ complaintId, reason }: { complaintId: number; reason: string }) => {
      const { data } = await api.post(`/complaints/${complaintId}/return`, { reason });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["complaints"] }),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/complaints/
git commit -m "feat(fase3a): add return/reopen UI to admin complaint detail and timeline"
```

---

## Task 9: Complaint Flow — Frontend Resident

**Files:**
- Modify: `frontend/src/features/complaints/components/ResidentComplaintDetailSheet.tsx`
- Modify: `frontend/src/features/complaints/pages/ResidentComplaintsPage.tsx`

- [ ] **Step 1: Add reopen button to resident detail sheet**

In `ResidentComplaintDetailSheet.tsx`, add:

```typescript
// Show reopen button when CLOSED and within deadline
// Get reopenDeadlineDays from the condominium data (include in complaint detail API
// response, or fetch from /condominiums/:id endpoint). Fallback to 7 if not available.
const reopenDeadlineDays = complaint.condominium?.reopenDeadlineDays ?? 7;
const canReopen = complaint.status === "CLOSED" && complaint.closedAt && (() => {
  const closedDate = new Date(complaint.closedAt!);
  const deadlineMs = reopenDeadlineDays * 24 * 60 * 60 * 1000;
  return Date.now() - closedDate.getTime() < deadlineMs;
})();

{canReopen && (
  <Button variant="outline" size="sm" onClick={() => setReopenDialogOpen(true)}>
    <RotateCcw className="h-4 w-4 mr-1" />
    Reabrir Ocorrência
  </Button>
)}
```

Add Dialog with reason textarea. Mutation calls `POST /complaints/:id/reopen`.

- [ ] **Step 2: Add complement action for RETURNED status**

When complaint has status RETURNED, show a prominent call-to-action:

```typescript
{complaint.status === "RETURNED" && (
  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-4">
    <p className="text-sm text-orange-500 font-medium mb-2">
      Esta ocorrência foi devolvida e aguarda seu complemento
    </p>
    {/* Comment form becomes the complement action */}
  </div>
)}
```

When resident submits a comment while status is RETURNED, call `POST /complaints/:id/complement` instead of the regular comment endpoint.

- [ ] **Step 3: Update complaint list badges**

In `ResidentComplaintsPage.tsx` / `ComplaintHistoryList.tsx`, add status color for RETURNED (orange badge) and REOPENED (blue badge).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/complaints/
git commit -m "feat(fase3a): add complement and reopen UI for residents"
```

---

## Task 10: Tower Restriction — Access Context + Backend Filtering

**Files:**
- Modify: `backend/src/auth/context.ts`
- Modify: `backend/src/modules/residents/residents.service.ts`
- Modify: `backend/src/modules/complaints/complaints.repository.ts`
- Modify: `backend/src/modules/messages/messages.service.ts`

- [ ] **Step 1: Expand AccessContext**

In `context.ts`, add to `AccessContext` interface (line 8):
```typescript
assignedTower?: string | null;
```

In `resolveAccessContext` (~line 35), after fetching `memberships`, also fetch `assignedTower`:
```typescript
const memberships = await prisma.userCondominium.findMany({
  where: { userId: user.id },
  select: { condominiumId: true, assignedTower: true, councilPosition: true },
});

// Determine assignedTower — store ALL memberships' tower data, not just one.
// The assignedTower is per-condominium, so store a map and resolve per-request.
// For simplicity: store the assignedTower from the first relevant membership.
// NOTE: For multi-condominium users, this should be scoped to the condominiumId
// being queried. The controller/middleware can override by checking the specific
// UserCondominium for the request's condominiumId.
const councilMembership = memberships.find(m => m.councilPosition && m.assignedTower);
const assignedTower = councilMembership?.assignedTower ?? null;
```

Add `assignedTower` to the returned context object.

- [ ] **Step 2: Filter residents by tower**

In `residents.service.ts`, when building the Prisma `where` clause, check if `context.assignedTower` is set:
```typescript
if (context.assignedTower) {
  where.tower = context.assignedTower;
}
```

Read the file first to find the exact location where filters are built.

- [ ] **Step 3: Filter complaints by tower**

In `complaints.repository.ts`, in `buildAccessFilteredWhere`, when `context.assignedTower` is set, filter by resident tower:
```typescript
if (context.assignedTower) {
  where.resident = { tower: context.assignedTower };
}
```

- [ ] **Step 4: Validate messages by tower**

In `messages.service.ts`, in `sendMessage` (~line 61), after resolving target residents, validate:
```typescript
// If user has assignedTower, restrict messaging scope
if (context.assignedTower) {
  if (body.target.scope === "ALL") {
    throw new BadRequestError("Você só pode enviar mensagens para sua torre");
  }
  if (body.target.scope === "TOWER" && body.target.tower !== context.assignedTower) {
    throw new BadRequestError("Você só pode enviar mensagens para sua torre atribuída");
  }
  // For FLOOR/UNIT, the tower is derived from the target
}
```

Read the file first to understand how context is passed to this function. It may need to receive the AccessContext or the user's assignedTower.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/context.ts backend/src/modules/residents/ backend/src/modules/complaints/ backend/src/modules/messages/
git commit -m "feat(fase3a): add tower restriction to access context and backend filtering"
```

---

## Task 11: Tower Restriction — Endpoint + GET /me

**Files:**
- Create: `backend/src/modules/user-management/assigned-tower.controller.ts`
- Modify: `backend/src/modules/user-management/user-management.routes.ts`
- Modify: `backend/src/modules/auth/auth.routes.ts`

- [ ] **Step 1: Create assigned tower controller**

`assigned-tower.controller.ts`:
```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { NotFoundError } from "../../shared/errors";

const updateAssignedTowerSchema = z.object({
  assignedTower: z.string().nullable(),
  condominiumId: z.string().min(1),
});

export async function updateAssignedTowerHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { userId } = request.params as { userId: string };
  const body = updateAssignedTowerSchema.parse(request.body);

  const result = await prisma.userCondominium.updateMany({
    where: { userId, condominiumId: body.condominiumId },
    data: { assignedTower: body.assignedTower },
  });

  if (result.count === 0) throw new NotFoundError("Vínculo usuário-condomínio");

  return reply.send({ assignedTower: body.assignedTower });
}
```

- [ ] **Step 2: Add route**

In `user-management.routes.ts`:
```typescript
import { updateAssignedTowerHandler } from "./assigned-tower.controller";

fastify.patch("/:userId/assigned-tower", {
  onRequest: [
    fastify.authenticate,
    requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
    requireCondoAccess({ source: "body" }),
  ],
}, updateAssignedTowerHandler);
```

- [ ] **Step 3: Expand GET /me condominiums mapping**

In `auth.routes.ts` (lines 202-205), change:
```typescript
const userCondominiums = condominiums.map((uc) => ({
  id: uc.condominium.id,
  name: uc.condominium.name,
}));
```
To:
```typescript
const userCondominiums = condominiums.map((uc) => ({
  id: uc.condominium.id,
  name: uc.condominium.name,
  role: uc.role,
  councilPosition: uc.councilPosition,
  assignedTower: uc.assignedTower,
}));
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/user-management/ backend/src/modules/auth/auth.routes.ts
git commit -m "feat(fase3a): add assigned tower endpoint and expand GET /me with condominium roles"
```

---

## Task 12: Tower Restriction — Frontend

**Files:**
- Modify: `frontend/src/features/user-management/pages/TeamManagementPage.tsx`
- Modify: `frontend/src/features/messages/pages/MessagingPage.tsx`

- [ ] **Step 1: Add tower select to TeamManagementPage**

In `TeamManagementPage.tsx`, in the council member card (~lines 280-310), add a Select for "Torre atribuída" next to the existing council position select:

```typescript
<Select
  value={user.assignedTower ?? "__none__"}
  onValueChange={(value) => handleAssignedTowerChange(user.id, value === "__none__" ? null : value)}
>
  <SelectTrigger className="w-full sm:w-[140px] h-9">
    <SelectValue placeholder="Torre" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__none__">Todas torres</SelectItem>
    {towers.map((t) => (
      <SelectItem key={t} value={t}>{t}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Use `useStructure` to get tower list. Create mutation that calls `PATCH /users/:userId/assigned-tower`.

The `user` objects from the team management API will need `assignedTower` added to their type — check the type definition and add the field.

- [ ] **Step 2: Lock tower in MessagingPage**

In `MessagingPage.tsx`, get the current user's `assignedTower` from the condominiums array in auth context:

```typescript
const currentUserAssignedTower = user?.condominiums
  ?.find(c => c.id === currentCondominiumId)?.assignedTower;

// If assignedTower is set:
// - Disable scope "all" option
// - Pre-select and lock tower select
// - Show info message: "Você está limitado à torre X"
```

Read the file first to understand how scope/tower selects work, then conditionally disable/lock them.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/user-management/ frontend/src/features/messages/
git commit -m "feat(fase3a): add tower assignment UI and messaging restriction for council members"
```

---

## Task 13: Final Verification

- [ ] **Step 1: TypeScript check frontend**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 2: TypeScript check backend**

```bash
cd backend && npx tsc --noEmit
```

Verify no new errors in our files.

- [ ] **Step 3: Regenerate Prisma client if needed**

```bash
cd backend && npx prisma generate
```

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix(fase3a): resolve final TypeScript and integration issues"
```
