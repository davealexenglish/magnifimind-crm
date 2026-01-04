package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/davealexenglish/magnifimind-crm/internal/database"
	"github.com/davealexenglish/magnifimind-crm/internal/middleware"
	"github.com/gin-gonic/gin"
)

// TableHandler handles generic table operations
type TableHandler struct {
	db *database.DB
}

// NewTableHandler creates a new TableHandler
func NewTableHandler(db *database.DB) *TableHandler {
	return &TableHandler{db: db}
}

// TableConfig defines configuration for a table
type TableConfig struct {
	TableName   string
	IDColumn    string
	Columns     []string
	OrderBy     string
	CreateUser  bool   // Whether to track create/modify user
	MultiTenant bool   // Whether to filter by sec_users_id
	UseView     bool   // Whether to use a view instead of base table
	ViewName    string // Name of the view if UseView is true
}

var tableConfigs = map[string]TableConfig{
	"people": {
		TableName:   "v_active_people",
		IDColumn:    "pdat_person_id",
		Columns:     []string{"pdat_person_id", "fname", "lname", "full_name", "birthday", "business_flag", "sec_users_id", "create_date", "create_user", "modify_date", "modify_user", "active_flag"},
		OrderBy:     "lname, fname",
		CreateUser:  true,
		MultiTenant: true,
		UseView:     true,
		ViewName:    "v_active_people",
	},
	"addresses": {
		TableName:   "v_person_addresses",
		IDColumn:    "pdat_address_id",
		Columns:     []string{"pdat_address_id", "addr1", "addr2", "city", "cmn_states_id", "zip", "zip_plus_4", "country", "pdat_person_id", "person_fname", "person_lname", "person_full_name", "sec_users_id", "create_date", "create_user", "modify_date", "modify_user", "active_flag"},
		OrderBy:     "person_lname, person_fname",
		CreateUser:  true,
		MultiTenant: true,
		UseView:     true,
		ViewName:    "v_person_addresses",
	},
	"emails": {
		TableName:   "v_person_emails",
		IDColumn:    "pdat_pers_emails_id",
		Columns:     []string{"pdat_pers_emails_id", "email_addr", "pdat_person_id", "pdat_email_types_id", "email_type_name", "person_fname", "person_lname", "person_full_name", "sec_users_id", "create_date", "create_user", "modify_date", "modify_user", "active_flag"},
		OrderBy:     "person_lname, person_fname",
		CreateUser:  true,
		MultiTenant: true,
		UseView:     true,
		ViewName:    "v_person_emails",
	},
	"phones": {
		TableName:   "v_person_phones",
		IDColumn:    "pdat_pers_phone_id",
		Columns:     []string{"pdat_pers_phone_id", "phone_num", "phone_ext", "country_code", "pdat_phone_type_id", "phone_type_name", "pdat_person_id", "person_fname", "person_lname", "person_full_name", "sec_users_id", "create_date", "create_user", "modify_date", "modify_user", "active_flag"},
		OrderBy:     "person_lname, person_fname",
		CreateUser:  true,
		MultiTenant: true,
		UseView:     true,
		ViewName:    "v_person_phones",
	},
	"notes": {
		TableName:   "v_person_notes",
		IDColumn:    "pdat_pers_notes_id",
		Columns:     []string{"pdat_pers_notes_id", "pdat_person_id", "note_text", "person_fname", "person_lname", "person_full_name", "sec_users_id", "create_date", "create_user", "modify_date", "modify_user", "active_flag"},
		OrderBy:     "create_date DESC",
		CreateUser:  true,
		MultiTenant: true,
		UseView:     true,
		ViewName:    "v_person_notes",
	},
	"links": {
		TableName:   "v_person_links",
		IDColumn:    "pdat_links_id",
		Columns:     []string{"pdat_links_id", "link_text", "link_url", "note", "pdat_person_id", "person_fname", "person_lname", "person_full_name", "sec_users_id", "create_date", "create_user", "modify_date", "modify_user", "active_flag"},
		OrderBy:     "person_lname, person_fname",
		CreateUser:  true,
		MultiTenant: true,
		UseView:     true,
		ViewName:    "v_person_links",
	},
	"accounts": {
		TableName:  "sec_accounts",
		IDColumn:   "sec_accounts_id",
		Columns:    []string{"sec_accounts_id", "name", "sec_users_id", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "name",
		CreateUser: true,
	},
	"users": {
		TableName:  "sec_users",
		IDColumn:   "sec_users_id",
		Columns:    []string{"sec_users_id", "fname", "lname", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "lname, fname",
		CreateUser: true,
	},
	"roles": {
		TableName:  "sec_roles",
		IDColumn:   "sec_roles_id",
		Columns:    []string{"sec_roles_id", "name", "descr", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "name",
		CreateUser: true,
	},
	"email-types": {
		TableName:   "pdat_email_types",
		IDColumn:    "pdat_email_types_id",
		Columns:     []string{"pdat_email_types_id", "name", "sec_users_id", "create_date", "create_user", "modify_date", "modify_user", "active_flag"},
		OrderBy:     "name",
		CreateUser:  true,
		MultiTenant: false, // Global reference data, not tenant-specific
	},
	"phone-types": {
		TableName:   "pdat_phone_type",
		IDColumn:    "pdat_phone_type_id",
		Columns:     []string{"pdat_phone_type_id", "name", "sec_users_id", "create_date", "create_user", "modify_date", "modify_user", "active_flag"},
		OrderBy:     "name",
		CreateUser:  true,
		MultiTenant: false, // Global reference data, not tenant-specific
	},
}

// writeableColumns defines which columns can be written for each table (excluding auto-generated columns)
var writeableColumns = map[string][]string{
	"emails":    {"email_addr", "pdat_person_id", "pdat_email_types_id"},
	"phones":    {"phone_num", "phone_ext", "country_code", "pdat_phone_type_id", "pdat_person_id"},
	"addresses": {"addr1", "addr2", "city", "cmn_states_id", "zip", "zip_plus_4", "country", "pdat_person_id"},
	"notes":     {"note_text", "pdat_person_id"},
	"links":     {"link_text", "link_url", "note", "pdat_person_id", "sec_users_id"},
}

// baseTableNames maps table keys to their base table names (for inserts/updates)
var baseTableNames = map[string]string{
	"emails":    "pdat_pers_emails",
	"phones":    "pdat_pers_phone",
	"addresses": "pdat_address",
	"notes":     "pdat_pers_notes",
	"links":     "pdat_links",
}

// ListRecords returns all records from a table
func (h *TableHandler) ListRecords(tableKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config, ok := tableConfigs[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
			return
		}

		// Determine which table to query (view vs base table for show_inactive)
		tableName := config.TableName
		showInactive := c.Query("show_inactive") == "true"

		// For people table, use base table when showing inactive
		if tableKey == "people" && showInactive {
			tableName = "pdat_person"
		}

		// Build WHERE clause starting with multi-tenant filtering
		var conditions []string
		var args []interface{}
		argNum := 1

		if config.MultiTenant {
			// Get user ID from JWT context
			userID, ok := middleware.GetUserID(c)
			if !ok {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
				return
			}
			conditions = append(conditions, fmt.Sprintf("sec_users_id = $%d", argNum))
			args = append(args, userID)
			argNum++
		}

		// Handle query parameters for filtering (for people table)
		if tableKey == "people" {
			// Combined name search (searches both fname and lname)
			name := c.Query("name")
			if name != "" {
				conditions = append(conditions, fmt.Sprintf("(fname ILIKE $%d OR lname ILIKE $%d)", argNum, argNum+1))
				args = append(args, "%"+name+"%", "%"+name+"%")
				argNum += 2
			}

			// Individual field searches (backward compatibility)
			fname := c.Query("fname")
			if fname != "" {
				conditions = append(conditions, fmt.Sprintf("fname ILIKE $%d", argNum))
				args = append(args, "%"+fname+"%")
				argNum++
			}

			lname := c.Query("lname")
			if lname != "" {
				conditions = append(conditions, fmt.Sprintf("lname ILIKE $%d", argNum))
				args = append(args, "%"+lname+"%")
				argNum++
			}

			businessFlag := c.Query("business_flag")
			if businessFlag == "true" {
				conditions = append(conditions, "business_flag = 'Y'")
			}
		}

		// Build final query
		// For base table queries, we need to add full_name computed column
		var selectClause string
		if tableKey == "people" && showInactive {
			selectClause = "*, fname || ' ' || lname AS full_name"
		} else {
			selectClause = "*"
		}

		var query string
		if len(conditions) > 0 {
			whereClause := "WHERE " + conditions[0]
			for i := 1; i < len(conditions); i++ {
				whereClause += " AND " + conditions[i]
			}
			query = fmt.Sprintf("SELECT %s FROM %s %s ORDER BY %s", selectClause, tableName, whereClause, config.OrderBy)
		} else {
			query = fmt.Sprintf("SELECT %s FROM %s ORDER BY %s", selectClause, tableName, config.OrderBy)
		}

		fmt.Printf("[DEBUG] TableHandler ListRecords query: %s\n", query)
		fmt.Printf("[DEBUG] TableHandler ListRecords args: %v\n", args)

		// Execute query
		var rows *sql.Rows
		var err error
		rows, err = h.db.Query(query, args...)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		// Get column names
		columns, err := rows.Columns()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var records []map[string]interface{}
		for rows.Next() {
			// Create slice of interface{} to hold each column value
			values := make([]interface{}, len(columns))
			valuePtrs := make([]interface{}, len(columns))
			for i := range values {
				valuePtrs[i] = &values[i]
			}

			if err := rows.Scan(valuePtrs...); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			// Create map for this row
			record := make(map[string]interface{})
			for i, col := range columns {
				record[col] = values[i]
			}
			records = append(records, record)
		}

		if records == nil {
			records = []map[string]interface{}{}
		}
		c.JSON(http.StatusOK, records)
	}
}

// GetRecord returns a single record
func (h *TableHandler) GetRecord(tableKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config, ok := tableConfigs[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
			return
		}

		id := c.Param("id")

		// Build query with multi-tenant filtering if enabled
		var query string
		var err error
		var rows *sql.Rows

		if config.MultiTenant {
			// Get user ID from JWT context
			userID, ok := middleware.GetUserID(c)
			if !ok {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
				return
			}

			query = fmt.Sprintf("SELECT * FROM %s WHERE %s = $1 AND sec_users_id = $2", config.TableName, config.IDColumn)
			rows, err = h.db.Query(query, id, userID)
		} else {
			query = fmt.Sprintf("SELECT * FROM %s WHERE %s = $1", config.TableName, config.IDColumn)
			rows, err = h.db.Query(query, id)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		if !rows.Next() {
			c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
			return
		}

		// Get column names
		columns, err := rows.Columns()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Create slice of interface{} to hold each column value
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Create map for this row
		record := make(map[string]interface{})
		for i, col := range columns {
			record[col] = values[i]
		}

		c.JSON(http.StatusOK, record)
	}
}

// DeleteRecord deletes a record
func (h *TableHandler) DeleteRecord(tableKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config, ok := tableConfigs[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
			return
		}

		id := c.Param("id")

		// Build query with multi-tenant filtering if enabled
		var query string
		var err error

		// For views, delete from the underlying base table
		tableName := config.TableName
		if config.UseView {
			// Map view names to base table names for deletes
			switch config.ViewName {
			case "v_active_people":
				tableName = "pdat_person"
			case "v_person_addresses":
				tableName = "pdat_address"
			case "v_person_emails":
				tableName = "pdat_pers_emails"
			case "v_person_phones":
				tableName = "pdat_pers_phone"
			case "v_person_notes":
				tableName = "pdat_pers_notes"
			case "v_person_links":
				tableName = "pdat_links"
			}
		}

		var result sql.Result
		if config.MultiTenant {
			// Get user ID from JWT context
			userID, ok := middleware.GetUserID(c)
			if !ok {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
				return
			}

			// Multi-tenant delete - ensure user owns the record via JOIN
			if config.UseView {
				// For related tables, join to pdat_person to verify ownership
				query = fmt.Sprintf(`DELETE FROM %s
					WHERE %s = $1
					AND pdat_person_id IN (SELECT pdat_person_id FROM pdat_person WHERE sec_users_id = $2)`,
					tableName, config.IDColumn)
			} else {
				// For direct tables, check sec_users_id directly
				query = fmt.Sprintf("DELETE FROM %s WHERE %s = $1 AND sec_users_id = $2", tableName, config.IDColumn)
			}
			result, err = h.db.Exec(query, id, userID)
		} else {
			query = fmt.Sprintf("DELETE FROM %s WHERE %s = $1", tableName, config.IDColumn)
			result, err = h.db.Exec(query, id)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Record deleted successfully"})
	}
}

// GetPersonFull returns a person with all related data (emails, phones, addresses, links, notes)
func (h *TableHandler) GetPersonFull(c *gin.Context) {
	id := c.Param("id")
	showInactive := c.Query("show_inactive") == "true"

	// Get user ID from JWT context for multi-tenant filtering
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	// Fetch person
	var personQuery string
	if showInactive {
		personQuery = `SELECT pdat_person_id, fname, lname, fname || ' ' || lname AS full_name,
			birthday, business_flag, sec_users_id, create_date, create_user, modify_date, modify_user, active_flag
			FROM pdat_person WHERE pdat_person_id = $1 AND sec_users_id = $2`
	} else {
		personQuery = `SELECT pdat_person_id, fname, lname, full_name,
			birthday, business_flag, sec_users_id, create_date, create_user, modify_date, modify_user, active_flag
			FROM v_active_people WHERE pdat_person_id = $1 AND sec_users_id = $2`
	}

	personRow := h.db.QueryRow(personQuery, id, userID)
	person := make(map[string]interface{})

	var pdatPersonID int
	var fname, lname, fullName sql.NullString
	var birthday sql.NullTime
	var businessFlag, activeFlag string
	var secUsersID int
	var createDate, modifyDate sql.NullTime
	var createUser, modifyUser sql.NullString

	err := personRow.Scan(&pdatPersonID, &fname, &lname, &fullName, &birthday, &businessFlag,
		&secUsersID, &createDate, &createUser, &modifyDate, &modifyUser, &activeFlag)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	person["pdat_person_id"] = pdatPersonID
	person["fname"] = fname.String
	person["lname"] = lname.String
	person["full_name"] = fullName.String
	if birthday.Valid {
		person["birthday"] = birthday.Time
	}
	person["business_flag"] = businessFlag
	person["active_flag"] = activeFlag

	// Helper function to fetch related records
	fetchRelated := func(query string, args ...interface{}) ([]map[string]interface{}, error) {
		rows, err := h.db.Query(query, args...)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		columns, err := rows.Columns()
		if err != nil {
			return nil, err
		}

		var records []map[string]interface{}
		for rows.Next() {
			values := make([]interface{}, len(columns))
			valuePtrs := make([]interface{}, len(columns))
			for i := range values {
				valuePtrs[i] = &values[i]
			}
			if err := rows.Scan(valuePtrs...); err != nil {
				return nil, err
			}
			record := make(map[string]interface{})
			for i, col := range columns {
				// Convert []byte to string (PostgreSQL char(1) comes as []byte)
				if b, ok := values[i].([]byte); ok {
					record[col] = string(b)
				} else {
					record[col] = values[i]
				}
			}
			records = append(records, record)
		}
		if records == nil {
			records = []map[string]interface{}{}
		}
		return records, nil
	}

	// Fetch emails
	var emailQuery string
	if showInactive {
		emailQuery = `SELECT pe.pdat_pers_emails_id, pe.email_addr, pe.pdat_person_id, pe.pdat_email_types_id,
			et.name AS email_type_name, pe.create_date, pe.create_user, pe.modify_date, pe.modify_user, pe.active_flag
			FROM pdat_pers_emails pe
			JOIN pdat_email_types et ON pe.pdat_email_types_id = et.pdat_email_types_id
			WHERE pe.pdat_person_id = $1 ORDER BY pe.email_addr`
	} else {
		emailQuery = `SELECT pdat_pers_emails_id, email_addr, pdat_person_id, pdat_email_types_id,
			email_type_name, create_date, create_user, modify_date, modify_user, active_flag
			FROM v_person_emails WHERE pdat_person_id = $1 ORDER BY email_addr`
	}
	emails, err := fetchRelated(emailQuery, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch emails: " + err.Error()})
		return
	}

	// Fetch phones
	var phoneQuery string
	if showInactive {
		phoneQuery = `SELECT pp.pdat_pers_phone_id, pp.phone_num, pp.phone_ext, pp.country_code,
			pp.pdat_phone_type_id, pt.name AS phone_type_name, pp.pdat_person_id,
			pp.create_date, pp.create_user, pp.modify_date, pp.modify_user, pp.active_flag
			FROM pdat_pers_phone pp
			JOIN pdat_phone_type pt ON pp.pdat_phone_type_id = pt.pdat_phone_type_id
			WHERE pp.pdat_person_id = $1 ORDER BY pp.phone_num`
	} else {
		phoneQuery = `SELECT pdat_pers_phone_id, phone_num, phone_ext, country_code,
			pdat_phone_type_id, phone_type_name, pdat_person_id,
			create_date, create_user, modify_date, modify_user, active_flag
			FROM v_person_phones WHERE pdat_person_id = $1 ORDER BY phone_num`
	}
	phones, err := fetchRelated(phoneQuery, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch phones: " + err.Error()})
		return
	}

	// Fetch addresses
	var addressQuery string
	if showInactive {
		addressQuery = `SELECT pa.pdat_address_id, pa.addr1, pa.addr2, pa.city, pa.cmn_states_id,
			s.abbrev AS state, s.name AS state_name, pa.zip, pa.zip_plus_4, pa.country, pa.pdat_person_id,
			pa.create_date, pa.create_user, pa.modify_date, pa.modify_user, pa.active_flag
			FROM pdat_address pa
			LEFT JOIN cmn_states s ON pa.cmn_states_id = s.cmn_states_id
			WHERE pa.pdat_person_id = $1 ORDER BY pa.addr1`
	} else {
		addressQuery = `SELECT pdat_address_id, addr1, addr2, city, cmn_states_id,
			state, state_name, zip, zip_plus_4, country, pdat_person_id,
			create_date, create_user, modify_date, modify_user, active_flag
			FROM v_person_addresses WHERE pdat_person_id = $1 ORDER BY addr1`
	}
	addresses, err := fetchRelated(addressQuery, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch addresses: " + err.Error()})
		return
	}

	// Fetch links
	var linkQuery string
	if showInactive {
		linkQuery = `SELECT pdat_links_id, link_text, link_url, note, pdat_person_id, sec_users_id,
			create_date, create_user, modify_date, modify_user, active_flag
			FROM pdat_links WHERE pdat_person_id = $1 ORDER BY link_text`
	} else {
		linkQuery = `SELECT pdat_links_id, link_text, link_url, note, pdat_person_id, sec_users_id,
			create_date, create_user, modify_date, modify_user, active_flag
			FROM v_person_links WHERE pdat_person_id = $1 ORDER BY link_text`
	}
	links, err := fetchRelated(linkQuery, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch links: " + err.Error()})
		return
	}

	// Fetch notes
	var noteQuery string
	if showInactive {
		noteQuery = `SELECT pdat_pers_notes_id, note_text, pdat_person_id,
			create_date, create_user, modify_date, modify_user, active_flag
			FROM pdat_pers_notes WHERE pdat_person_id = $1 ORDER BY create_date DESC`
	} else {
		noteQuery = `SELECT pdat_pers_notes_id, note_text, pdat_person_id,
			create_date, create_user, modify_date, modify_user, active_flag
			FROM v_person_notes WHERE pdat_person_id = $1 ORDER BY create_date DESC`
	}
	notes, err := fetchRelated(noteQuery, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch notes: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"person":    person,
		"emails":    emails,
		"phones":    phones,
		"addresses": addresses,
		"links":     links,
		"notes":     notes,
	})
}

// CreateRecord creates a new record in the specified table
func (h *TableHandler) CreateRecord(tableKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config, ok := tableConfigs[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
			return
		}

		columns, ok := writeableColumns[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "table does not support create"})
			return
		}

		baseTable, ok := baseTableNames[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "base table not found"})
			return
		}

		// Get user info from JWT context
		userID, ok := middleware.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
			return
		}
		username, _ := middleware.GetUsername(c)

		// Parse request body
		var data map[string]interface{}
		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}

		// Verify person ownership for related tables
		if personID, exists := data["pdat_person_id"]; exists {
			var ownerID int
			err := h.db.QueryRow("SELECT sec_users_id FROM pdat_person WHERE pdat_person_id = $1", personID).Scan(&ownerID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
				return
			}
			if ownerID != userID {
				c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
				return
			}
		}

		// Build INSERT query
		now := time.Now()
		allColumns := append(columns, "create_date", "create_user", "modify_date", "modify_user", "active_flag")

		// For links table, set sec_users_id from JWT
		if tableKey == "links" {
			data["sec_users_id"] = userID
		}

		var placeholders []string
		var values []interface{}
		for i, col := range allColumns {
			placeholders = append(placeholders, fmt.Sprintf("$%d", i+1))
			switch col {
			case "create_date", "modify_date":
				values = append(values, now)
			case "create_user", "modify_user":
				values = append(values, username)
			case "active_flag":
				values = append(values, "Y")
			default:
				values = append(values, data[col])
			}
		}

		query := fmt.Sprintf(
			"INSERT INTO %s (%s) VALUES (%s) RETURNING %s",
			baseTable,
			strings.Join(allColumns, ", "),
			strings.Join(placeholders, ", "),
			config.IDColumn,
		)

		var newID int
		err := h.db.QueryRow(query, values...).Scan(&newID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"id": newID, "message": "Record created successfully"})
	}
}

// UpdateRecord updates an existing record in the specified table
func (h *TableHandler) UpdateRecord(tableKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config, ok := tableConfigs[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
			return
		}

		columns, ok := writeableColumns[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "table does not support update"})
			return
		}

		baseTable, ok := baseTableNames[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "base table not found"})
			return
		}

		id := c.Param("id")

		// Get user info from JWT context
		userID, ok := middleware.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
			return
		}
		username, _ := middleware.GetUsername(c)

		// Parse request body
		var data map[string]interface{}
		if err := c.ShouldBindJSON(&data); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}

		// Verify ownership by checking the person this record belongs to
		var ownerQuery string
		if tableKey == "links" {
			ownerQuery = fmt.Sprintf("SELECT sec_users_id FROM %s WHERE %s = $1", baseTable, config.IDColumn)
		} else {
			ownerQuery = fmt.Sprintf(`
				SELECT p.sec_users_id FROM %s t
				JOIN pdat_person p ON t.pdat_person_id = p.pdat_person_id
				WHERE t.%s = $1`, baseTable, config.IDColumn)
		}

		var ownerID int
		err := h.db.QueryRow(ownerQuery, id).Scan(&ownerID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "record not found"})
			return
		}
		if ownerID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}

		// Build UPDATE query - only update columns that are provided
		now := time.Now()
		var setClauses []string
		var values []interface{}
		argNum := 1

		for _, col := range columns {
			if val, exists := data[col]; exists {
				setClauses = append(setClauses, fmt.Sprintf("%s = $%d", col, argNum))
				values = append(values, val)
				argNum++
			}
		}

		// Always update modify_date and modify_user
		setClauses = append(setClauses, fmt.Sprintf("modify_date = $%d", argNum))
		values = append(values, now)
		argNum++

		setClauses = append(setClauses, fmt.Sprintf("modify_user = $%d", argNum))
		values = append(values, username)
		argNum++

		// Add ID for WHERE clause
		values = append(values, id)

		query := fmt.Sprintf(
			"UPDATE %s SET %s WHERE %s = $%d",
			baseTable,
			strings.Join(setClauses, ", "),
			config.IDColumn,
			argNum,
		)

		result, err := h.db.Exec(query, values...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "record not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Record updated successfully"})
	}
}
