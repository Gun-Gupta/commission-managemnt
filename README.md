# Commission-Based Lead Management System

A production-quality full-stack system for managing sales leads with automatic commission distribution across sales hierarchies.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + JavaScript |
| Backend | Node.js + Express.js + JavaScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Commission Math | decimal.js (precision arithmetic) |

---

## Project Structure

```
commission-management-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database models + constraints
│   │   └── seed.js              # Test data seed script
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── user.controller.js
│   │   │   └── lead.controller.js
│   │   ├── routes/
│   │   │   ├── user.routes.js
│   │   │   └── lead.routes.js
│   │   ├── services/
│   │   │   ├── user.service.js
│   │   │   ├── lead.service.js
│   │   │   └── commission.service.js   # Core business logic
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   ├── utils/
│   │   │   └── createError.js
│   │   ├── lib/
│   │   │   └── prisma.js               # Singleton client
│   │   ├── app.js
│   │   └── server.js
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.js
    │   │   ├── page.js               # Home
    │   │   ├── users/page.js         # /users
    │   │   └── leads/
    │   │       ├── page.js           # /leads
    │   │       └── [id]/page.js      # /leads/:id
    │   ├── services/
    │   │   └── api.js                # All API calls centralized here
    │   └── app/globals.css
    └── package.json
```

---

## Database Schema

### User
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | |
| email | String | Unique |
| role | AGENT \| MANAGER | |
| managerId | UUID? | FK → User (self-referential) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Lead
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| title | String | |
| customerName | String | |
| revenue | Decimal(15,2) | |
| status | OPEN \| CLOSED | Default: OPEN |
| assignedUserId | UUID? | FK → User |
| closedAt | DateTime? | Set when closed |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### CommissionLedger
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| leadId | UUID | FK → Lead |
| userId | UUID? | FK → User (null for company) |
| beneficiaryType | USER \| COMPANY | |
| level | Int? | 0=company, 1/2/3=hierarchy |
| percentage | Decimal(8,4) | |
| amount | Decimal(15,2) | |
| createdAt | DateTime | |

**Unique constraint:** `(leadId, level)` — prevents duplicate commission records.

---

## Relationships

```
User (MANAGER)
  └─ reports: User[] (one manager → many reports)
  └─ manager: User?  (one user → one manager)

Lead
  └─ assignedUser: User?           (many leads → one user)
  └─ commissions: CommissionLedger[]

CommissionLedger
  └─ lead: Lead
  └─ user: User? (null for COMPANY entries)
```

---

## Commission Calculation

### Distribution Rules

When a lead is closed, revenue is distributed:

| Beneficiary | Percentage | Example (₹1,00,000) |
|-------------|-----------|---------------------|
| Company | 20% | ₹20,000 |
| Level 1 (Assigned User) | 40% | ₹40,000 |
| Level 2 (Manager) | 24% | ₹24,000 |
| Level 3 (Manager's Manager) | 16% | ₹16,000 |
| **Total** | **100%** | **₹1,00,000** |

### Missing Hierarchy Handling

If a hierarchy level doesn't exist, its percentage is absorbed by Company:

| Scenario | Company | L1 | L2 | L3 |
|----------|---------|----|----|-----|
| L1+L2+L3 exist | 20% | 40% | 24% | 16% |
| Only L1+L2 | 36% | 40% | 24% | — |
| Only L1 | 60% | 40% | — | — |

### Precision

All money calculations use `decimal.js` to avoid floating-point errors. The total of all commission amounts is validated to equal lead revenue before inserting.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| GET | `/api/leads` | List all leads |
| POST | `/api/leads` | Create lead |
| GET | `/api/leads/:id` | Get lead details + hierarchy + commissions |
| POST | `/api/leads/:id/assign` | Assign lead to user |
| POST | `/api/leads/:id/close` | Close lead + distribute commission |

---

## Transaction Strategy

The `POST /api/leads/:id/close` endpoint uses a **PostgreSQL transaction with Serializable isolation**:

```
BEGIN TRANSACTION (SERIALIZABLE)
  1. SELECT ... FOR UPDATE          ← acquire row lock on lead
  2. Re-check lead.status           ← idempotency check (after lock)
  3. If CLOSED → return existing commissions (no-op)
  4. Validate assignedUserId exists
  5. Traverse hierarchy (L1 → L2 → L3)
  6. Calculate commission amounts
  7. INSERT CommissionLedger records
  8. UPDATE Lead (status=CLOSED, closedAt=now())
COMMIT
```

If anything fails: **ROLLBACK** automatically.

---

## Idempotency Strategy

- **Step 1:** `SELECT ... FOR UPDATE` serializes concurrent requests at the DB level
- **Step 2:** Status re-check *after* lock prevents double-processing
- **Step 3:** Unique DB constraint `(leadId, level)` acts as a final safety net
- **Step 4:** `skipDuplicates: true` in `createMany` as additional belt-and-suspenders
- **Result:** If the lead was already closed when the lock is acquired, the existing commission records are returned — not duplicated

---

## Concurrency Handling

**Problem:** Two requests arrive at nearly the same time:
```
Request A: POST /api/leads/123/close  ─┐
Request B: POST /api/leads/123/close  ─┤ → same time
```

**Without proper locking:** Both could read `status = OPEN` before either updates, resulting in duplicate commissions.

**Our solution:**
1. `SELECT ... FOR UPDATE` — Request A acquires the row lock. Request B blocks.
2. Request A commits (status → CLOSED).
3. Request B acquires the lock, reads `status = CLOSED`, returns existing commissions.

Even if `FOR UPDATE` fails to prevent a duplicate (edge case), the unique constraint `(leadId, level)` will cause a `P2002` error, which is caught and returns the existing commissions.

---

## Edge Cases Handled

| Edge Case | Handling |
|-----------|---------|
| Close lead twice (sequential) | Returns existing commissions |
| Two simultaneous close requests | Row lock + unique constraint |
| Close without assigned user | 422 error |
| Assign nonexistent user | 404 error |
| Assign to nonexistent lead | 404 error |
| Assign a CLOSED lead | 409 error |
| Missing manager | Company absorbs the share |
| Missing manager's manager | Company absorbs the share |
| Duplicate email | 409 error |
| Negative/zero revenue | 400 validation error |
| Invalid UUID for managerId | Zod validation error |
| Circular manager relationship | Traversal check before create |
| Commission total ≠ revenue | Error thrown before DB insert |
| Raw DB errors exposed | Normalized by error handler |

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- npm

### 1. Clone and setup backend

```bash
cd commission-management-system/backend
npm install

# Configure database
cp .env.example .env
# Edit .env: set DATABASE_URL to your PostgreSQL connection string
```

### 2. Run database migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Seed test data

```bash
npm run seed
```

### 4. Start backend

```bash
npm run dev
# Backend runs on http://localhost:5000
```

### 5. Setup and run frontend

```bash
cd ../frontend
npm install

# .env.local is already configured for localhost:5000
npm run dev
# Frontend runs on http://localhost:3000
```

---

## Running

| Command | Effect |
|---------|--------|
| `npm run dev` (backend) | Start Express server with nodemon |
| `npm run seed` (backend) | Seed test data |
| `npx prisma studio` (backend) | Open Prisma Studio DB browser |
| `npm run dev` (frontend) | Start Next.js dev server |

### Seeded Test Data

After running `npm run seed`:

```
Users:
  Raj     → MANAGER (top-level)
  Amit    → MANAGER (manager: Raj)
  Rahul   → AGENT   (manager: Amit)
  Solo    → AGENT   (no manager)

Leads:
  Lead 1: "Website Development" — ₹1,00,000 — assigned: Rahul
  Lead 2: "Mobile App Development" — ₹50,000 — assigned: Amit
  Lead 3: "ERP Implementation" — ₹75,000 — assigned: Solo
  Lead 4: "Cloud Migration" — ₹2,00,000 — unassigned
```

---

## AI Usage

AI was used during development for project scaffolding, code suggestions, debugging assistance, and documentation. The core business logic, database transaction strategy, commission calculation, hierarchy traversal, idempotency, and concurrency handling were reviewed and understood by the developer.
