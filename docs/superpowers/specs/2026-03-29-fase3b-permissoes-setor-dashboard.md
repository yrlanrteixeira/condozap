# Fase 3B — Permissões Granulares por Setor + Dashboard de Setor

## Contexto

Fase final do ciclo de feedback do síndico profissional. Implementa permissões granulares configuráveis por setor (com override por membro) e um dashboard dedicado para membros de setor com role `SETOR_MEMBER`.

**Nota:** O role `SETOR_MEMBER` já existe no enum `UserRole` do Prisma (schema.prisma linha 23), em `backend/src/auth/roles.ts` (linha 8), e em `frontend/src/config/permissions.ts` (linha 20). Não é necessário criar um novo enum value — reutilizamos o existente. O role `SETOR_MANAGER` também existe e é tratado como isentoC das permissões granulares (tem acesso total ao setor, similar ao SYNDIC dentro do escopo do setor).

---

## 1. Modelo de Permissões Granulares

### Problema
Membros de setor têm permissões genéricas. Síndico não pode controlar quais ações cada setor ou membro pode executar sobre ocorrências.

### Ações Controladas

```typescript
export const SECTOR_ACTIONS = [
  "VIEW_COMPLAINTS",  // Ver ocorrências do setor
  "COMMENT",          // Adicionar comentários/andamento
  "CHANGE_STATUS",    // Mudar status (em andamento, aguardando, etc.)
  "RESOLVE",          // Marcar como resolvida
  "RETURN",           // Devolver ao morador
  "REASSIGN",         // Reatribuir para outro membro/setor
] as const;

export const DEFAULT_SECTOR_PERMISSIONS = [
  "VIEW_COMPLAINTS",
  "COMMENT",
  "CHANGE_STATUS",
];
```

### Schema Migration

Novo model `SectorPermission`:
```prisma
model SectorPermission {
  id        String   @id @default(cuid())
  sectorId  String   @map("sector_id")
  action    String

  sector    Sector   @relation(fields: [sectorId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @map("created_at")

  @@unique([sectorId, action])
  @@index([sectorId])
  @@map("sector_permissions")
}
```

Novo model `SectorMemberPermissionOverride`:
```prisma
model SectorMemberPermissionOverride {
  id              String       @id @default(cuid())
  sectorMemberId  String       @map("sector_member_id")
  action          String
  granted         Boolean      // true = concede, false = revoga

  sectorMember    SectorMember @relation(fields: [sectorMemberId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now()) @map("created_at")

  @@unique([sectorMemberId, action])
  @@index([sectorMemberId])
  @@map("sector_member_permission_overrides")
}
```

Adicionar relações nos models existentes:
- `Sector`: `permissions SectorPermission[]`
- `SectorMember`: `permissionOverrides SectorMemberPermissionOverride[]`

### Resolução de Permissões

Para verificar se um membro pode executar uma ação:
1. Buscar `SectorPermission` do setor → se a ação existe, o setor a permite
2. Buscar `SectorMemberPermissionOverride` do membro → `granted: false` revoga, `granted: true` concede
3. Resultado: `(setor permite AND membro não revogou) OR (membro explicitamente concedeu)`

### Default para Novos Setores

Ao criar um setor, criar automaticamente `SectorPermission` para as 3 ações default (`VIEW_COMPLAINTS`, `COMMENT`, `CHANGE_STATUS`). Modificar `sectors.service.ts` no flow de criação.

---

## 2. Role SETOR_MEMBER

### Problema
Membros de setor usam role ADMIN, gerando ambiguidade entre conselheiros e operadores de setor.

### Schema
O role `SETOR_MEMBER` já existe no enum `UserRole`. Nenhuma alteração de enum necessária.

### Diferenciação

| Aspecto | ADMIN (Conselheiro) | SETOR_MEMBER |
|---------|-------------------|---------------|
| Dashboard | Admin completo | Dashboard do setor |
| Sidebar | Menu completo | Apenas Dashboard + Ocorrências |
| Moradores | Vê (com restrição de torre se aplicável) | Não vê |
| Mensagens | Pode enviar | Não pode |
| Permissões | Fixas por role | Configuráveis por setor/membro |

### Criação de SETOR_MEMBER

**Novo endpoint `POST /users/create-sector-member`:**
- Body: `{ email, name, password, condominiumId, sectorId }`
- Guard: `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"])`
- Transação:
  1. Criar User com `role: SETOR_MEMBER`, `status: APPROVED`
  2. Criar UserCondominium
  3. Criar SectorMember com `isActive: true`
- Retorna user + membership

### Arquivos Afetados
- `backend/prisma/schema.prisma` (enum + models)
- `backend/src/auth/roles.ts` e `permissions.ts`
- Novo: `backend/src/modules/user-management/sector-member.controller.ts`
- `backend/src/modules/user-management/user-management.routes.ts`

---

## 3. Backend — Enforcement de Permissões

### Resolução de Permissões

Novo arquivo `backend/src/auth/sector-permissions.ts`:

```typescript
async function resolveSectorMemberPermissions(
  prisma: PrismaClient,
  sectorMemberId: string,
  sectorId: string
): Promise<Set<string>> {
  const sectorPerms = await prisma.sectorPermission.findMany({
    where: { sectorId },
    select: { action: true },
  });
  const allowed = new Set(sectorPerms.map(p => p.action));

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

### Middleware de Enforcement

Novo middleware `requireSectorAction(action: string)`:
- Para `SETOR_MEMBER`: resolve permissões e verifica se a ação está permitida
- Para outros roles: no-op (skip) — backward compatible
- Fluxo:
  1. Se `user.role` não é `SETOR_MEMBER` → next (skip). `SETOR_MANAGER` também faz skip (tem acesso total ao setor, isento das permissões granulares)
  2. Buscar complaint → verificar sectorId
  3. Buscar SectorMember do user para o setor
  4. Resolver permissões
  5. Se ação não permitida → 403

### Integração nos Endpoints de Complaints

Adicionar `requireSectorAction` como middleware adicional:
- `POST /:id/comment` → `requireSectorAction("COMMENT")`
- `PATCH /:id/status` → `requireSectorAction("CHANGE_STATUS")` — dentro do middleware, inspecionar `request.body.status`: se for `"RESOLVED"`, exigir também `RESOLVE`; se for `"RETURNED"`, exigir `RETURN`
- `POST /:id/return` → `requireSectorAction("RETURN")`
- Reatribuição → `requireSectorAction("REASSIGN")`

**Nota sobre RESOLVE:** Como o endpoint `PATCH /:id/status` é genérico, o middleware `requireSectorAction("CHANGE_STATUS")` deve inspecionar o body para aplicar ações mais granulares (RESOLVE, RETURN) quando o target status exigir. Isso mantém um único endpoint sem criar rotas separadas.

### Arquivos Afetados
- Novo: `backend/src/auth/sector-permissions.ts`
- Modify: `backend/src/modules/complaints/complaints.routes.ts`

---

## 4. Backend — Endpoints de Gestão de Permissões

### Endpoints

- **`GET /sectors/:sectorId/permissions`** — lista permissões do setor + overrides
  - Guard: `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"])`
  - Retorna: `{ sectorPermissions: string[], memberOverrides: [{ memberId, memberName, action, granted }] }`

- **`PUT /sectors/:sectorId/permissions`** — define permissões do setor
  - Body: `{ actions: string[] }`
  - Guard: `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"])` + verificar que o setor pertence ao condomínio do caller
  - Validação: actions devem estar dentro de `SECTOR_ACTIONS` — rejeitar valores desconhecidos
  - Delete all + create (replace pattern)

- **`PUT /sectors/:sectorId/members/:memberId/permissions`** — define overrides de membro
  - Body: `{ overrides: [{ action: string, granted: boolean }] }`
  - Guard: `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"])` + verificar que o setor pertence ao condomínio do caller
  - Validação: actions devem estar dentro de `SECTOR_ACTIONS`
  - Delete all overrides do membro + create novos

### Arquivos Afetados
- Novo: `backend/src/modules/structure/sector-permissions.controller.ts`
- Modify: `backend/src/modules/structure/structure.routes.ts` (onde as sector routes vivem atualmente)

---

## 5. Backend — Dashboard de Setor (KPIs)

### Endpoint

- **`GET /sector-dashboard/stats?sectorId=`** — KPIs do setor especificado
  - Guard: `requireRole(["SETOR_MEMBER"])`
  - Valida que o user é membro ativo do setor solicitado via `SectorMember`
  - Retorna:
    ```typescript
    {
      openCount: number;          // Ocorrências abertas no setor
      avgResponseTimeHours: number; // Tempo médio de primeira resposta
      resolvedLast30Days: number;  // Resolvidas nos últimos 30 dias
      slaCompliancePercent: number; // % dentro do prazo de SLA
    }
    ```
  - Queries:
    - `openCount`: count WHERE sectorId AND status NOT IN (RESOLVED, CLOSED, CANCELLED)
    - `avgResponseTimeHours`: avg(responseAt - createdAt) WHERE sectorId AND responseAt IS NOT NULL (últimos 30 dias)
    - `resolvedLast30Days`: count WHERE sectorId AND status IN (RESOLVED, CLOSED) AND resolvedAt >= 30 dias atrás
    - `slaCompliancePercent`: count com responseAt <= responseDueAt / total com responseDueAt (últimos 30 dias)

### GET /me — Incluir Permissões Resolvidas

Para `SETOR_MEMBER`, incluir no response do `GET /me`:
```typescript
sectors: [
  {
    sectorId: "xxx",
    sectorName: "Manutenção",
    permissions: ["VIEW_COMPLAINTS", "COMMENT", "CHANGE_STATUS"],
  },
  // ... caso pertença a múltiplos setores
]
```

**Multi-setor:** Um `SETOR_MEMBER` pode pertencer a múltiplos setores. O `GET /me` retorna array de setores com permissões resolvidas para cada um. O dashboard aceita `?sectorId=` para selecionar qual setor visualizar (default: primeiro setor ativo). O frontend exibe um selector de setor quando o membro pertence a mais de um.

### Arquivos Afetados
- Novo: `backend/src/modules/sector-dashboard/sector-dashboard.controller.ts`
- Novo: `backend/src/modules/sector-dashboard/sector-dashboard.routes.ts`
- Modify: `backend/src/app/app.ts` (registrar rotas)
- Modify: `backend/src/modules/auth/auth.routes.ts` (expandir GET /me)

---

## 6. Frontend — Gestão de Permissões (Síndico)

### SectorManagementDialog — Aba de Permissões

Expandir o `SectorManagementDialog` existente com seção de permissões:

**Permissões do setor:**
- 6 toggles com labels em português:
  - "Ver ocorrências" (VIEW_COMPLAINTS)
  - "Comentar" (COMMENT)
  - "Alterar status" (CHANGE_STATUS)
  - "Resolver" (RESOLVE)
  - "Devolver ao morador" (RETURN)
  - "Reatribuir" (REASSIGN)
- Salva via `PUT /sectors/:sectorId/permissions`

**Overrides por membro:**
- Na lista de membros, botão "Permissões" em cada um
- Cada ação: 3 estados — "Herdar do setor" (default, sem override), "Conceder" (granted: true), "Revogar" (granted: false)
- Salva via `PUT /sectors/:sectorId/members/:memberId/permissions`

### Criação de Membro de Setor

No SectorManagementDialog, expandir "Adicionar membro":
- Botão "Criar novo membro" → form: email, nome, senha
- Chama `POST /users/create-sector-member`
- User criado com role `SETOR_MEMBER`, vinculado ao setor

### Arquivos Afetados
- Modify: `frontend/src/features/structure/components/SectorManagementDialog.tsx`

---

## 7. Frontend — Sidebar + Routing SETOR_MEMBER

### Sidebar

Em `Sidebar.tsx`, quando role é `SETOR_MEMBER`:
- Mostrar: "Dashboard" (→ `/sector-dashboard`), "Ocorrências" (→ `/complaints`)
- Ocultar: Moradores, Mensagens, Estrutura, Corpo Diretivo, Configurações

### Routing

- Nova rota `/sector-dashboard` → `SectorDashboardPage`
- Guard: `requireRole(["SETOR_MEMBER"])` ou permission `VIEW_SECTOR_DASHBOARD`
- Redirect: `SETOR_MEMBER` ao fazer login → `/sector-dashboard` (não `/dashboard`)

### Permissions Config

Em `permissions.ts`, **substituir** as permissões existentes de `SETOR_MEMBER` (que hoje inclui VIEW_DASHBOARD, VIEW_METRICS, VIEW_STRUCTURE, VIEW_COMPLAINTS etc) por um set restrito:
```typescript
[UserRoles.SETOR_MEMBER]: [
  Permissions.VIEW_SECTOR_DASHBOARD,  // NOVO - adicionar ao enum Permissions
  Permissions.VIEW_SECTOR_COMPLAINTS, // NOVO - adicionar ao enum Permissions
]
```

Adicionar `VIEW_SECTOR_DASHBOARD` e `VIEW_SECTOR_COMPLAINTS` ao enum `Permissions`. As ações granulares (COMMENT, CHANGE_STATUS etc) são verificadas dinamicamente via API, não via permissions.ts.

### Arquivos Afetados
- Modify: `frontend/src/shared/components/layout/Sidebar.tsx`
- Modify: `frontend/src/config/permissions.ts`
- Modify: router (nova rota + redirect)
- Modify: `frontend/src/shared/components/guards/InitialRedirect.tsx` (redirect para `/sector-dashboard`)

---

## 8. Frontend — Dashboard de Setor

### SectorDashboardPage

Nova feature `frontend/src/features/sector-dashboard/`:

**SectorDashboardPage.tsx:**
- Fetch KPIs via `GET /api/sector-dashboard/stats`
- 4 cards no topo: Abertas, Tempo Médio, Resolvidas 30d, SLA %
- Lista de ocorrências do setor (reutilizar complaint list components)

**SectorDashboardKPIs.tsx:**
- 4 cards com ícones, cores, loading states
- Use os mesmos padrões de card dos dashboards existentes

### Detalhe de Ocorrência — Ações Condicionais

No `ComplaintDetailSheet`, quando user é `SETOR_MEMBER`:
- Ler `sectorPermissions` do `GET /me` response
- Sem `COMMENT` → textarea desabilitada
- Sem `CHANGE_STATUS` → select de status oculto
- Sem `RESOLVE` → opção "Resolvida" removida do select
- Sem `RETURN` → botão "Devolver" oculto
- Sem `REASSIGN` → opção de reatribuir oculta

### Arquivos Afetados
- Novo: `frontend/src/features/sector-dashboard/pages/SectorDashboardPage.tsx`
- Novo: `frontend/src/features/sector-dashboard/components/SectorDashboardKPIs.tsx`
- Modify: `frontend/src/features/complaints/components/ComplaintDetailSheet.tsx`

---

## Notas de Implementação

- **Migration única**: todos os schema changes (SectorPermission, SectorMemberPermissionOverride, SETOR_MEMBER enum) em uma migration.
- **Default permissions**: ao criar setor (em sectors.service.ts), criar automaticamente os 3 `SectorPermission` default dentro da mesma transação.
- **Backward compatibility**: o middleware `requireSectorAction` é no-op para non-SETOR_MEMBER users — não afeta fluxos existentes de ADMIN/SYNDIC.
- **GET /me expansion**: para SETOR_MEMBER, resolver permissões e incluir `sectorPermissions`, `sectorId`, `sectorName` no response. Para outros roles, estes campos ficam ausentes.
- **WhatsApp service**: verificar qual service layer é usado em cada módulo (`whatsappService.sendTextMessage()` ou `evolutionService.sendText()`). Seguir o padrão do módulo.

---

## Ordem de Implementação Sugerida

1. **Schema migration** (models + enum)
2. **Resolução de permissões** (sector-permissions.ts + middleware)
3. **Endpoints de gestão de permissões** (CRUD sector permissions + member overrides)
4. **Criação de SETOR_MEMBER** (endpoint + role config)
5. **Dashboard de setor backend** (stats endpoint + GET /me expansion)
6. **Frontend gestão de permissões** (SectorManagementDialog expansion)
7. **Frontend sidebar + routing** (SETOR_MEMBER menu + routes)
8. **Frontend dashboard de setor** (page + KPIs + lista de ocorrências)
9. **Frontend enforcement** (ações condicionais no ComplaintDetailSheet)
10. **Verificação final**

---

## Escopo Excluído

- Sistema de reserva de amenidades → projeto dedicado
- Notificações push/email → fase futura
- Relatórios customizados por setor → pode usar o módulo de reports existente com filtro de setor
