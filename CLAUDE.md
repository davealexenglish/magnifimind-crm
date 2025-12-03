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

### Docker & Kubernetes Deployment
```bash
# Build and push Docker images (amd64 for t5810 server)
cd frontend
npm run build
docker buildx build --platform linux/amd64 -t t5810.webcentricds.net/magnifimind-crm-frontend:0.1.X .
docker push t5810.webcentricds.net/magnifimind-crm-frontend:0.1.X

cd ../backend
docker buildx build --platform linux/amd64 -t t5810.webcentricds.net/magnifimind-crm-backend:0.1.X .
docker push t5810.webcentricds.net/magnifimind-crm-backend:0.1.X

# Deploy via Helm (uses KUBECONFIG at $HOME/.kube/config-t5810)
cd ../helm/magnifimind-crm
# Update values.yaml with new image tags
KUBECONFIG=/Users/denglish/.kube/config-t5810 helm upgrade magnifimind-crm . -n magnifimind-crm

# Check deployment status
KUBECONFIG=/Users/denglish/.kube/config-t5810 kubectl get pods -n magnifimind-crm
KUBECONFIG=/Users/denglish/.kube/config-t5810 kubectl logs -n magnifimind-crm <pod-name>
```

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

### Frontend Architecture

#### TableManager Component Pattern
- **Generic CRUD Component** (`src/components/TableManager.tsx`)
- Handles all tables uniformly through column configuration
- Features:
  - Search/filter
  - Pagination (client-side)
  - Inline add/edit forms (two-column layout: label left, input right)
  - Bulk selection and delete
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

3. **Server Role** (`backend/internal/handlers/password_handler.go`)
   - Stores encrypted blobs only
   - NO decrypt endpoint exists
   - Returns encrypted passwords that client decrypts locally

**Workflow**:
- Add new → State: NEW (plaintext) → Save → Encrypt → POST → Server stores encrypted → Response with DB ID
- View existing → Decrypt with master password → State: DECRYPTED → Lock → State: ENCRYPTED
- Edit decrypted → State: MODIFIED_DECRYPTED → Save → Re-encrypt → PUT → Server updates

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

#### Authentication Endpoints
```
POST /api/v1/auth/register  # Returns JWT token
POST /api/v1/auth/login     # Returns JWT token
POST /api/v1/auth/refresh   # Refresh token
POST /api/v1/auth/logout    # Logout
```

### Environment Configuration
Required environment variables for backend:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL connection
- `JWT_SECRET` - JWT signing key
- `MASTER_PASSWORD` - For password vault encryption (server-side validation only)
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - Optional for SES email

Helm values in `helm/magnifimind-crm/values.yaml`:
- Image tags for `database`, `backend`, `frontend`
- NodePort `30081` for frontend access on t5810

## Common Development Workflows

### Adding a New Table
1. Define columns in `frontend/src/components/tables.tsx`
2. Add table config to `backend/internal/handlers/table_handler.go` in `tableConfigs` map
3. Add routes in `backend/cmd/server/main.go` protected routes section
4. Create database view if needed (for `active_flag` filtering and JOINs)

### Deploying Frontend Changes
1. Make code changes in `frontend/src/`
2. Build: `npm run build`
3. Docker build with incremented version tag
4. Push to t5810 registry
5. Update `helm/magnifimind-crm/values.yaml` frontend tag
6. Helm upgrade (uses KUBECONFIG at `~/.kube/config-t5810`)

### Uninstall and Reinstall Kubernetes Deployment
```bash
export KUBECONFIG=$HOME/.kube/config-t5810
helm uninstall magnifimind-crm -n magnifimind-crm
kubectl wait --for=delete pod --all -n magnifimind-crm --timeout=60s
helm install magnifimind-crm /path/to/helm/magnifimind-crm -n magnifimind-crm
```

**Note**: Registry at `t5810.webcentricds.net` must be running for image pulls to succeed. If pods show `ImagePullBackOff`, the Docker registry service needs to be started on t5810.
