package handlers

import (
	"database/sql"
	"fmt"
	"net/http"

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
		Columns:    []string{"sec_users_id", "pdat_person_id", "email", "email_verified", "active_flag", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "sec_users_id",
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

// ListRecords returns all records from a table
func (h *TableHandler) ListRecords(tableKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config, ok := tableConfigs[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
			return
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
				conditions = append(conditions, "business_flag = true")
			}
		}

		// Build final query
		var query string
		if len(conditions) > 0 {
			whereClause := "WHERE " + conditions[0]
			for i := 1; i < len(conditions); i++ {
				whereClause += " AND " + conditions[i]
			}
			query = fmt.Sprintf("SELECT * FROM %s %s ORDER BY %s", config.TableName, whereClause, config.OrderBy)
		} else {
			query = fmt.Sprintf("SELECT * FROM %s ORDER BY %s", config.TableName, config.OrderBy)
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
