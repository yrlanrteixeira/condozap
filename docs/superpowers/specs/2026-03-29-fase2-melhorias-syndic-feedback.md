# Fase 2 — Melhorias Baseadas no Feedback do Síndico Profissional

## Contexto

Continuação do trabalho iniciado na Fase 1 (correções críticas). A Fase 2 implementa melhorias de usabilidade e funcionalidades solicitadas pelo síndico profissional durante avaliação do MVP.

---

## 1. Renomeação: Conselheiros → Corpo Diretivo

### Escopo
Alterar label do menu e título da página de gestão de equipe.

### Correção
- **`Sidebar.tsx`**: label "Conselheiros" → "Corpo Diretivo"
- **`TeamManagementPage.tsx`**: título e descrições atualizados
- Rota permanece `/team`, sem mudança de lógica

### Arquivos Afetados
- `frontend/src/shared/components/layout/Sidebar.tsx`
- `frontend/src/features/user-management/pages/TeamManagementPage.tsx`

---

## 2. Coluna de Setor nas Ocorrências

### Problema
A tabela admin de ocorrências não exibe o setor atribuído, apesar do backend já retornar `complaint.sector`.

### Correção
- **`AdminComplaintsTablePage.tsx`**: adicionar coluna "Setor" entre "Categoria" e "Status"
  - Exibe `complaint.sector?.name` ou "—" se não atribuída
- **`ComplaintCard.tsx`** (mobile): adicionar badge de setor abaixo da categoria
- Zero mudança no backend (dados já incluídos na query)

### Arquivos Afetados
- `frontend/src/features/complaints/pages/AdminComplaintsTablePage.tsx`
- `frontend/src/features/complaints/components/ComplaintCard.tsx`

---

## 3. Filtros de Moradores

### Problema
O backend suporta filtros (torre, andar, tipo, busca por texto), mas a UI não os expõe.

### Correção
Barra de filtros inline acima da tabela em `ResidentsPage.tsx`:

- **Input de busca**: nome, email ou telefone — debounce 300ms
- **Select "Torre"**: populado dinamicamente pelas torres do condomínio (via `useStructure`)
- **Select "Andar"**: populado dinamicamente, filtrado pela torre selecionada
- **Select "Tipo"**: Proprietário / Inquilino
- **Contagem**: "X moradores encontrados"

### Comportamento
- Filtragem client-side (dados já carregados via `useResidents`)
- Responsivo: inputs empilham verticalmente no mobile
- Sem botão "Aplicar" — filtragem em tempo real

### Arquivos Afetados
- `frontend/src/features/residents/pages/ResidentsPage.tsx`
- Novo componente: `ResidentsFilterBar.tsx`

---

## 4. Minhas Ocorrências — Experiência do Residente

### Problema
O residente vê suas ocorrências mas não tem visibilidade do andamento (etapas, timeline, progresso).

### Correção — Lista de Ocorrências (melhorias)
Aprimorar os cards em `ResidentComplaintsPage.tsx`:
- Badge de status colorido + barra de progresso visual
- Ordenação: abertas primeiro, resolvidas/fechadas por último
- Indicador "⭐ Avaliar" para ocorrências resolvidas pendentes de CSAT

### Correção — Detalhe com Timeline Vertical (novo)
Ao clicar numa ocorrência, o `ResidentComplaintDetailSheet` ganha timeline vertical:

1. **Criada** — data/hora + descrição original do morador
2. **Triagem** — "Encaminhada para setor X" (quando `sectorId` é atribuído)
3. **Em Andamento** — quando status muda para `IN_PROGRESS`
4. **Comentários do admin** — cada comentário aparece como item na timeline
5. **Aguardando Morador** — quando status é `WAITING_USER`
6. **Resolvida** — quando status muda para `RESOLVED`
7. **Avaliação CSAT** — formulário inline (se resolvida e não avaliada)

### Fonte de Dados
O backend já retorna `statusHistory[]` (tipo `ComplaintStatusHistory`). A timeline é montada no frontend filtrando e ordenando cronologicamente:
- Entradas com `action === "STATUS_CHANGE"` → mudanças de status
- Entradas com `action === "COMMENT"` → comentários do admin
- Data de criação da ocorrência como primeiro item

O padrão já é usado em `ResidentComplaintDetailSheet.tsx` (linha 306). Reutilizar essa lógica no novo `ComplaintTimeline.tsx`.

**Nota**: O status legado `OPEN` do Prisma deve ser mapeado para `TRIAGE` na UI da timeline.

Sem novo endpoint necessário.

### Comportamento
- Timeline read-only para o residente (não edita status)
- Residente pode adicionar comentários (funcionalidade existente)
- Etapas futuras aparecem em cinza/opaco
- Etapas concluídas com ícone verde ✓

### Arquivos Afetados
- `frontend/src/features/complaints/pages/ResidentComplaintsPage.tsx`
- `frontend/src/features/complaints/components/ResidentComplaintDetailSheet.tsx`
- Novo componente: `ComplaintTimeline.tsx` (reutilizável)

---

## 5. Perfil Expandido do Síndico

### Problema
O modelo User só tem `name` editável. O síndico precisa de campos adicionais para contato e gestão, com separação entre informações públicas (visíveis para moradores) e privadas.

### Schema Migration
Novos campos no model `User`:

```prisma
contactPhone    String?     // Telefone de contato público (distinto de Resident.phone)
photoUrl        String?     // URL da foto de perfil (público)
officeHours     String?     // Horário de atendimento (público)
publicNotes     String?     // Notas públicas (público)
address         String?     // Endereço pessoal (privado)
websiteUrl      String?     // URL site/portfólio (privado)
privateNotes    String?     // Notas internas (privado)
```

Todos opcionais, nullable — sem breaking change.

### Backend
- **`PATCH /me`**: expandir `updateProfileSchema` para aceitar os novos campos
- **`GET /me`**: novos campos retornados automaticamente
- **Novo `GET /condominiums/:id/syndic-profile`** (em `condominiums.routes.ts`): retorna apenas campos públicos do síndico vinculado ao condomínio
  - Campos retornados: `name`, `contactPhone`, `photoUrl`, `officeHours`, `publicNotes`
  - Protegido por `requireCondoAccess()` (qualquer membro do condomínio)

### Frontend — Settings (Síndico)
Expandir `SettingsProfileCard.tsx` com dois cards separados:
- **Perfil Público** (badge verde): foto, nome, telefone, horário de atendimento, notas públicas
- **Dados Privados** (badge vermelho): email (read-only), endereço, URL, notas internas

### Frontend — Visão do Morador
- Card read-only acessível via menu ou header, usando `GET /condominiums/:id/syndic-profile`
- Exibe: foto, nome, telefone, horário e notas públicas

### Upload de Foto
- Reutiliza `POST /uploads/media` existente
- Avatar clicável com file picker
- Tipos: PNG, JPEG, WebP — limite 5MB

### Arquivos Afetados
- `backend/prisma/schema.prisma` (migration)
- `backend/src/modules/auth/auth.routes.ts` e `auth.schema.ts`
- `backend/src/modules/condominiums/condominiums.routes.ts` (novo endpoint syndic-profile)
- `frontend/src/features/settings/components/SettingsProfileCard.tsx`
- Novo: componente de visualização do síndico para moradores

---

## 6. Validade de Conta do Morador

### Problema
Não existe mecanismo para definir expiração de contas de moradores.

### Schema Migration
Novo campo no model `User`:

```prisma
accountExpiresAt    DateTime?   // Data de expiração da conta
```

Nullable — contas sem data nunca expiram.

### Backend — Suspensão Automática
Novo cron schedule diário (`0 0 * * *`) em `sla-cron.plugin.ts` (onde já existe o cron de SLA a cada 5 min), ou novo plugin `account-expiration-cron.plugin.ts` seguindo o mesmo padrão `fastify-plugin`:
- Query: `users WHERE accountExpiresAt <= NOW() AND status = 'APPROVED'`
- Ação: `update status = 'SUSPENDED'`
- Log de cada suspensão

### Backend — Enforcement no Login
Atualmente `auth.routes.ts` não verifica `UserStatus` no login. Adicionar verificação:
- No handler de login, após validar credenciais, checar `user.status === 'SUSPENDED'` → retornar 403 "Conta suspensa"
- No `authenticate` decorator (`plugins/auth.ts`), verificar `status` do payload JWT (já incluído no token em `auth.routes.ts` linha 118). Se `SUSPENDED`, retornar 403. Isso evita query ao banco a cada request — o token expira naturalmente em 7d, e a verificação no login garante que novos tokens não serão emitidos

### Backend — Endpoint
- **`PATCH /users/:userId/expiration`**
  - Body: `{ accountExpiresAt: "2026-12-31" | null, condominiumId: "..." }`
  - Protegido: `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"])` + `requireCondoAccess({ source: "body" })` para garantir que o atuante só modifique usuários dentro do seu escopo
  - O handler deve verificar que o `userId` alvo pertence ao `condominiumId` informado (via `UserCondominium`)
  - `null` remove expiração (conta permanente)
  - Se `accountExpiresAt` futuro e `status === SUSPENDED`, reativa automaticamente para `APPROVED`

### Frontend — Gestão
- **`ResidentDialog.tsx`**: campo date picker "Validade da conta" (opcional)
  - Hint: "Deixe vazio para conta sem expiração"
- **`ResidentTable.tsx`**: indicadores visuais:
  - Sem ícone se não tem expiração
  - Badge amarelo "Vence em X dias" se ≤ 30 dias
  - Badge vermelho "Expirada" se venceu (SUSPENDED)
- Alerta na listagem: "N contas vencem nos próximos 30 dias"

### Arquivos Afetados
- `backend/prisma/schema.prisma`
- `backend/src/modules/user-management/` (novo endpoint)
- `backend/src/modules/sla-cron/sla-cron.plugin.ts` (ou novo plugin de expiração)
- `frontend/src/features/residents/components/ResidentDialog.tsx`
- `frontend/src/features/residents/components/ResidentTable.tsx`

---

## 7. Cobrança de Status ao Setor

### Problema
Síndico não tem forma de cobrar posicionamento de um setor sobre uma ocorrência.

### Fluxo
1. Síndico visualiza ocorrência atribuída a setor
2. Clica "Cobrar Posicionamento"
3. Sistema automaticamente:
   - Registra na timeline: "Síndico cobrou posicionamento do setor X"
   - Envia WhatsApp aos membros ativos do setor: "Ocorrência #N aguarda posicionamento do setor X. Atualize o status."
4. Botão desabilitado por 24h (cooldown anti-spam)

### Schema Migration
Novo campo no model `Complaint`:

```prisma
lastNudgedAt    DateTime?   // Última cobrança de posicionamento
```

### Backend — Endpoint
- **`POST /complaints/:id/nudge`**
  - Protegido: `requireRole(["SYNDIC", "PROFESSIONAL_SYNDIC"])` + guard de acesso à ocorrência (seguir padrão `createTicketGuard` / `requireTicketModify()` existente em `authorize.ts` para garantir escopo de condomínio)
  - Validações:
    - Ocorrência com `sectorId` atribuído
    - Última cobrança há mais de 24h (ou nunca)
    - Status não pode ser `RESOLVED`, `CLOSED` ou `CANCELLED`
  - Ações:
    1. Cria `complaintStatusHistory` com nota "Cobrança de posicionamento"
    2. Busca `sectorMembers` ativos com telefone
    3. Envia mensagem via `evolutionService.sendText()` para cada membro
    4. Atualiza `complaint.lastNudgedAt`
  - Retorna: `{ success: true, notifiedCount: N, nextNudgeAt: "..." }`

### Frontend
- **`ComplaintDetailSheet.tsx`**: botão "Cobrar Posicionamento" no header
  - Visível: quando tem setor + status aberto/em andamento
  - Disabled + tooltip durante cooldown 24h
  - Ícone: `Bell` (lucide)
- **`ComplaintTimeline.tsx`**: item de timeline tipo "nudge" com ícone de sino
- Timeline do residente também mostra: "Administração cobrou atualização do setor" (transparência)

### Arquivos Afetados
- `backend/prisma/schema.prisma`
- `backend/src/modules/complaints/complaints.routes.ts`
- Novo: controller de nudge
- `frontend/src/features/complaints/components/ComplaintDetailSheet.tsx`
- `frontend/src/features/complaints/components/ComplaintTimeline.tsx`

---

## Ordem de Implementação Sugerida

1. **Renomeação** (Conselheiros → Corpo Diretivo) — trivial, frontend only
2. **Coluna de setor** — trivial, frontend only
3. **Filtros de moradores** — simples, frontend only
4. **Minhas Ocorrências** (timeline) — médio, frontend only
5. **Perfil do síndico** — médio, migration + backend + frontend
6. **Validade de conta** — médio, migration + backend + cron + frontend
7. **Cobrança ao setor** — médio, migration + backend + WhatsApp + frontend

---

## Notas de Implementação

- **Migration única**: itens 5, 6 e 7 alteram modelos diferentes (User, User, Complaint). Combinar em uma única migration Prisma para evitar conflitos.
- **CSAT inline na timeline**: reutilizar o componente `CsatDisplay.tsx` existente e o hook de submissão CSAT já disponível.
- **Mensagem de nudge**: seguir o padrão de `buildComplaintStatusMessage` em `shared/utils/notifications.ts` para construir a mensagem WhatsApp de cobrança.
- **Dados de setor na tabela**: o componente pai `ComplaintsPage` já passa `complaint.sector` populado pelo backend — não há gap de dados.

---

## Escopo Excluído (Fase 3+)

- Respostas pré-cadastradas
- Permissões granulares por setor
- Setores personalizados (salão de festa, churrasqueira)
- Fluxo de devolução/finalização de ocorrências
- Login individual por setor com dashboard
- Limitar envio de conselheiros a uma torre
