# TableForge

A modern, web-based PostgreSQL database management tool — think phpPgAdmin reimagined for the cloud era. Browse databases, run SQL, edit rows, manage schemas, and administer your PostgreSQL servers from a clean, responsive UI.

[![Go](https://img.shields.io/badge/Go-1.26-blue)]()
[![React](https://img.shields.io/badge/React-18-61DAFB)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6)]()
[![Docker](https://img.shields.io/badge/Docker-supported-2496F5)]()

---

## Features

- **Database Explorer** — Browse databases, schemas, tables, views, sequences, functions, indexes, constraints, and foreign keys
- **SQL Editor** — Execute ad-hoc SELECT, DML, and DDL queries with syntax-aware result rendering
- **Data Grid** — View, insert, update, delete, and bulk-delete rows with pagination
- **DDL Operations** — Rename columns/tables, alter types/defaults/nullability, create/drop indexes, truncate tables
- **Role & Access Management** — List roles, manage privileges
- **Activity Monitor** — View active queries, locks, and cancel/terminate backends
- **Export/Import** — CSV export, SQL dumps, CSV import
- **Search** — Full-text search across database objects
- **Session Authentication** — Secure login with CSRF protection
- **Docker-First** — Single-container deployment with baked-in defaults

---

## Quick Start

### Prerequisites

- Go 1.26+
- Node.js 20+
- PostgreSQL 12+
- Docker & Docker Compose (optional)

### Local Development

**1. Clone the repo**
```bash
git clone <repo-url>
cd TableForge
```

**2. Build the Go backend**
```bash
make build
```

**3. Install frontend dependencies and build the SPA**
```bash
cd frontend
pnpm install
pnpm build
cd ..
```

**4. Run the server**
```bash
./bin/tableforge -config config/config.yaml
```

Or use the convenience target:
```bash
make run
```

**5. Open your browser**
```
http://localhost:8080/app/login
```

### Docker

**Build and run the full stack:**
```bash
make up
```

Open [http://localhost:8080/app/login](http://localhost:8080/app/login) and log in with your PostgreSQL credentials.

**Shutdown:**
```bash
make down
```

> **Note:** By default, the Docker container uses the host network to connect to your system PostgreSQL on `127.0.0.1:5432`. No `pg_hba.conf` changes needed. Override connection parameters via environment variables: `PGHOST`, `PGPORT`, `PGSSLMODE`, `PGDEFAULTDB`.

---

## Configuration

TableForge uses a YAML config file (`config/config.yaml`). Key options:

| Setting | Description | Default |
|---|---|---|
| `servers` | List of PostgreSQL server connections | `postgres://localhost:5432/postgres` |
| `server.listen` | HTTP listen address | `:8080` |
| `server.session_key` | Session encryption key (random per-boot if empty) | — |
| `max_rows` | Default rows per page | `30` |
| `max_chars` | Max chars displayed per cell | `50` |
| `theme` | UI theme | `default` |
| `show_system` | Show system objects | `false` |
| `owned_only` | Show only owned objects | `false` |
| `extra_login_security` | Additional login checks | `true` |
| `log_level` | Logging verbosity | `info` |

Environment variables override server settings when running in Docker:
- `PGHOST`, `PGPORT`, `PGSSLMODE`, `PGDEFAULTDB` — Override the default PostgreSQL connection
- `APP_PORT` — App listen port (default `8080`)
- `PGADMIN_SESSION_KEY` — Session key for multi-instance deployments

---

## API Endpoints

All API routes are prefixed with `/api` and require authentication (except `/api/servers` and `/api/login`).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/servers` | List configured servers |
| POST | `/api/login` | Authenticate |
| GET | `/api/session` | Get current session |
| POST | `/api/logout` | Logout |
| GET | `/api/databases` | List databases |
| GET | `/api/schemas` | List schemas |
| GET | `/api/tables` | List tables |
| GET | `/api/columns` | List columns |
| GET | `/api/views` | List views |
| GET | `/api/sequences` | List sequences |
| GET | `/api/functions` | List functions |
| GET | `/api/indexes` | List indexes |
| GET | `/api/constraints` | List constraints |
| GET | `/api/foreign-keys` | List foreign keys |
| GET | `/api/triggers` | List triggers |
| GET | `/api/roles` | List roles |
| GET | `/api/browse` | Browse table data |
| GET | `/api/search` | Search objects |
| GET | `/api/row` | Get a single row |
| GET | `/api/activity` | List active queries |
| GET | `/api/variables` | List server variables |
| POST | `/api/sql` | Execute SQL |
| POST | `/api/sql/explain` | EXPLAIN a query |
| POST | `/api/rows` | Insert row |
| PUT | `/api/rows` | Update row |
| DELETE | `/api/rows` | Delete row |
| POST | `/api/rows/bulk-delete` | Bulk delete |
| GET/POST | `/api/export/csv\|sql\|dump` | Export data |
| POST | `/api/import/csv` | Import CSV |
| POST | `/api/admin/vacuum` | Vacuum a table |
| POST | `/api/admin/reindex` | Reindex a table |
| POST | `/api/ddl/*` | DDL operations |

---

## Project Structure

```
TableForge/
├── cmd/server/              # Application entrypoint
├── config/                  # Configuration files
├── internal/
│   ├── api/                 # HTTP handlers, router, middleware
│   ├── auth/                # Session management, CSRF
│   ├── db/                  # Database connection & capability detection
│   ├── dump/                # pg_dump / pg_dumpall wrappers
│   ├── model/               # Domain types and errors
│   ├── pgcatalog/           # PostgreSQL catalog queries
│   │   ├── databases.go     # Database listing
│   │   ├── schemas.go       # Schema listing
│   │   ├── tables.go        # Table metadata
│   │   ├── columns.go       # Column metadata
│   │   ├── views.go         # View metadata
│   │   ├── indexes.go       # Index metadata
│   │   ├── foreignkeys.go   # Foreign key queries
│   │   ├── roles.go         # Role management
│   │   ├── privileges.go    # Privilege queries
│   │   ├── data.go          # Row operations
│   │   ├── sql.go           # Ad-hoc SQL execution
│   │   ├── helpers.go       # Catalog helpers
│   │   └── admin.go         # Admin operations
│   └── config/              # Config loading & validation
├── frontend/                # React + TypeScript SPA
│   ├── src/
│   │   ├── app/             # App shell & providers
│   │   ├── presentation/    # Feature pages & components
│   │   ├── domain/          # Entities, use cases, repositories
│   │   ├── application/     # Queries & mutations
│   │   ├── infrastructure/  # API client, endpoints
│   │   └── shared/          # Config, types, utils, constants
│   ├── package.json         # Frontend dependencies
│   └── vite.config.ts       # Vite configuration
├── Makefile                 # Build & run targets
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose orchestration
└── go.mod                   # Go module definition
```

---

## Development

### Go
```bash
make build    # Build binary
make test     # Run all tests with race detector
make vet      # Vet code
make lint     # Run linter
make tidy     # Tidy dependencies
```

### Frontend
```bash
cd frontend
pnpm dev        # Start Vite dev server
pnpm build      # Build for production
pnpm test       # Run tests with Vitest
pnpm lint       # Lint with ESLint
pnpm format     # Format with Prettier
pnpm typecheck  # TypeScript type check
```

---

## Testing

Run Go tests:
```bash
make test
```

Run frontend tests:
```bash
cd frontend && pnpm test
```

Run integration tests (requires Docker):
```bash
make integration
```

---

## License

MIT
