# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Backend (Go)
```bash
cd backend
go mod download              # Download dependencies
go run cmd/server/main.go   # Run development server (localhost:8080)
go build -o bin/server ./cmd/server  # Build production binary
go test ./...                # Run all tests
```

### Frontend (React + Vite)
```bash
cd frontend
npm install                  # Install dependencies
npm run dev                  # Run development server (localhost:3000)
npm run build               # Build for production
npm run preview             # Preview production build
```

### Docker & Kubernetes Deployment (r740 cluster)
```bash
# Build and push Docker images (amd64 for r740 server)
cd frontend
npm run build
docker buildx build --platform linux/amd64 -t 192.168.1.200:5000/magnifimind-crm-frontend:0.1.X .
docker push 192.168.1.200:5000/magnifimind-crm-frontend:0.1.X

cd ../backend
docker buildx build --platform linux/amd64 -t 192.168.1.200:5000/magnifimind-crm-backend:0.1.X .
docker push 192.168.1.200:5000/magnifimind-crm-backend:0.1.X

# Deploy via Helm (uses KUBECONFIG at ~/.kube/config-r740)
cd ../helm/magnifimind-crm
# Update values.yaml with new image tags
KUBECONFIG=~/.kube/config-r740 helm upgrade magnifimind-crm . -n magnifimind-crm

# Check deployment status
KUBECONFIG=~/.kube/config-r740 kubectl get pods -n magnifimind-crm
KUBECONFIG=~/.kube/config-r740 kubectl logs -n magnifimind-crm <pod-name>
```

**Current Image Versions** (as of Dec 2025):
- Frontend: `0.1.24`
- Backend: `0.1.13`
- Database: `0.1.11`

### AWS Lightsail Deployment (Cloud Option)

Alternative deployment to AWS Lightsail (~$22/month for personal use):
- **Container Service**: Micro ($7/month) - runs frontend + backend
- **PostgreSQL Database**: Micro ($15/month) - 40GB storage, managed backups

```bash
# Deployment script with step-by-step commands
cd aws/lightsail
./deploy.sh help              # Show all commands
./deploy.sh preflight         # Check prerequisites (AWS CLI, Docker, credentials)
./deploy.sh all               # Run full interactive deployment

# Individual steps
./deploy.sh ecr               # Create ECR repositories
./deploy.sh build             # Build and push Docker images to ECR
./deploy.sh database          # Create Lightsail PostgreSQL (~5-10 min)
./deploy.sh service           # Create Lightsail container service
./deploy.sh ecr-access        # Grant Lightsail access to ECR images
./deploy.sh deploy            # Deploy containers
./deploy.sh status            # Check deployment status
./deploy.sh copy-data         # Show instructions to copy data from K8s (optional)
./deploy.sh cleanup           # DELETE all Lightsail resources
```

**Key differences from K8s deployment:**
- Frontend uses `aws/lightsail/nginx.conf` (proxies to `localhost:8080` instead of K8s service name)
- Images pushed to ECR instead of local registry
- Environment variables set in `aws/lightsail/containers.json`
- Database connection uses `DB_SSL_MODE=require`

**Configuration files:**
- `aws/lightsail/deploy.sh` - Deployment script (edit CONFIG section with your values)
- `aws/lightsail/containers.json.template` - Container deployment config
- `aws/lightsail/public-endpoint.json` - Health check and public endpoint config
- `aws/lightsail/nginx.conf` - Lightsail-specific nginx config
- `aws/lightsail/Dockerfile.frontend` - Frontend Dockerfile for Lightsail

## Architecture Overview

### Multi-Tenant Security Model
- **Per-User Data Isolation**: All `pdat_*` tables include `sec_users_id` column
- **Middleware Enforcement**: `middleware.AuthMiddleware()` extracts user ID from JWT
- **Repository-Level Filtering**: All queries automatically filter by authenticated user's ID
- **Views for Security**: Database views like `v_active_people`, `v_person_addresses` enforce `active_flag='Y'` and user ownership
- Tables NOT multi-tenant: `pdat_email_types`, `pdat_phone_type` (global reference data)

### Backend Request Flow
1. **JWT Authentication** (`internal/middleware/auth.go`)
   - Extracts and validates JWT from `Authorization: Bearer <token>` header
   - Stores user ID and username in Gin context via `c.Set("userID", ...)` and `c.Set("username", ...)`

2. **Handler Layer** (`internal/handlers/`)
   - Retrieves user context: `userID, ok := middleware.GetUserID(c)`
   - Calls repository methods with user ID for multi-tenant filtering

3. **Repository Layer** (`internal/database/`)
   - Executes SQL queries with `WHERE sec_users_id = $1` automatically injected
   - Uses database views for read operations, base tables for writes

4. **Generic Table Handler** (`internal/handlers/table_handler.go`)
   - Single handler manages CRUD for all tables via `tableConfigs` map
   - Configuration specifies: table name, ID column, columns, multi-tenant flag, view name
   - Automatically applies user filtering when `MultiTenant: true`

5. **Admin Handler** (`internal/handlers/admin_handler.go`)
   - Database backup via `pg_dump` (binary format)
   - Database restore via `pg_restore` with `--clean` to truncate existing data

### Frontend Architecture

#### Navigation System
The app uses a dropdown-based navigation (`src/components/Navigation.tsx`):
- **Dashboard**: Home page with section cards
- **Contact Management** dropdown: People, Addresses, Emails, Phones, Notes, Links
- **Security** dropdown: Passwords, Accounts, Users, Roles
- **Administration** dropdown: Backup & Restore

Features:
- Click-to-open dropdowns with icons
- Auto-close when clicking outside or navigating
- Active section highlighting
- Logout button in header

#### TableManager Component Pattern
- **Generic CRUD Component** (`src/components/TableManager.tsx`)
- Handles all tables uniformly through column configuration
- Features:
  - Search/filter
  - Pagination (client-side)
  - Inline add/edit forms (two-column layout: label left, input right)
  - Bulk selection and soft delete
  - Hard delete option (for People table - CASCADE deletes related records)
  - Dynamic field types: text, email, tel, url, textarea, checkbox, select, person-picker

#### Column Configuration
Each table defines columns in `src/components/tables.tsx`:
```typescript
const columns: TableColumn[] = [
  { field: 'id_column', label: 'ID', readOnly: true, showInTable: false },
  { field: 'name', label: 'Name' },
  { field: 'person_id', label: 'Person', type: 'person-picker', showInTable: false },
  { field: 'person_full_name', label: 'Person Name', readOnly: true },  // Display field
  { field: 'type_id', label: 'Type', type: 'select', lookupEndpoint: 'email-types',
    lookupLabel: 'name', lookupValue: 'id', showInTable: false },
  { field: 'type_name', label: 'Type', readOnly: true },  // Display field
]
```

**Pattern**: Foreign key fields use `type: 'person-picker'` or `type: 'select'` for editing, paired with read-only display fields (e.g., `person_full_name`) that show in the table.

#### Password Vault - Client-Side Encryption
**CRITICAL**: The password vault implements zero-knowledge encryption:

1. **Encryption happens in browser** (`src/utils/passwordEncryption.js`)
   - AES-256-CBC with random IV per password
   - Master password NEVER sent to server
   - Each save generates new salt and IV

2. **State Management** (`src/utils/passwordStateManager.js`)
   - `PasswordState`: ENCRYPTED, DECRYPTED, MODIFIED_DECRYPTED, NEW
   - Tracks state transitions to ensure passwords encrypted exactly once before save
   - Temporary IDs for new entries (replaced with database ID after save)
   - `_pendingSaveEncrypted` flag for pre-encrypted values from Lock operation
   - `_wasNew` flag to track new entries that were locked before save

3. **Server Role** (`backend/internal/handlers/password_handler.go`)
   - Stores encrypted blobs only
   - NO decrypt endpoint exists
   - Returns encrypted passwords that client decrypts locally

**Workflow**:
- Add new → State: NEW (plaintext) → Lock (encrypts) → Save → POST → Server stores encrypted
- View existing → Decrypt with master password → State: DECRYPTED → Lock → State: ENCRYPTED
- Edit decrypted → State: MODIFIED_DECRYPTED → Lock (re-encrypts) → Save → PUT → Server updates

**Navigation Warning**: Warns user before leaving page with unsaved changes.

#### Backup & Restore Component
`src/components/BackupRestore.tsx` provides:
- **Backup**: Downloads PostgreSQL binary dump file (.dump format)
- **Restore**: Upload backup file to restore database (with confirmation modal)
- Warning that restore will truncate all existing data

### Database Views vs Base Tables
**Read operations**: Use views (e.g., `v_active_people`, `v_person_addresses`)
- Automatically filter `active_flag='Y'`
- Include JOIN columns like `person_full_name`, `state_name`
- Backend `TableConfig.UseView = true` and `TableConfig.ViewName = "v_active_people"`

**Write operations** (POST/PUT/DELETE): Target base tables (e.g., `pdat_person`, `pdat_address`)
- Views are read-only
- Delete handler maps view names to base tables (`table_handler.go:335-348`)

### PersonPicker Component
- Modal dialog for selecting people from `v_active_people` view
- Search by first name, last name, business flag
- Used in forms via `type: 'person-picker'` column config
- On selection, stores both `pdat_person_id` and `person_full_name` (for display) in form data

### Form Layout Standard
All add/edit forms in TableManager use two-column table layout:
- Left column: Field labels (right-aligned)
- Right column: Input widgets (full width)
- Dense spacing (`padding: 0.35rem`)

### API Endpoint Patterns

#### Standard CRUD Endpoints
```
GET    /api/v1/{resource}              # List all (filtered by user)
GET    /api/v1/{resource}/:id          # Get single record
POST   /api/v1/{resource}              # Create new
PUT    /api/v1/{resource}/:id          # Update existing
DELETE /api/v1/{resource}/:id          # Delete (soft delete via active_flag)
GET    /api/v1/{resource}/search?q=term # Search
```

Resources: `people`, `addresses`, `emails`, `phones`, `notes`, `links`, `passwords`

#### Hard Delete Endpoints (People only)
```
DELETE /api/v1/people/:id/hard         # Permanently delete single person + CASCADE
POST   /api/v1/people/hard-delete-bulk # Permanently delete multiple people + CASCADE
```

#### Authentication Endpoints
```
POST /api/v1/auth/register  # Returns JWT token
POST /api/v1/auth/login     # Returns JWT token
POST /api/v1/auth/refresh   # Refresh token
POST /api/v1/auth/logout    # Logout
```

#### Administration Endpoints
```
GET  /api/v1/admin/backup   # Download PostgreSQL binary backup (.dump)
POST /api/v1/admin/restore  # Upload and restore backup (multipart form: 'backup' field)
```

### Environment Configuration
Required environment variables for backend:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL connection
- `JWT_SECRET` - JWT signing key
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - Optional for SES email

Note: Password vault encryption is handled entirely client-side (browser). The master password never leaves the client.

Helm values in `helm/magnifimind-crm/values.yaml`:
- Image tags for `database`, `backend`, `frontend`
- Registry: `192.168.1.200:5000` (r740 cluster)
- NodePort `30081` for frontend access

## Common Development Workflows

### Adding a New Table
1. Define columns in `frontend/src/components/tables.tsx`
2. Add table config to `backend/internal/handlers/table_handler.go` in `tableConfigs` map
3. Add routes in `backend/cmd/server/main.go` protected routes section
4. Create database view if needed (for `active_flag` filtering and JOINs)

### Deploying Changes
1. Make code changes
2. Build frontend: `cd frontend && npm run build`
3. Docker build with incremented version tag for frontend and/or backend
4. Push to registry at `192.168.1.200:5000`
5. Update `helm/magnifimind-crm/values.yaml` with new tags
6. Helm upgrade: `KUBECONFIG=~/.kube/config-r740 helm upgrade magnifimind-crm ./helm/magnifimind-crm -n magnifimind-crm`

### Uninstall and Reinstall Kubernetes Deployment
```bash
export KUBECONFIG=~/.kube/config-r740
helm uninstall magnifimind-crm -n magnifimind-crm
kubectl wait --for=delete pod --all -n magnifimind-crm --timeout=60s
helm install magnifimind-crm ./helm/magnifimind-crm -n magnifimind-crm
```

### Backend Container Notes
The backend container includes `postgresql-client` package for backup/restore functionality:
- `pg_dump` for creating backups
- `pg_restore` for restoring backups

## Key Files Reference

### Frontend
- `src/App.tsx` - Route definitions
- `src/components/Navigation.tsx` - Dropdown navigation
- `src/components/Layout.tsx` - Page layout wrapper
- `src/components/TableManager.tsx` - Generic CRUD table component
- `src/components/PasswordVault.tsx` - Password management with client-side encryption
- `src/components/BackupRestore.tsx` - Database backup/restore UI
- `src/components/PersonPicker.tsx` - Person selection modal
- `src/components/tables.tsx` - Table column definitions
- `src/utils/passwordEncryption.js` - AES-256-CBC encryption
- `src/utils/passwordStateManager.js` - Password state machine

### Backend
- `cmd/server/main.go` - Server entry point and route setup
- `internal/handlers/table_handler.go` - Generic table CRUD handler
- `internal/handlers/person_handler.go` - Person-specific handlers (including hard delete)
- `internal/handlers/password_handler.go` - Password vault endpoints
- `internal/handlers/admin_handler.go` - Backup/restore endpoints
- `internal/middleware/auth.go` - JWT authentication
- `pkg/config/config.go` - Configuration loading
