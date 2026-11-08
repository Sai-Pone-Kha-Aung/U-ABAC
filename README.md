# U-ABAC (University Attribute-Based Access Control)

A full-stack, enterprise-grade Attribute-Based Access Control (ABAC) system built inside a **Turborepo** monorepo with **pnpm**.

This project models university resource governance using the **NIST ABAC standard**, evaluating permissions dynamically across Subject, Action, Resource, and Environmental attributes.

---

## 🏗 Repository Structure

```text
U-ABAC/
├── apps/
│   ├── frontend/            # Next.js 16 (App Router + Turbopack) -> http://localhost:3000
│   │                        # Client Portal: Live user switcher, dynamic PDP badges, PEP access testing
│   ├── admin/               # React 19 + Vite -> http://localhost:3001
│   │                        # Policy Admin Point (PAP), live audit trail, and PDP sandbox simulator
│   └── backend/             # Node.js + Express (TypeScript) -> http://localhost:4000
│                            # Policy Enforcement Point (PEP) middleware & Policy Decision Point (PDP)
│
├── packages/
│   ├── types/               # @u-abac/types: Shared ABAC models, roles, clearance levels, and DTOs
│   ├── database/            # @u-abac/database: Prisma 7 ORM + SQLite + BetterSqlite3 adapter + seed
│   └── typescript-config/   # @u-abac/typescript-config: Centralized tsconfig presets (base, node, next, react)
│
├── .vscode/                 # Preconfigured IDE workspace settings (workspace TypeScript SDK)
├── .nvmrc                   # Node.js LTS version (v22.18.0)
├── turbo.json               # Turborepo task pipeline definition & cache rules
├── pnpm-workspace.yaml      # Monorepo workspaces & build approvals
└── package.json             # Root orchestration scripts
```

---

## 🛡 ABAC Architecture

```
                 ┌──────────────────────────────────────┐
                 │  Admin Console (PAP) - Port 3001     │
                 │  - Define & toggle policies          │
                 │  - Review access audit trails        │
                 │  - Test policy sandbox simulator     │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
┌──────────────────┐     Request     ┌────────────────────────┐     Query     ┌────────────────────────┐
│ Client Portal    │ ──────────────> │ Express Backend (PEP)  │ ────────────> │ Policy Engine (PDP)    │
│ Next.js 16       │                 │ Middleware:            │               │ - Evaluates conditions │
│ (Port 3000)      │ <────────────── │ - Checks permissions   │ <──────────── │ - Returns PERMIT/DENY  │
└──────────────────┘  200 OK / 403   │ - Emits audit records  │   Decision    └───────────┬────────────┘
                                     └────────────────────────┘                           │
                                                  │                                       │
                                                  ▼ Logs                                  ▼ Policies
                                     ┌─────────────────────────────────────────────────────────┐
                                     │         Prisma 7 + SQLite Database (dev.db)             │
                                     └─────────────────────────────────────────────────────────┘
```

### Core ABAC Components

1. **Policy Administration Point (PAP)**:
   - Located in [`apps/admin`](file:///Users/y2k/school/sp1/U-ABAC/apps/admin).
   - Allows security administrators to manage access control policies, toggle active rules, and monitor real-time audit logs.

2. **Policy Decision Point (PDP)**:
   - Located in [`apps/backend/src/services/pdp.ts`](file:///Users/y2k/school/sp1/U-ABAC/apps/backend/src/services/pdp.ts).
   - Evaluates whether an access request is **`PERMIT`** or **`DENY`** based on active database policies, rule conditions, clearance hierarchies, and department isolation.

3. **Policy Enforcement Point (PEP)**:
   - Located in [`apps/backend/src/middleware/abac.ts`](file:///Users/y2k/school/sp1/U-ABAC/apps/backend/src/middleware/abac.ts).
   - Express middleware that intercepts requests before reaching controller handlers, enforcing decisions and logging every evaluation to `AccessAuditLog`.

---

## 🏷 Attributes & Permissions Matrix

### 1. Subject Attributes
- **Role**: `ADMIN` | `STAFF` | `STUDENT` | `GUEST`
- **Department**: e.g., `Computer Science`, `Electrical Engineering`, `IT Administration`
- **Clearance Level**: `PUBLIC` (1) < `INTERNAL` (2) < `CONFIDENTIAL` (3) < `TOP_SECRET` (4)
- **Custom Attributes**: Key-value pairs (e.g. `cohort_year: 2023`, `standing: SENIOR`, `research_lead: cs_ai_lab`)

### 2. Resource Attributes
- **Type**: `syllabus`, `exam_paper`, `patent`, `policy_doc`
- **Classification**: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `TOP_SECRET`
- **Department**: Owning academic department
- **Owner**: Creator/assignee user ID

### 3. Supported Actions
`CREATE` • `READ` • `UPDATE` • `DELETE` • `EXPORT` • `APPROVE`

### 4. Rule Condition Operators
`EQUALS` • `NOT_EQUALS` • `IN` • `CONTAINS` • `GTE` • `LTE`

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v22.18.0` (Pinned in [`.nvmrc`](file:///Users/y2k/school/sp1/U-ABAC/.nvmrc))
- **Package Manager**: `pnpm` (v11+)

```bash
# Activate recommended Node.js version
nvm use
```

### 1. Install Workspace Dependencies
```bash
pnpm install
```

### 2. Setup the Database
Pushes the schema to local SQLite and seeds initial users, resources, and policies:
```bash
pnpm run db:push
pnpm run db:seed
```

### 3. Launch Development Servers
Runs all applications concurrently with live hot-reloading:
```bash
pnpm run dev
```

| Service | Framework | URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Portal** | Next.js 16 | [http://localhost:3000](http://localhost:3000) | User access portal with identity simulator |
| **Admin Console** | React 19 + Vite | [http://localhost:3001](http://localhost:3001) | Policy administration & audit logs |
| **Backend API** | Express | [http://localhost:4000](http://localhost:4000) | REST API & ABAC PEP/PDP Engine |

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & service status |
| `GET` | `/api/users` | List demo user identities for testing |
| `GET` | `/api/me` | Current authenticated subject attributes |
| `GET` | `/api/resources` | List all resources with dynamically computed read/write permissions |
| `GET` | `/api/resources/:id` | Fetch specific resource (enforced by ABAC PEP middleware) |
| `POST` | `/api/evaluate` | Direct PDP simulation endpoint (arbitrary Subject + Action + Resource) |
| `GET` | `/api/policies` | List all active/inactive ABAC policies and rules |
| `POST` | `/api/policies` | Create a new policy with custom rules and conditions |
| `PATCH` | `/api/policies/:id/toggle` | Enable or disable a policy in real time |
| `DELETE` | `/api/policies/:id` | Remove a policy |
| `GET` | `/api/audit-logs` | Retrieve recent access audit events (PERMIT/DENY history) |

---

## 📜 Available Scripts

| Command | Action |
| :--- | :--- |
| `pnpm run dev` | Boots `frontend`, `admin`, and `backend` concurrently |
| `pnpm run build` | Builds all packages and apps with Turborepo dependency caching |
| `pnpm run check-types` | Type-checks all 5 workspace projects with `tsc --noEmit` |
| `pnpm run db:generate` | Generates the Prisma 7 client |
| `pnpm run db:push` | Synchronizes SQLite database with `schema.prisma` |
| `pnpm run db:seed` | Populates database with sample university users, resources, and rules |
| `pnpm run db:studio` | Opens visual Prisma Studio interface in your browser |

---

## 🛠 Editor / IDE Notes

This repository includes a preconfigured [`.vscode/settings.json`](file:///Users/y2k/school/sp1/U-ABAC/.vscode/settings.json) specifying:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib"
}
```
This ensures your editor's language server uses the workspace's local TypeScript 5.8+ compiler, resolving monorepo package symlinks (`@u-abac/*`) seamlessly.
