# Session State - December 3, 2025

## Current Status

### Kubernetes Deployment - **FAILED**
The helm install of magnifimind-crm failed due to Docker registry connectivity issues:
- Registry at `t5810.webcentricds.net` is not responding (connection refused on port 80)
- Pods stuck in `ImagePullBackOff` state
- Helm install timed out waiting for conditions

**Action Required**: Start Docker registry service on t5810 server, then reinstall:
```bash
export KUBECONFIG=$HOME/.kube/config-t5810
helm uninstall magnifimind-crm -n magnifimind-crm  # Clean up failed install
# Start registry on t5810 first!
helm install magnifimind-crm /Users/denglish/gitDevelopment/github/davealexenglish/magnifimind-crm/helm/magnifimind-crm -n magnifimind-crm
```

### Latest Deployed Frontend Version
**v0.1.27** - Successfully built and pushed to registry before it went down
- Optimized password save (uses API response instead of full reload)
- Master password autofill prevention improvements
- Two-column form layout with reduced padding
- Instructions left-aligned in PasswordVault

### Git Status - Uncommitted Changes
```
Staged for commit:
  A  backend/internal/database/password_repository.go
  A  backend/internal/handlers/password_handler.go
  AM src/components/PasswordVault.tsx
  AM src/components/PersonPicker.tsx

Modified but not staged:
  M backend/internal/database/person_repository.go
  M backend/internal/handlers/person_handler.go
  M backend/internal/handlers/table_handler.go
  M src/components/TableManager.tsx
  M src/components/tables.tsx
  M src/types/index.ts
  M helm/magnifimind-crm/values.yaml

Untracked:
  ?? CLAUDE.md  (NEW - guidance document for future Claude sessions)
```

## Recent Work Summary

### Password Vault Fixes (v0.1.22 - v0.1.27)
1. ✅ Fixed save functionality - temporary ID assignment in PasswordCollection.add()
2. ✅ Optimized save - uses API response instead of reloading all passwords
3. ✅ Master password autofill prevention (autoComplete="new-password")
4. ✅ Instructions left-aligned
5. ✅ Lock button properly disabled for new entries

### Form Layout Changes (v0.1.23)
- Converted all TableManager forms to two-column table layout
- Labels on left (right-aligned), inputs on right
- Dense spacing (padding: 0.35rem)

### Pagination Fix (v0.1.24)
- Added useEffect to reset page when itemsPerPage changes
- Prevents stale page numbers when changing per-page dropdown

### PersonPicker Improvements (v0.1.20 - v0.1.21)
- Removed window.confirm dialogs (use ConfirmationModal instead)
- Display full name (fname + ' ' + lname) instead of person ID
- Database-level filtering for searches

## Key Architecture Notes

### Password Vault Client-Side Encryption
- Master password NEVER sent to server
- AES-256-CBC encryption happens in browser
- State machine tracks: ENCRYPTED → DECRYPTED → MODIFIED_DECRYPTED → NEW
- Temporary IDs for new entries (replaced with DB ID after save)
- `passwordStateManager.js` manages state transitions

### Multi-Tenant Data Model
- All `pdat_*` tables filtered by `sec_users_id`
- Views (`v_active_people`, `v_person_addresses`) enforce security + active_flag
- Read from views, write to base tables
- TableHandler automatically applies user filtering when `MultiTenant: true`

### Generic TableManager Pattern
- Single React component handles all CRUD tables
- Column configuration drives behavior (type, lookups, readOnly, showInTable)
- PersonPicker integration via `type: 'person-picker'`
- Two-column form layout standard

## Background Processes (will be terminated)
- Port-forward to backend (bash 331a91)
- Helm upgrade attempts (bash 98a7c1, 7d8143)
- These are orphaned processes that can be killed

## Next Session Priorities
1. **Fix Docker registry** on t5810 (prerequisite for everything)
2. **Reinstall Kubernetes deployment** after registry is up
3. **Consider committing changes** or at least staging CLAUDE.md
4. **Test Password Vault** end-to-end after deployment is working
