package handlers

import (
	"fmt"
	"net/http"

	"github.com/davealexenglish/magnifimind-crm/internal/database"
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
	TableName  string
	IDColumn   string
	Columns    []string
	OrderBy    string
	CreateUser bool // Whether to track create/modify user
}

var tableConfigs = map[string]TableConfig{
	"people": {
		TableName:  "pdat_person",
		IDColumn:   "pdat_person_id",
		Columns:    []string{"pdat_person_id", "first_name", "middle_name", "last_name", "suffix", "nickname", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "last_name, first_name",
		CreateUser: true,
	},
	"addresses": {
		TableName:  "pdat_address",
		IDColumn:   "pdat_address_id",
		Columns:    []string{"pdat_address_id", "addr_1", "addr_2", "city", "state", "zip", "country", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "pdat_address_id",
		CreateUser: true,
	},
	"emails": {
		TableName:  "pdat_pers_email",
		IDColumn:   "pdat_pers_email_id",
		Columns:    []string{"pdat_pers_email_id", "pdat_person_id", "pdat_email_type_id", "email", "primary_email_flag", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "pdat_pers_email_id",
		CreateUser: true,
	},
	"phones": {
		TableName:  "pdat_pers_phone",
		IDColumn:   "pdat_pers_phone_id",
		Columns:    []string{"pdat_pers_phone_id", "pdat_person_id", "pdat_phone_type_id", "phone_number", "primary_phone_flag", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "pdat_pers_phone_id",
		CreateUser: true,
	},
	"notes": {
		TableName:  "pdat_pers_notes",
		IDColumn:   "pdat_pers_notes_id",
		Columns:    []string{"pdat_pers_notes_id", "pdat_person_id", "note_text", "note_date", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "note_date DESC",
		CreateUser: true,
	},
	"links": {
		TableName:  "pdat_links",
		IDColumn:   "pdat_links_id",
		Columns:    []string{"pdat_links_id", "link_text", "link_url", "note", "pdat_person_id", "create_date", "create_user", "modify_date", "modify_user"},
		OrderBy:    "pdat_links_id",
		CreateUser: true,
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
}

// ListRecords returns all records from a table
func (h *TableHandler) ListRecords(tableKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		config, ok := tableConfigs[tableKey]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown table"})
			return
		}

		query := fmt.Sprintf("SELECT * FROM %s ORDER BY %s", config.TableName, config.OrderBy)
		rows, err := h.db.Query(query)
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
		query := fmt.Sprintf("SELECT * FROM %s WHERE %s = $1", config.TableName, config.IDColumn)

		rows, err := h.db.Query(query, id)
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
		query := fmt.Sprintf("DELETE FROM %s WHERE %s = $1", config.TableName, config.IDColumn)

		result, err := h.db.Exec(query, id)
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
