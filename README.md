# CondoZap

Plataforma multi-tenant para gestão de condomínios com comunicação via WhatsApp.

## 📁 Estrutura

```txt
condozap/
├── frontend/           # React + Vite + TypeScript
├── backend/            # Fastify + Prisma + PostgreSQL
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   └── docker-compose.yml
└── docs/               # Documentação
    ├── ROADMAP.md
    ├── DEPLOYMENT.md
    └── SUPABASE_SETUP.md
```

## 🚀 Quick Start

### 1. Desenvolvimento

```bash
# Instalar dependências do frontend
cd frontend
npm install

# Instalar dependências do backend
cd ../backend
npm install
```

### 2. Rodar Localmente

```bash
# Terminal 1: Backend
cd backend
cp .env.example .env  # Configure suas variáveis
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 3. Deploy com Docker (Portainer)

```bash
cd backend
docker-compose up -d
```

## 📦 Deploy no Portainer

1. Acesse Portainer
2. **Stacks** → **Add stack**
3. **Upload** `backend/docker-compose.yml`
4. Configure as variáveis de ambiente (ver `backend/.env.example`)
5. **Deploy**!

## 🗄️ Database

```bash
cd backend
npx prisma migrate dev     # Desenvolvimento
npx prisma migrate deploy  # Produção
npx prisma studio          # GUI para ver o banco
```

## 📡 API

Backend roda em `http://localhost:3001`

Principais endpoints:

- `POST /api/auth/login`
- `POST /api/complaints`
- `POST /api/messages/send`

Ver documentação completa em [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 🛠️ Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS + Redux + React Query
- **Backend**: Node.js + TypeScript + Fastify + Prisma
- **Database**: PostgreSQL
- **Deploy**: Docker + Portainer

---

Desenvolvido com ❤️ para gestão eficiente de condomínios
