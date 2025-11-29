# Manifimind CRM

A comprehensive Customer Relationship Management system built with React, Go, and PostgreSQL.

## Project Overview

Manifimind CRM is a full-stack web application designed to manage personal data (PData) extracted from PDF files and stored in a relational database. The application provides:

- **User Authentication**: JWT-based authentication with email verification
- **CRUD Operations**: Full create, read, update, and delete functionality for all data tables
- **Search Functionality**: Advanced search across all database tables
- **Role-Based Access**: Security roles and privileges management
- **Person Management**: Comprehensive contact management with addresses, phones, emails, notes
- **Calendar Integration**: Event and calendar management
- **🔐 Password Vault**: Military-grade AES-256-CBC encrypted password storage with random salts

## Tech Stack

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin Web Framework
- **Database**: PostgreSQL 13+
- **Authentication**: JWT with bcrypt password hashing
- **Email**: AWS SES (with development mode fallback)

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **State Management**: React Context / Redux (TBD)
- **UI Library**: TBD (Material-UI, Ant Design, or Tailwind CSS)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes with Helm charts
- **Registry**: Private Docker registry at t5810.webcentricds.net
- **Database Migrations**: SQL scripts (init_manifimind_crm.sql, load_manifimind_crm.sql)

## Database Schema

The application manages two main categories of tables:

### Security Tables (sec_*)
- `sec_users`: User information (first name, last name)
- `sec_accounts`: Authentication credentials
- `sec_roles`: Security roles
- `sec_privileges`: Security privileges
- `sec_acct_roles`: Account-role relationships
- `sec_role_privs`: Role-privilege relationships

### Personal Data Tables (pdat_*)
- `pdat_person`: Person records (contacts, businesses)
- `pdat_address`: Physical addresses
- `pdat_pers_emails`: Email addresses with types
- `pdat_pers_phone`: Phone numbers with types
- `pdat_pers_notes`: Notes about persons
- `pdat_calendar`: Calendar events
- `pdat_cal_pers`: Person-event relationships
- `pdat_links`: Web links
- `pdat_passwd`: Stored passwords/credentials
- `pdat_email_types`: Email type definitions
- `pdat_phone_type`: Phone type definitions

## Project Structure

```
manifimind-crm/
├── backend/                 # Go backend application
│   ├── cmd/
│   │   └── server/         # Main application entry point
│   ├── internal/
│   │   ├── database/       # Database connection and repositories
│   │   ├── handlers/       # HTTP request handlers
│   │   ├── middleware/     # Auth and other middleware
│   │   ├── models/         # Data models
│   │   └── services/       # Business logic services
│   ├── pkg/
│   │   ├── config/         # Configuration management
│   │   └── utils/          # Utility functions (JWT, password, etc.)
│   ├── Dockerfile          # Backend container image
│   └── .env.example        # Environment variables template
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   ├── Dockerfile          # Frontend container image
│   └── package.json
├── db/                     # Database files
│   ├── init_manifimind_crm.sql   # Schema definitions
│   ├── load_manifimind_crm.sql   # Seed data
│   ├── Dockerfile          # Database container image
│   └── extract_schemas.py  # Schema extraction script
├── helm/                   # Kubernetes Helm charts
│   └── manifimind-crm/     # Main application chart
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── docker-compose.yml      # Local development setup
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Node.js 18+ and npm/yarn
- PostgreSQL 13+
- Docker and Docker Compose (for containerized deployment)
- kubectl and Helm (for Kubernetes deployment)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/davealexenglish/magnifimind-crm.git
   cd manifimind-crm
   ```

2. **Set up the database**
   ```bash
   # Create database
   createdb manifimind_crm

   # Run schema migrations
   psql -d manifimind_crm -f db/init_manifimind_crm.sql

   # Load seed data
   psql -d manifimind_crm -f db/load_manifimind_crm.sql
   ```

3. **Configure backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run backend**
   ```bash
   cd backend
   go mod download
   go run cmd/server/main.go
   ```

   The backend will start on http://localhost:8080

5. **Run frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The frontend will start on http://localhost:3000

### Docker Compose Setup

```bash
docker-compose up -d
```

This will start all services (database, backend, frontend) in containers.

### Kubernetes Deployment

1. **Build and push images**
   ```bash
   # Login to registry
   echo "$KUBE_PASSWORD" | docker login $KUBE_HOST -u $KUBE_USERNAME --password-stdin

   # Build and push
   ./scripts/build-and-push.sh
   ```

2. **Deploy with Helm**
   ```bash
   export KUBECONFIG=$HOME/.kube/config-t5810
   helm install manifimind-crm ./helm/manifimind-crm
   ```

## API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

### User Endpoints

- `GET /api/v1/users` - List all users
- `GET /api/v1/users/:id` - Get user by ID
- `GET /api/v1/users/search?q=term` - Search users
- `PUT /api/v1/users/:id` - Update user (protected)
- `DELETE /api/v1/users/:id` - Delete user (protected)

### Person Endpoints

- `GET /api/v1/persons` - List all persons (protected)
- `GET /api/v1/persons/:id` - Get person by ID (protected)
- `POST /api/v1/persons` - Create person (protected)
- `PUT /api/v1/persons/:id` - Update person (protected)
- `DELETE /api/v1/persons/:id` - Delete person (protected)
- `GET /api/v1/persons/search?q=term` - Search persons (protected)

## Password Encryption System

The password vault uses **AES-256-CBC encryption** with the following security features:

- ✅ AES-256-CBC encryption (industry standard)
- ✅ Master password-based encryption (stored in environment variables)
- ✅ Random 16-byte salt per password (prevents rainbow table attacks)
- ✅ Random IV per encryption (prevents pattern analysis)
- ✅ Same password encrypted multiple times yields different ciphertexts
- ✅ Client-side decryption (user provides master password to view)
- ✅ No plaintext passwords in database or logs
- ✅ Comprehensive test coverage

**📖 Full Documentation**: See [docs/PASSWORD_ENCRYPTION.md](docs/PASSWORD_ENCRYPTION.md)

**⚠️ CRITICAL**: Set a strong `MASTER_PASSWORD` environment variable. If lost, all encrypted passwords are unrecoverable!

```bash
# Generate a strong master password
openssl rand -base64 32

# Set in environment
export MASTER_PASSWORD="your-generated-password"
```

## Environment Variables

### Backend (.env)

```bash
# Server
PORT=8080
GIN_MODE=debug
SES_FROM_EMAIL=noreply@manifimind.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=manifimind_crm
DB_SSL_MODE=disable

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRATION_HOURS=24

# AWS (optional - leave empty for dev mode)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Password Encryption (REQUIRED for password vault)
MASTER_PASSWORD=your-very-secure-master-password-change-this
```

### Password Vault Endpoints

All password endpoints require authentication. **Decryption happens client-side only.**

- `GET /api/v1/passwords` - List password entries (encrypted)
- `GET /api/v1/passwords/:id` - Get password entry (encrypted)
- `POST /api/v1/passwords` - Create new password entry (client encrypts before sending)
- `PUT /api/v1/passwords/:id` - Update password entry
- `DELETE /api/v1/passwords/:id` - Delete password entry
- `GET /api/v1/passwords/search?q=term` - Search password entries

**Note**: There is NO decrypt endpoint. The client retrieves encrypted passwords and decrypts them locally using JavaScript with the user-provided master password. The master password NEVER leaves the client.
```

## Development Guidelines

### Code Quality

- **Go**: Follow standard Go conventions, use `go fmt`, `go vet`, and `golangci-lint`
- **React**: Use ESLint and Prettier for code formatting
- **Git**: Use conventional commits (feat:, fix:, docs:, etc.)

### Testing

```bash
# Backend tests
cd backend
go test ./...

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Backend
cd backend
go build -o bin/server ./cmd/server

# Frontend
cd frontend
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Contact

Dave English - dave@manifimind.com

Project Link: https://github.com/davealexenglish/magnifimind-crm
