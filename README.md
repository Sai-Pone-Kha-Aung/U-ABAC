# U-ABAC

### Services & Ports
- **Frontend (Next.js 16)**: [http://localhost:3000](http://localhost:3000)
- **Admin Console (React 19 + Vite)**: [http://localhost:3001](http://localhost:3001)
- **Backend API (Express)**: [http://localhost:4000](http://localhost:4000)

---

## 🐳 Option 1: Run with Docker (Recommended)

Starts the entire stack (Frontend, Admin, Backend, SQLite DB) with one command:

```bash
docker compose up --build
```

### Useful Docker Commands
```bash
# View live logs
docker compose logs -f

# View logs from a specific service (e.g. backend)
docker compose logs -f backend

# Stop all containers
docker compose down

# Reset database & rebuild fresh
docker compose down -v
docker compose up --build
```

---

## 💻 Option 2: Run Locally (Without Docker)

### Prerequisites
- **Node.js**: `v22.18.0` (`nvm use`)
- **Package Manager**: `pnpm` (v11+)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Database
```bash
pnpm run db:push
pnpm run db:seed
```

### 3. Start Development Servers
```bash
pnpm run dev
```

---

## 📜 Available Scripts

| Command | Action |
| :--- | :--- |
| `pnpm run dev` | Starts all apps (`frontend`, `admin`, `backend`) in development mode |
| `pnpm run build` | Builds all packages and apps for production |
| `pnpm run check-types` | Type-checks all workspace projects |
| `pnpm run db:push` | Syncs schema changes to the SQLite database |
| `pnpm run db:seed` | Populates database with initial sample data |
| `pnpm run db:studio` | Opens Prisma Studio web UI |
