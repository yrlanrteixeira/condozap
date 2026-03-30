# Fase 3A — Melhorias Operacionais

## Contexto

Continuação das fases 1 (correções críticas) e 2 (melhorias de usabilidade). A Fase 3A implementa funcionalidades operacionais solicitadas pelo síndico profissional: respostas pré-cadastradas, fluxo completo de devolução/finalização de ocorrências, e restrição de conselheiros por torre.

**Nota:** O item "Setores personalizados (salão de festa, churrasqueira)" foi reclassificado como sistema de reserva de amenidades — projeto dedicado fora desta fase.

---

## 1. Respostas Pré-cadastradas

### Problema
Admins/síndicos digitam respostas repetitivas ao atender ocorrências. Não há sistema de templates para agilizar o atendimento.

### Schema Migration
Novo model:

```prisma
model CannedResponse {
  id              String    @id @default(cuid())
  condominiumId   String?   @map("condominium_id")
  sectorId        String?   @map("sector_id")
  title           String
  content         String    @db.Text
  createdBy       String    @map("created_by")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  condominium     Condominium? @relation(fields: [condominiumId], references: [id])
  sector          Sector?      @relation(fields: [sectorId], references: [id])

  @@index([condominiumId])
  @@index([sectorId])
  @@map("canned_responses")
}
```

**Hierarquia de visibilidade:**
- `condominiumId = null` → template global (visível por todos, gerido por SUPER_ADMIN)
- `condominiumId = X, sectorId = null` → template do condomínio (todos os setores)
- `condominiumId = X, sectorId = Y` → template específico do setor

### Backend — Endpoints
- **`GET /canned-responses?condominiumId=&sectorId=`** — lista templates disponíveis
  - Retorna: globais + condomínio + setor (merge hierárquico)
  - Protegido: `requireCondoAccess()`
- **`POST /canned-responses`** — cria template
  - Body: `{ title, content, condominiumId?, sectorId? }`
  - Protegido: `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC", "ADMIN"])` para templates de condomínio, `requireSuperAdmin()` para globais
- **`PATCH /canned-responses/:id`** — atualiza template
  - Mesma proteção que POST
- **`DELETE /canned-responses/:id`** — remove template
  - Mesma proteção que POST

**Nota:** ADMINs (conselheiros) também atendem ocorrências e devem poder criar/editar templates do condomínio.
- **Seed data**: 5-10 templates globais padrão:
  - "Manutenção agendada"
  - "Aguardando orçamento"
  - "Problema resolvido"
  - "Encaminhado ao setor responsável"
  - "Informações insuficientes — favor detalhar"
  - "Em análise pelo fornecedor"
  - "Visita técnica agendada"

### Frontend — Gestão de Templates
- Nova section na página de Settings (ou sub-rota `/settings/canned-responses`) visível para SYNDIC/PROFESSIONAL_SYNDIC
- CRUD: lista cards com título/conteúdo, botão criar, editar inline, deletar com confirmação
- Campo "Setor" opcional (Select populado pelos setores do condomínio)

### Frontend — Uso no Atendimento
- **`ComplaintDetailSheet.tsx`**: popover/dropdown ao lado do textarea de comentário
  - Ícone de "templates" (ex: `FileText` lucide) que abre lista filtrada
  - Filtro por prioridade: templates do setor da ocorrência > templates do condomínio > templates globais
  - Ao selecionar, preenche o textarea (editável antes de enviar)
  - Busca por texto dentro dos templates

### Arquivos Afetados
- `backend/prisma/schema.prisma` (novo model + relações em Condominium e Sector)
- Novo: `backend/src/modules/canned-responses/` (routes, controller, service, schema)
- `frontend/src/features/complaints/components/ComplaintDetailSheet.tsx` (popover de templates)
- Novo: `frontend/src/features/settings/components/CannedResponsesManager.tsx`

---

## 2. Fluxo de Devolução/Finalização de Ocorrências

### Problema
Falta devolução explícita ao morador, auto-fechamento após resolução, e reabertura por moradores insatisfeitos.

### Schema Migration

Novos valores no enum `ComplaintStatus`:
```prisma
enum ComplaintStatus {
  OPEN
  NEW
  TRIAGE
  IN_PROGRESS
  WAITING_USER
  WAITING_THIRD_PARTY
  RESOLVED
  CLOSED
  CANCELLED
  RETURNED      // Devolvida ao morador com motivo
  REOPENED      // Reaberta pelo morador após fechamento
}
```

Novo campo no model `Complaint`:
```prisma
closedAt  DateTime?  @map("closed_at")
```

Novo campo no model `Condominium`:
```prisma
reopenDeadlineDays  Int @default(7) @map("reopen_deadline_days")
```

### Novas Transições

Adicionar ao `complaints.transitions.ts` (o `VALID_TRANSITIONS` é `Record<ComplaintStatus, ComplaintStatus[]>`, todos os novos status devem ser chaves):
```
IN_PROGRESS → RETURNED       (devolução ao morador)
TRIAGE → RETURNED             (devolução ao morador)
RETURNED → [IN_PROGRESS]      (morador complementa — chave obrigatória no Record)
CLOSED → REOPENED             (morador reabre dentro do prazo)
REOPENED → [IN_PROGRESS, CANCELLED]  (síndico aceita ou rejeita — chave obrigatória no Record)
```

Transições existentes mantidas (RESOLVED → CLOSED manual permanece).

### Auto-Close (RESOLVED → CLOSED)
O campo `autoCloseAfterDays` já existe no model Condominium (default 7). O `automation.engine.ts` já produz actions `auto_close` e `sla-cron.plugin.ts` (linhas 44-68) já trata a transição RESOLVED → CLOSED com criação de `ComplaintStatusHistory`. **Não duplicar essa lógica.** Apenas adicionar ao handler existente:
- Set `closedAt` no complaint ao fechar
- Enviar WhatsApp ao morador via `whatsappService.sendTextMessage()`: "Sua ocorrência #N foi encerrada automaticamente após {X} dias sem contestação. Você pode reabri-la em até {Y} dias se necessário."

### Backend — Endpoints
- **`POST /complaints/:id/return`** — devolve ao morador
  - Body: `{ reason: string }` (obrigatório, min 10 chars)
  - Guard: `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC", "ADMIN"])` + `requireTicketModify()`
  - Validação: status deve ser `IN_PROGRESS` ou `TRIAGE`
  - Ações:
    1. Update status → RETURNED
    2. Criar `ComplaintStatusHistory` com `action: "RETURN"`, notes: reason
    3. WhatsApp ao morador: "Sua ocorrência #N foi devolvida: {reason}. Acesse o sistema para complementar."
  - Retorna complaint atualizada

- **`POST /complaints/:id/complement`** — morador complementa após devolução
  - Body: `{ message: string }` (obrigatório, min 10 chars)
  - Guard: `requireComplaintOwner()`
  - Validação: status deve ser `RETURNED`
  - Ações:
    1. Criar `ComplaintStatusHistory` com `action: "COMMENT"`, notes: message
    2. Update status → IN_PROGRESS
    3. Notificar síndico/admin: "Morador complementou a ocorrência #N"
  - Retorna complaint atualizada

- **`POST /complaints/:id/reopen`** — morador reabre
  - Body: `{ reason: string }` (obrigatório, min 10 chars)
  - Guard: `requireComplaintOwner()`
  - Validação:
    - Status deve ser `CLOSED`
    - `closedAt + reopenDeadlineDays > NOW()` (dentro do prazo, usa `closedAt` — não `updatedAt` que é instável)
  - Ações:
    1. Update status → REOPENED
    2. Criar `ComplaintStatusHistory` com `action: "REOPEN"`, notes: reason
    3. Notificar síndico/admin
  - Retorna complaint atualizada

### Frontend — Admin
- **`ComplaintDetailSheet.tsx`**: botão "Devolver ao Morador" (ícone `Undo2`)
  - Visível quando: status é `IN_PROGRESS` ou `TRIAGE`
  - Abre dialog/modal com textarea de motivo obrigatório (min 10 chars)
  - Status `RETURNED` aparece com badge laranja na tabela
- **`ComplaintDetailSheet.tsx`**: para ocorrências `REOPENED`, mostrar botões "Retomar" (→ IN_PROGRESS) e "Rejeitar" (→ CANCELLED)

### Frontend — Residente
- **`ResidentComplaintDetailSheet.tsx`**: botão "Reabrir Ocorrência" (ícone `RotateCcw`)
  - Visível quando: status é `CLOSED` e dentro do prazo
  - Abre dialog com textarea de motivo
  - Mostrar prazo restante: "Você tem X dias para reabrir"
- **`ResidentComplaintsPage.tsx`**: status `RETURNED` aparece com badge laranja e ação "Complementar" que direciona para o detalhe
- **Timeline**: novos ícones — RETURNED (`Undo2`, laranja), REOPENED (`RotateCcw`, azul), AUTO_CLOSE (`Timer`, cinza)

### Arquivos Afetados
- `backend/prisma/schema.prisma` (enum + campo Condominium)
- `backend/src/modules/complaints/complaints.transitions.ts`
- Novo: `backend/src/modules/complaints/complaints-return.controller.ts`
- Novo: `backend/src/modules/complaints/complaints-reopen.controller.ts`
- `backend/src/modules/complaints/complaints.routes.ts` (novas rotas)
- `backend/src/modules/sla-cron/sla-cron.plugin.ts` (auto-close)
- `frontend/src/features/complaints/components/ComplaintDetailSheet.tsx`
- `frontend/src/features/complaints/components/ResidentComplaintDetailSheet.tsx`
- `frontend/src/features/complaints/components/ComplaintTimeline.tsx` (novos ícones)
- `frontend/src/features/complaints/types/index.ts` (novos status)

---

## 3. Limitar Conselheiros a uma Torre

### Problema
Conselheiros (ADMINs com `councilPosition`) veem moradores e ocorrências de todo o condomínio, quando deveriam ser restritos à sua torre atribuída.

### Schema Migration
Novo campo no model `UserCondominium`:
```prisma
assignedTower  String?  @map("assigned_tower")
```

Nullable — conselheiros sem torre atribuída mantêm acesso completo (backward compatible).

### Backend — Contexto de Acesso
Expandir `AccessContext` em `context.ts`:
```typescript
interface AccessContext {
  role: string;
  scope: "GLOBAL" | "LOCAL";
  allowedCondominiumIds: string[];
  allowedSectorIds: string[];
  assignedTower?: string | null;  // NOVO
}
```

Em `resolveAccessContext()`, quando o user é ADMIN com `councilPosition`, popular `assignedTower` a partir de `UserCondominium.assignedTower`.

### Backend — Filtragem Automática
- **Moradores** (`residents.service.ts`): adicionar filtro `tower = context.assignedTower` quando definido
- **Ocorrências** (`complaints.repository.ts`): no `buildAccessFilteredWhere`, quando `context.assignedTower` definido, filtrar por complaints cujo residente pertence à torre atribuída
- **Mensagens** (`messages.service.ts`): validar compatibilidade de escopo:
  - Scope ALL → bloquear ("Você só pode enviar para sua torre")
  - Scope TOWER → validar `tower === assignedTower`
  - Scope FLOOR/UNIT → validar que torre do andar/unidade é `assignedTower`

### Backend — Endpoint
- **`PATCH /users/:userId/assigned-tower`**
  - Body: `{ assignedTower: string | null, condominiumId: string }`
  - Guard: `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"])` + `requireCondoAccess({ source: "body" })`
  - Atualiza `UserCondominium.assignedTower`
  - `null` remove restrição (conselheiro volta a ver tudo)

### Frontend — Gestão (Síndico)
- **`TeamManagementPage.tsx`**: no card de cada conselheiro, adicionar campo Select "Torre atribuída"
  - Opções: "Todas as torres" (null) + torres do condomínio (via `useStructure`)
  - Ao mudar, chama `PATCH /users/:userId/assigned-tower`
  - Indicador visual: badge com nome da torre ao lado do nome do conselheiro

### Frontend — Restrições (Conselheiro)
- **`MessagingPage.tsx`**: quando user tem `assignedTower`:
  - Select de scope: "Todos" desabilitado
  - Select de torre: pré-selecionado e locked (read-only)
- **Demais páginas**: dados filtrados pelo backend transparentemente — nenhuma mudança de UI necessária

### Propagação
O `assignedTower` precisa estar disponível no frontend. Retornar via `GET /me` no array `condominiums[]`.

**Atenção:** O `GET /me` atual (auth.routes.ts linhas 202-205) mapeia condominiums com apenas `id` e `name`. É necessário expandir o mapeamento para incluir `uc.role`, `uc.councilPosition`, e `uc.assignedTower`:
```typescript
const userCondominiums = condominiums.map((uc) => ({
  id: uc.condominium.id,
  name: uc.condominium.name,
  role: uc.role,
  councilPosition: uc.councilPosition,
  assignedTower: uc.assignedTower,
}));
```

### Arquivos Afetados
- `backend/prisma/schema.prisma` (novo campo UserCondominium)
- `backend/src/auth/context.ts` (expandir AccessContext + resolveAccessContext)
- `backend/src/modules/residents/residents.service.ts` (filtro por torre)
- `backend/src/modules/complaints/complaints.repository.ts` (filtro por torre)
- `backend/src/modules/messages/messages.service.ts` (validação de escopo)
- Novo: `backend/src/modules/user-management/assigned-tower.controller.ts`
- `backend/src/modules/user-management/user-management.routes.ts` (nova rota)
- `backend/src/modules/auth/auth.routes.ts` (incluir assignedTower no GET /me)
- `frontend/src/features/user-management/pages/TeamManagementPage.tsx` (select de torre)
- `frontend/src/features/messages/pages/MessagingPage.tsx` (lock de torre)

---

## Notas de Implementação

- **Migration única**: os 3 itens alteram modelos diferentes (novo CannedResponse, enum ComplaintStatus + Condominium, UserCondominium). Podem ser combinados em uma única migration.
- **ComplaintTimeline**: já suporta tipos customizados via `action` field. Adicionar novos cases ao `buildTimelineItems` para "RETURN", "REOPEN", "AUTO_CLOSE" com ícones distintos (`Undo2`, `RotateCcw`, `Timer`). Estes devem ser novos valores no `TimelineItem.type` union, não o genérico `"status"`.
- **`requireComplaintOwner()`**: o guard existente em `authorize.ts` tem mensagem hardcoded "Apenas moradores podem avaliar". Para os endpoints de complement e reopen, usar um guard parametrizado ou criar novo guard com mensagem apropriada.
- **Seed data**: templates globais de respostas devem ser incluídos no seed existente (`prisma/seed.ts`).
- **WhatsApp**: verificar qual service layer é usado no módulo de complaints (`whatsappService.sendTextMessage()` ou `evolutionService.sendText()`). Seguir o padrão já estabelecido em `complaints.service.ts`.

---

## Ordem de Implementação Sugerida

1. **Schema migration** (todos os modelos)
2. **Respostas pré-cadastradas** — backend CRUD + seed → frontend gestão → frontend uso no atendimento
3. **Fluxo de devolução/finalização** — transitions + endpoints → auto-close cron → frontend admin → frontend residente → timeline
4. **Restrição de conselheiros** — contexto de acesso → filtragem backend → endpoint → frontend gestão → frontend restrições

---

## Escopo Excluído

- **Sistema de reserva de amenidades** (salão de festa, churrasqueira) → projeto dedicado
- **Fase 3B**: Permissões granulares por setor + Login individual por setor com dashboard
