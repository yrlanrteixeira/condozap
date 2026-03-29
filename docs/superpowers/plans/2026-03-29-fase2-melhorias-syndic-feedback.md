# Fase 2 — Melhorias Syndic Feedback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7 improvements from professional syndic feedback: menu rename, sector column, resident filters, complaint timeline, syndic profile, account expiration, and sector nudge.

**Architecture:** Frontend-first for items 1-4 (no backend changes). Items 5-7 share a single Prisma migration, then backend endpoints, then frontend. The complaint timeline component is shared between resident view and nudge display.

**Tech Stack:** React + TypeScript + TanStack Query + shadcn/ui + Tailwind (frontend), Fastify + Prisma + PostgreSQL + node-cron (backend), Evolution API (WhatsApp).

**Spec:** `docs/superpowers/specs/2026-03-29-fase2-melhorias-syndic-feedback.md`

---

## Task 1: Rename Conselheiros → Corpo Diretivo

**Files:**
- Modify: `frontend/src/shared/components/layout/Sidebar.tsx:90`
- Modify: `frontend/src/features/user-management/pages/TeamManagementPage.tsx:1-6,211-216`

- [ ] **Step 1: Update Sidebar label**

In `Sidebar.tsx`, find the menu item at ~line 90:
```typescript
// Change:
title: "Conselheiros",
// To:
title: "Corpo Diretivo",
```

- [ ] **Step 2: Update TeamManagementPage title and descriptions**

In `TeamManagementPage.tsx`:

File header comment (lines 1-6):
```typescript
/**
 * Team Management Page (Corpo Diretivo)
 *
 * Página para síndicos gerenciarem o corpo diretivo e pessoas de confiança
 * - Síndico pode cadastrar ADMINs (conselheiros)
 */
```

Page title (lines 211-216):
```typescript
<h1 className="text-xl sm:text-2xl font-bold text-foreground">
  Corpo Diretivo
</h1>
<p className="text-sm text-muted-foreground">
  Cadastre pessoas de confiança para ajudar a gerenciar o condomínio
</p>
```

- [ ] **Step 3: Verify in browser**

Run: `cd frontend && npm run dev`
Check: Sidebar shows "Corpo Diretivo" instead of "Conselheiros". Page title matches.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/shared/components/layout/Sidebar.tsx frontend/src/features/user-management/pages/TeamManagementPage.tsx
git commit -m "feat(fase2): rename Conselheiros to Corpo Diretivo"
```

---

## Task 2: Add Sector Column to Admin Complaints Table

**Files:**
- Modify: `frontend/src/features/complaints/pages/AdminComplaintsTablePage.tsx:102-110`
- Modify: `frontend/src/features/complaints/components/ComplaintCard.tsx:41-44`

- [ ] **Step 1: Add "Setor" column header in table**

In `AdminComplaintsTablePage.tsx`, find the `<TableHeader>` block (~line 102). Add "Setor" column after "Categoria":

```typescript
<TableHeader>
  <TableRow className="bg-muted/50">
    <TableHead className="font-bold">Status</TableHead>
    <TableHead className="font-bold">Categoria</TableHead>
    <TableHead className="font-bold hidden sm:table-cell">Setor</TableHead>
    <TableHead className="font-bold">Descrição</TableHead>
    <TableHead className="font-bold hidden sm:table-cell">Unidade</TableHead>
    <TableHead className="font-bold hidden sm:table-cell">Data</TableHead>
    <TableHead className="font-bold w-auto sm:w-[240px]">Ação</TableHead>
  </TableRow>
</TableHeader>
```

- [ ] **Step 2: Add sector cell in table body**

Find the corresponding `<TableRow>` in the body. After the category cell, add:

```typescript
<TableCell className="hidden sm:table-cell text-muted-foreground">
  {complaint.sector?.name ?? "—"}
</TableCell>
```

- [ ] **Step 3: Update empty-state colSpan**

Find the empty-state `<TableRow>` in the same file (search for `colSpan={6}`). Update to `colSpan={7}` to account for the new column.

- [ ] **Step 4: Add sector badge to ComplaintCard (mobile)**

In `ComplaintCard.tsx`, after the category badge (~line 44), add:

```typescript
{complaint.sector && (
  <Badge variant="outline" className="text-xs">
    {complaint.sector.name}
  </Badge>
)}
```

- [ ] **Step 5: Verify in browser**

Desktop: Complaints table shows "Setor" column with sector name or "—".
Mobile: Complaint cards show sector badge below category.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/complaints/pages/AdminComplaintsTablePage.tsx frontend/src/features/complaints/components/ComplaintCard.tsx
git commit -m "feat(fase2): add sector column to admin complaints table"
```

---

## Task 3: Add Residents Filter Bar

**Files:**
- Create: `frontend/src/features/residents/components/ResidentsFilterBar.tsx`
- Modify: `frontend/src/features/residents/pages/ResidentsPage.tsx`

- [ ] **Step 1: Create ResidentsFilterBar component**

Create `frontend/src/features/residents/components/ResidentsFilterBar.tsx`:

```typescript
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Search } from "lucide-react";
import type { Resident } from "../types";
import { useStructure } from "@/features/structure/hooks/useStructureApi";
import { useAppSelector } from "@/shared/hooks";
import { selectCurrentCondominiumId } from "@/shared/store/slices/condominiumSlice";

interface ResidentsFilterBarProps {
  residents: Resident[];
  onFilteredChange: (filtered: Resident[]) => void;
}

export function ResidentsFilterBar({
  residents,
  onFilteredChange,
}: ResidentsFilterBarProps) {
  const condominiumId = useAppSelector(selectCurrentCondominiumId);
  const { data: structureData } = useStructure(condominiumId || "");

  const [search, setSearch] = useState("");
  const [tower, setTower] = useState("all");
  const [floor, setFloor] = useState("all");
  const [type, setType] = useState("all");

  // Derive tower options from structure + residents
  const towers = useMemo(() => {
    const set = new Set<string>();
    if (structureData?.structure?.towers) {
      structureData.structure.towers.forEach((t) => set.add(t.name));
    }
    residents.forEach((r) => set.add(r.tower));
    return Array.from(set).sort();
  }, [structureData, residents]);

  // Derive floor options filtered by selected tower
  const floors = useMemo(() => {
    const source = tower === "all" ? residents : residents.filter((r) => r.tower === tower);
    const set = new Set<string>();
    source.forEach((r) => set.add(r.floor));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [residents, tower]);

  // Reset floor when tower changes
  useEffect(() => {
    setFloor("all");
  }, [tower]);

  // Apply filters
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = residents;
      const searchLower = search.toLowerCase();

      if (searchLower) {
        filtered = filtered.filter(
          (r) =>
            r.name.toLowerCase().includes(searchLower) ||
            r.email.toLowerCase().includes(searchLower) ||
            r.phone.includes(search)
        );
      }

      if (tower !== "all") {
        filtered = filtered.filter((r) => r.tower === tower);
      }

      if (floor !== "all") {
        filtered = filtered.filter((r) => r.floor === floor);
      }

      if (type !== "all") {
        filtered = filtered.filter((r) => r.type === type);
      }

      onFilteredChange(filtered);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, tower, floor, type, residents, onFilteredChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={tower} onValueChange={setTower}>
        <SelectTrigger className="w-full sm:w-[130px]">
          <SelectValue placeholder="Torre" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas torres</SelectItem>
          {towers.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={floor} onValueChange={setFloor}>
        <SelectTrigger className="w-full sm:w-[130px]">
          <SelectValue placeholder="Andar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos andares</SelectItem>
          {floors.map((f) => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos tipos</SelectItem>
          <SelectItem value="OWNER">Proprietário</SelectItem>
          <SelectItem value="TENANT">Inquilino</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Integrate filter bar into ResidentsPage**

In `ResidentsPage.tsx`:

Add imports:
```typescript
import { ResidentsFilterBar } from "../components/ResidentsFilterBar";
```

Add state for filtered residents:
```typescript
const [filteredResidents, setFilteredResidents] = useState<Resident[]>([]);
const [hasActiveFilter, setHasActiveFilter] = useState(false);

const handleFilteredChange = useCallback((filtered: Resident[]) => {
  setFilteredResidents(filtered);
  setHasActiveFilter(filtered.length !== (residents?.length ?? 0));
}, [residents]);
```

Add the filter bar after `<ResidentPageHeader>` and before the residents list:
```typescript
{residents && residents.length > 0 && (
  <ResidentsFilterBar
    residents={residents}
    onFilteredChange={handleFilteredChange}
  />
)}
```

Update the list to use `filteredResidents` instead of `residents`:
```typescript
// Use filteredResidents for display, with count indicator
{hasActiveFilter && (
  <p className="text-sm text-muted-foreground mb-2">
    {filteredResidents.length} morador{filteredResidents.length !== 1 ? "es" : ""} encontrado{filteredResidents.length !== 1 ? "s" : ""}
  </p>
)}
```

Pass `filteredResidents` (or `residents` if no filter active) to `ResidentList`/`ResidentTable`.

- [ ] **Step 3: Add exports**

In `frontend/src/features/residents/components/index.ts` (or wherever components are exported), add:
```typescript
export { ResidentsFilterBar } from "./ResidentsFilterBar";
```

- [ ] **Step 4: Verify in browser**

- Search by name → filters in real-time
- Select tower → floor dropdown updates to match
- Select type → filters by OWNER/TENANT
- Clear all → shows all residents
- Mobile: filters stack vertically

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/residents/components/ResidentsFilterBar.tsx frontend/src/features/residents/pages/ResidentsPage.tsx
git commit -m "feat(fase2): add inline filter bar to residents page"
```

---

## Task 4: Create ComplaintTimeline Component

**Files:**
- Create: `frontend/src/features/complaints/components/ComplaintTimeline.tsx`

- [ ] **Step 1: Create the reusable ComplaintTimeline component**

This component takes `statusHistory[]`, the complaint creation date, and renders a vertical timeline. It follows the existing pattern in `ResidentComplaintDetailSheet.tsx:306` for distinguishing comments from status changes.

Create `frontend/src/features/complaints/components/ComplaintTimeline.tsx`:

```typescript
import { CheckCircle2, Circle, MessageSquare, ArrowRight, Bell, Clock } from "lucide-react";
import type { ComplaintStatusHistory } from "../types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Nova",
  OPEN: "Triagem",
  TRIAGE: "Triagem",
  IN_PROGRESS: "Em Andamento",
  WAITING_USER: "Aguardando Morador",
  WAITING_THIRD_PARTY: "Aguardando Terceiro",
  RESOLVED: "Resolvida",
  CLOSED: "Encerrada",
  CANCELLED: "Cancelada",
};

interface ComplaintTimelineProps {
  statusHistory: ComplaintStatusHistory[];
  createdAt: string;
  description: string;
  sectorName?: string;
}

interface TimelineItem {
  id: string;
  type: "created" | "status" | "comment" | "nudge";
  label: string;
  description?: string;
  date: string;
  completed: boolean;
}

function buildTimelineItems(
  statusHistory: ComplaintStatusHistory[],
  createdAt: string,
  description: string,
  sectorName?: string
): TimelineItem[] {
  const items: TimelineItem[] = [];

  // 1. Creation
  items.push({
    id: "created",
    type: "created",
    label: "Criada",
    description,
    date: createdAt,
    completed: true,
  });

  // 2. Status changes, comments, and nudges from history (sorted oldest first)
  const sorted = [...statusHistory].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const entry of sorted) {
    if (entry.action === "NUDGE") {
      items.push({
        id: entry.id,
        type: "nudge",
        label: "Cobrança de posicionamento",
        description: entry.notes || `Administração cobrou atualização do setor${sectorName ? ` ${sectorName}` : ""}`,
        date: entry.createdAt,
        completed: true,
      });
    } else if (entry.action === "COMMENT" || entry.action === "comment") {
      items.push({
        id: entry.id,
        type: "comment",
        label: "Comentário",
        description: entry.notes || "",
        date: entry.createdAt,
        completed: true,
      });
    } else {
      // Status change
      const toLabel = STATUS_LABELS[entry.toStatus] || entry.toStatus;
      items.push({
        id: entry.id,
        type: "status",
        label: toLabel,
        description: entry.notes || undefined,
        date: entry.createdAt,
        completed: true,
      });
    }
  }

  return items;
}

function TimelineIcon({ type, completed }: { type: TimelineItem["type"]; completed: boolean }) {
  const size = "h-4 w-4";
  if (!completed) return <Circle className={cn(size, "text-muted-foreground")} />;

  switch (type) {
    case "created":
      return <CheckCircle2 className={cn(size, "text-green-500")} />;
    case "status":
      return <ArrowRight className={cn(size, "text-blue-500")} />;
    case "comment":
      return <MessageSquare className={cn(size, "text-purple-500")} />;
    case "nudge":
      return <Bell className={cn(size, "text-amber-500")} />;
    default:
      return <Clock className={cn(size, "text-muted-foreground")} />;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }) + " às " + date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ComplaintTimeline({
  statusHistory,
  createdAt,
  description,
  sectorName,
}: ComplaintTimelineProps) {
  const items = buildTimelineItems(statusHistory, createdAt, description, sectorName);

  return (
    <div className="relative pl-6 space-y-4">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

      {items.map((item, index) => (
        <div key={item.id} className="relative flex gap-3">
          {/* Icon dot */}
          <div className="absolute -left-6 mt-0.5 bg-background p-0.5">
            <TimelineIcon type={item.type} completed={item.completed} />
          </div>

          {/* Content */}
          <div className={cn("flex-1 min-w-0", !item.completed && "opacity-50")}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{item.label}</span>
              <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5 break-words">
                {item.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Export the component**

Add to `frontend/src/features/complaints/components/index.ts`:
```typescript
export { ComplaintTimeline } from "./ComplaintTimeline";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/complaints/components/ComplaintTimeline.tsx
git commit -m "feat(fase2): create reusable ComplaintTimeline component"
```

---

## Task 5: Improve Resident Complaints Page with Timeline

**Files:**
- Modify: `frontend/src/features/complaints/components/ResidentComplaintDetailSheet.tsx`
- Modify: `frontend/src/features/complaints/pages/ResidentComplaintsPage.tsx`

- [ ] **Step 1: Integrate ComplaintTimeline into ResidentComplaintDetailSheet**

In `ResidentComplaintDetailSheet.tsx`, import and add the timeline:

```typescript
import { ComplaintTimeline } from "./ComplaintTimeline";
```

In the detail content section, add the timeline above or replacing the existing inline status history rendering. The timeline should appear when `complaint.statusHistory` is available:

```typescript
{complaint.statusHistory && complaint.statusHistory.length > 0 && (
  <div className="space-y-2">
    <h4 className="text-sm font-semibold">Acompanhamento</h4>
    <ComplaintTimeline
      statusHistory={complaint.statusHistory}
      createdAt={complaint.createdAt}
      description={complaint.content}
      sectorName={complaint.sector?.name}
    />
  </div>
)}
```

Keep the existing chat/comment input functionality intact — the timeline is read-only and complements the existing interaction.

- [ ] **Step 2: Improve complaint cards in ResidentComplaintsPage**

In `ResidentComplaintsPage.tsx`, enhance the complaint list cards with:
- Status badge with color
- Progress bar showing workflow position
- "⭐ Avaliar" indicator for resolved complaints without CSAT

Add a progress bar helper and CSAT indicator to the complaint cards:

```typescript
const WORKFLOW_STEPS = ["TRIAGE", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"];

function ComplaintProgressBar({ status }: { status: string }) {
  const currentIndex = WORKFLOW_STEPS.indexOf(status);
  const progress = currentIndex >= 0
    ? Math.round(((currentIndex + 1) / WORKFLOW_STEPS.length) * 100)
    : 10;
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// In each complaint card:
<ComplaintProgressBar status={complaint.status} />

{complaint.status === "RESOLVED" && !complaint.csatScore && (
  <span className="text-amber-500 text-xs font-medium">⭐ Avaliar</span>
)}
```

- [ ] **Step 3: Sort complaints (open first)**

Ensure complaint ordering: open/in-progress first, then resolved/closed:

```typescript
const sortedComplaints = useMemo(() => {
  const closedStatuses = ["RESOLVED", "CLOSED", "CANCELLED"];
  return [...myComplaints].sort((a, b) => {
    const aIsOpen = !closedStatuses.includes(a.status);
    const bIsOpen = !closedStatuses.includes(b.status);
    if (aIsOpen !== bIsOpen) return aIsOpen ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}, [myComplaints]);
```

- [ ] **Step 4: Verify in browser**

- Resident view: complaints sorted (open first)
- Click complaint → timeline shows all steps chronologically
- Resolved complaint without CSAT shows "⭐ Avaliar"
- Comments appear in timeline with purple icon

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/complaints/
git commit -m "feat(fase2): add complaint timeline and improve resident complaints UX"
```

---

## Task 6: Prisma Schema Migration (Items 5, 6, 7)

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add new fields to User model**

In `schema.prisma`, add to the `User` model after the MFA fields:

```prisma
  // Syndic Profile (public)
  contactPhone    String?
  photoUrl        String?
  officeHours     String?
  publicNotes     String?   @db.Text

  // Syndic Profile (private)
  address         String?
  websiteUrl      String?
  privateNotes    String?   @db.Text

  // Account Expiration
  accountExpiresAt DateTime?
```

- [ ] **Step 2: Add lastNudgedAt to Complaint model**

In `schema.prisma`, add to the `Complaint` model after `csatRespondedAt`:

```prisma
  lastNudgedAt    DateTime?  @map("last_nudged_at")
```

- [ ] **Step 3: Generate and run migration**

```bash
cd backend
npx prisma migrate dev --name add-syndic-profile-account-expiration-nudge
```

- [ ] **Step 4: Verify migration**

```bash
npx prisma generate
```

Check that no errors are reported and the client is regenerated.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/
git commit -m "feat(fase2): add schema migration for syndic profile, account expiration, and nudge"
```

---

## Task 7: Backend — Syndic Profile Endpoints

**Files:**
- Modify: `backend/src/modules/auth/auth.schemas.ts:36-40`
- Modify: `backend/src/modules/auth/auth.routes.ts:210-262`
- Modify: `backend/src/modules/condominiums/condominiums.routes.ts`

- [ ] **Step 1: Expand updateProfileSchema**

In `auth.schemas.ts`, expand the schema:

```typescript
export const updateProfileSchema = z.object({
  name: z.string().min(3).optional(),
  consentWhatsapp: z.boolean().optional(),
  consentDataProcessing: z.boolean().optional(),
  contactPhone: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  officeHours: z.string().max(200).optional(),
  publicNotes: z.string().max(1000).optional(),
  address: z.string().max(500).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  privateNotes: z.string().max(2000).optional(),
});
```

- [ ] **Step 2: Update PATCH /me handler to pass new fields**

In `auth.routes.ts`, the handler at ~line 219-224 hard-codes specific fields. It currently only handles `name`, `consentWhatsapp`, `consentDataProcessing`. Refactor the `updateData` construction to use dynamic iteration over validated fields instead:

```typescript
// Replace the hard-coded if-blocks with:
const updateData: Record<string, unknown> = {};
for (const [key, value] of Object.entries(body)) {
  if (value !== undefined) {
    updateData[key] = value;
  }
}
```

This ensures all fields validated by `updateProfileSchema` (including the 7 new syndic profile fields) are passed through to `prisma.user.update()` without needing to add each one individually.

- [ ] **Step 3: Add syndic-profile endpoint**

In `condominiums.routes.ts`, add:

```typescript
import { prisma } from "../../shared/db/prisma";

// GET /condominiums/:id/syndic-profile
fastify.get(
  "/:id/syndic-profile",
  { onRequest: [fastify.authenticate, requireCondoAccess()] },
  async (request, reply) => {
    const { id } = request.params as { id: string };

    const syndicLink = await prisma.userCondominium.findFirst({
      where: {
        condominiumId: id,
        role: { in: ["SYNDIC", "PROFESSIONAL_SYNDIC"] },
      },
      include: {
        user: {
          select: {
            name: true,
            contactPhone: true,
            photoUrl: true,
            officeHours: true,
            publicNotes: true,
          },
        },
      },
    });

    if (!syndicLink) {
      return reply.code(404).send({ error: "Síndico não encontrado para este condomínio" });
    }

    return reply.send(syndicLink.user);
  }
);
```

- [ ] **Step 4: Verify endpoints**

Test with curl or Insomnia:
- `PATCH /me` with new fields → 200, fields saved
- `GET /condominiums/:id/syndic-profile` → returns only public fields

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/auth/ backend/src/modules/condominiums/
git commit -m "feat(fase2): add syndic profile backend endpoints"
```

---

## Task 8: Frontend — Syndic Profile Settings

**Files:**
- Modify: `frontend/src/features/settings/components/SettingsProfileCard.tsx`

- [ ] **Step 1: Expand SettingsProfileCard with two sections**

Rewrite `SettingsProfileCard.tsx` to show:
- **Perfil Público** card: photo upload, name, contactPhone, officeHours, publicNotes (green "Público" badge)
- **Dados Privados** card: email (read-only), address, websiteUrl, privateNotes (red "Privado" badge)

The photo upload should use a clickable avatar that triggers a file input, uploads to `POST /uploads/media`, and stores the returned URL in `photoUrl`.

Use the existing `updateProfile` method from `useAuth()` to save all fields via `PATCH /me`.

- [ ] **Step 2: Add syndic profile view for residents**

Create `frontend/src/features/settings/components/SyndicProfileCard.tsx` — a read-only card that fetches `GET /condominiums/:id/syndic-profile` and displays the public syndic info (photo, name, phone, office hours, public notes).

**Placement:** Add a "Síndico" menu item in `Sidebar.tsx` visible only for residents (`Permissions.VIEW_OWN_PROFILE`), linking to a new route `/syndic-profile` that renders this card. Alternatively, add it as a section at the top of the resident's dashboard page. Choose whichever integrates more cleanly with the existing navigation — the key requirement is that residents can find it without searching.

- [ ] **Step 3: Verify in browser**

- Login as syndic → Settings shows two cards with correct badges
- Upload photo → avatar updates
- Fill all fields → save → reload → fields persist
- Login as resident → syndic profile card shows public info only

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/settings/
git commit -m "feat(fase2): add expanded syndic profile UI with public/private sections"
```

---

## Task 9: Backend — Account Expiration

**Files:**
- Modify: `backend/src/modules/auth/auth.routes.ts` (login check)
- Modify: `backend/src/plugins/auth.ts` (JWT status check)
- Create: `backend/src/modules/user-management/expiration.controller.ts`
- Modify: `backend/src/modules/user-management/user-management.routes.ts`
- Modify: `backend/src/modules/sla-cron/sla-cron.plugin.ts`

- [ ] **Step 1: Add login status check**

In `auth.routes.ts`, in the login handler, after password validation and before generating token, add:

```typescript
if (user.status === "SUSPENDED") {
  throw new BadRequestError("Conta suspensa. Entre em contato com o administrador do condomínio.");
}
```

- [ ] **Step 2: Add JWT status middleware check**

In `plugins/auth.ts`, in the `authenticate` decorator, after `request.jwtVerify()`, add:

```typescript
if (request.user.status === "SUSPENDED") {
  reply.code(403).send({ error: "Conta suspensa" });
  return;
}
```

**Note:** If TypeScript complains that `status` doesn't exist on the JWT user type, check the Fastify JWT type augmentation file (e.g., `backend/src/types/fastify.d.ts` or similar) and ensure `status: string` is included in the user payload type. The JWT already includes `status` (set at `auth.routes.ts:122`), so this is purely a type declaration fix.

- [ ] **Step 3: Create expiration controller**

Create `backend/src/modules/user-management/expiration.controller.ts`:

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError, NotFoundError } from "../../shared/errors";

const updateExpirationSchema = z.object({
  accountExpiresAt: z.string().datetime().nullable(),
  condominiumId: z.string().min(1),
});

export async function updateAccountExpirationHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { userId } = request.params as { userId: string };
  const body = updateExpirationSchema.parse(request.body);

  // Verify target user belongs to the provided condominium
  const userCondo = await prisma.userCondominium.findFirst({
    where: { userId, condominiumId: body.condominiumId },
  });

  if (!userCondo) {
    throw new NotFoundError("Usuário não encontrado neste condomínio");
  }

  const expiresAt = body.accountExpiresAt ? new Date(body.accountExpiresAt) : null;

  // If setting a future date and user is suspended, reactivate
  const updateData: Record<string, unknown> = { accountExpiresAt: expiresAt };
  if (expiresAt && expiresAt > new Date()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.status === "SUSPENDED") {
      updateData.status = "APPROVED";
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return reply.send({
    accountExpiresAt: updated.accountExpiresAt,
    status: updated.status,
  });
}
```

- [ ] **Step 4: Add route**

In `user-management.routes.ts`, add `requireRole` to the existing middlewares import and add the route:

```typescript
// Add requireRole to existing import from "../../shared/middlewares"
import { requireRole } from "../../shared/middlewares";
import { updateAccountExpirationHandler } from "./expiration.controller";

fastify.patch(
  "/:userId/expiration",
  {
    onRequest: [
      fastify.authenticate,
      requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
      requireCondoAccess({ source: "body" }),
    ],
  },
  updateAccountExpirationHandler
);
```

- [ ] **Step 5: Add daily cron for auto-suspension**

In `sla-cron.plugin.ts`, add a new cron schedule:

```typescript
// Daily account expiration check at midnight
cron.schedule("0 0 * * *", async () => {
  fastify.log.info("[AccountExpiration] Running daily expiration check");
  try {
    const result = await prisma.user.updateMany({
      where: {
        accountExpiresAt: { lte: new Date() },
        status: "APPROVED",
      },
      data: { status: "SUSPENDED" },
    });
    if (result.count > 0) {
      fastify.log.info(`[AccountExpiration] Suspended ${result.count} expired accounts`);
    }
  } catch (error) {
    fastify.log.error(error, "[AccountExpiration] Failed to process expirations");
  }
});
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/auth/ backend/src/plugins/auth.ts backend/src/modules/user-management/ backend/src/modules/sla-cron/
git commit -m "feat(fase2): add account expiration with auto-suspension and login enforcement"
```

---

## Task 10: Frontend — Account Expiration UI

**Files:**
- Modify: `frontend/src/features/residents/components/ResidentDialog.tsx`
- Modify: `frontend/src/features/residents/components/ResidentTable.tsx`

- [ ] **Step 1: Add date picker to ResidentDialog**

In `ResidentDialog.tsx`, add an optional date input for "Validade da conta":

```typescript
<div className="space-y-2">
  <Label htmlFor="accountExpiresAt">Validade da conta (opcional)</Label>
  <Input
    id="accountExpiresAt"
    type="date"
    value={formData.accountExpiresAt ?? ""}
    onChange={(e) => setFormData({ ...formData, accountExpiresAt: e.target.value || null })}
  />
  <p className="text-xs text-muted-foreground">
    Deixe vazio para conta sem expiração
  </p>
</div>
```

Wire the save handler to call `PATCH /users/:userId/expiration` with `condominiumId` when the expiration date changes.

- [ ] **Step 2: Add expiration indicators to ResidentTable**

In `ResidentTable.tsx`, add visual indicators in a new column or inline with the name:

```typescript
function ExpirationBadge({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return null;

  const expDate = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return <Badge variant="destructive" className="text-xs ml-2">Expirada</Badge>;
  }
  if (daysLeft <= 30) {
    return <Badge className="text-xs ml-2 bg-amber-500/10 text-amber-500 border-amber-500/20">Vence em {daysLeft}d</Badge>;
  }
  return null;
}
```

Display this badge next to the resident's name in the table.

- [ ] **Step 3: Add aggregate expiration alert to ResidentsPage**

In `ResidentsPage.tsx`, compute and display an alert banner above the filter bar:

```typescript
const expiringCount = useMemo(() => {
  if (!residents) return 0;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return residents.filter((r) => {
    if (!r.accountExpiresAt) return false;
    const exp = new Date(r.accountExpiresAt);
    return exp <= thirtyDaysFromNow && exp > new Date();
  }).length;
}, [residents]);

// In the JSX, before the filter bar:
{expiringCount > 0 && (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
    <p className="text-sm text-amber-500">
      {expiringCount} conta{expiringCount !== 1 ? "s" : ""} vence{expiringCount !== 1 ? "m" : ""} nos próximos 30 dias
    </p>
  </div>
)}
```

**Note:** The `Resident` type in `frontend/src/features/residents/types/index.ts` needs `accountExpiresAt?: string | null` added. The backend already returns this field via `useResidents` since it comes from the User model join.

- [ ] **Step 4: Verify in browser**

- Edit resident → set expiration date → save → reload → date persists
- Expiration in < 30 days → yellow badge
- Expired → red badge
- Clear date → badge disappears

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/residents/
git commit -m "feat(fase2): add account expiration UI with date picker and badges"
```

---

## Task 11: Backend — Sector Nudge Endpoint

**Files:**
- Create: `backend/src/modules/complaints/complaints-nudge.controller.ts`
- Modify: `backend/src/modules/complaints/complaints.routes.ts`

- [ ] **Step 1: Create nudge controller**

Create `backend/src/modules/complaints/complaints-nudge.controller.ts`:

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { evolutionService } from "../evolution/evolution.service";

const NUDGE_COOLDOWN_HOURS = 24;

export async function nudgeComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const complaintId = parseInt(id, 10);
  const user = request.user!;

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      sector: { include: { members: { where: { isActive: true }, include: { user: true } } } },
      condominium: true,
    },
  });

  if (!complaint) {
    throw new NotFoundError("Ocorrência não encontrada");
  }

  if (!complaint.sectorId || !complaint.sector) {
    throw new BadRequestError("Ocorrência não está atribuída a um setor");
  }

  const closedStatuses = ["RESOLVED", "CLOSED", "CANCELLED"];
  if (closedStatuses.includes(complaint.status)) {
    throw new BadRequestError("Não é possível cobrar posicionamento de ocorrência finalizada");
  }

  // Cooldown check
  if (complaint.lastNudgedAt) {
    const hoursSinceLastNudge =
      (Date.now() - new Date(complaint.lastNudgedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastNudge < NUDGE_COOLDOWN_HOURS) {
      const nextNudgeAt = new Date(
        new Date(complaint.lastNudgedAt).getTime() + NUDGE_COOLDOWN_HOURS * 60 * 60 * 1000
      );
      throw new BadRequestError(
        `Aguarde até ${nextNudgeAt.toLocaleString("pt-BR")} para cobrar novamente`
      );
    }
  }

  // Create status history entry
  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus: complaint.status,
      changedBy: user.id,
      action: "NUDGE",
      notes: `Cobrança de posicionamento ao setor ${complaint.sector.name}`,
    },
  });

  // Update lastNudgedAt
  await prisma.complaint.update({
    where: { id: complaintId },
    data: { lastNudgedAt: new Date() },
  });

  // Send WhatsApp to active sector members
  let notifiedCount = 0;
  const message = `Ocorrência #${complaintId} (${complaint.category}) aguarda posicionamento do setor ${complaint.sector.name}. Por favor, atualize o status.`;

  for (const member of complaint.sector.members) {
    const memberUser = member.user;
    const phone = memberUser.requestedPhone;
    if (phone) {
      try {
        await evolutionService.sendText({ number: phone, text: message });
        notifiedCount++;
      } catch (err) {
        request.log.warn({ err, userId: memberUser.id }, "Failed to send nudge WhatsApp");
      }
    }
  }

  const nextNudgeAt = new Date(Date.now() + NUDGE_COOLDOWN_HOURS * 60 * 60 * 1000);

  return reply.send({
    success: true,
    notifiedCount,
    nextNudgeAt: nextNudgeAt.toISOString(),
  });
}
```

- [ ] **Step 2: Add route**

In `complaints.routes.ts`, add:

```typescript
import { nudgeComplaintHandler } from "./complaints-nudge.controller";

fastify.post(
  "/:id/nudge",
  {
    onRequest: [
      fastify.authenticate,
      requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"]),
      requireTicketView(),
    ],
  },
  nudgeComplaintHandler
);
```

- [ ] **Step 3: Verify endpoint**

Test: `POST /complaints/42/nudge` with syndic token → 200, members notified.
Test: Repeat immediately → 400 cooldown error.
Test: With complaint without sector → 400 error.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/complaints/
git commit -m "feat(fase2): add sector nudge endpoint with WhatsApp notification"
```

---

## Task 12: Frontend — Nudge Button and Timeline Integration

**Files:**
- Modify: `frontend/src/features/complaints/components/ComplaintDetailSheet.tsx`

- [ ] **Step 1: Add nudge API hook**

Create or add to the complaints hooks file:

```typescript
export function useNudgeComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (complaintId: number) => {
      const { data } = await api.post(`/complaints/${complaintId}/nudge`);
      return data;
    },
    onSuccess: (_, complaintId) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["complaint", complaintId] });
    },
  });
}
```

- [ ] **Step 2: Add nudge button to ComplaintDetailSheet**

In `ComplaintDetailSheet.tsx`, in the header area where action buttons are:

```typescript
const nudgeMutation = useNudgeComplaint();
const canNudge = complaint.sectorId &&
  !["RESOLVED", "CLOSED", "CANCELLED"].includes(complaint.status);
const nudgeCooldown = complaint.lastNudgedAt &&
  (Date.now() - new Date(complaint.lastNudgedAt).getTime()) < 24 * 60 * 60 * 1000;

{canNudge && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => nudgeMutation.mutate(complaint.id)}
    disabled={nudgeCooldown || nudgeMutation.isPending}
    title={nudgeCooldown ? "Aguarde 24h entre cobranças" : "Cobrar posicionamento do setor"}
  >
    <Bell className="h-4 w-4 mr-1" />
    {nudgeCooldown ? "Cobrado" : "Cobrar Setor"}
  </Button>
)}
```

- [ ] **Step 3: Add `lastNudgedAt` to frontend Complaint type**

In `frontend/src/features/complaints/types/index.ts`, add to the `Complaint` interface:

```typescript
lastNudgedAt?: string | null;
```

- [ ] **Step 4: Verify in browser**

- Open complaint with sector → "Cobrar Setor" button visible
- Click → success toast, button changes to "Cobrado" (disabled)
- Complaint without sector → no button
- Resolved complaint → no button
- Timeline shows nudge entry with bell icon

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/complaints/
git commit -m "feat(fase2): add nudge button and timeline integration in complaint detail"
```

---

## Task 13: Final Verification and Commit

- [ ] **Step 1: TypeScript check frontend**

```bash
cd frontend && npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: TypeScript check backend**

```bash
cd backend && npx tsc --noEmit
```

Verify no new errors (pre-existing errors in announcements/automation are expected).

- [ ] **Step 3: Visual smoke test**

Test all 7 features in the browser:
1. Menu shows "Corpo Diretivo" ✓
2. Complaints table has "Setor" column ✓
3. Residents page has filter bar ✓
4. Resident complaint detail has timeline ✓
5. Syndic settings has two profile cards ✓
6. Resident edit has expiration date picker ✓
7. Complaint detail has "Cobrar Setor" button ✓

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "fix(fase2): resolve final TypeScript and integration issues"
```
