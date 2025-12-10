package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/davealexenglish/magnifimind-crm/internal/database"
	"github.com/davealexenglish/magnifimind-crm/internal/middleware"
	"github.com/davealexenglish/magnifimind-crm/internal/models"
	"github.com/davealexenglish/magnifimind-crm/pkg/utils"
	"github.com/gin-gonic/gin"
)

// PasswordHandler handles password vault requests
type PasswordHandler struct {
	passwordRepo *database.PasswordRepository
}

// NewPasswordHandler creates a new PasswordHandler
func NewPasswordHandler(passwordRepo *database.PasswordRepository) *PasswordHandler {
	return &PasswordHandler{
		passwordRepo: passwordRepo,
	}
}

// CreatePasswordRequest represents a request to create a password entry
type CreatePasswordRequest struct {
	Description  *string `json:"description"`
	Name         *string `json:"name"`
	Password     string  `json:"password" binding:"required"` // Already encrypted on client-side
	OptionalLink *int    `json:"optionalLink"`
	LinkUrl      *string `json:"linkUrl"`
}

// UpdatePasswordRequest represents a request to update a password entry
type UpdatePasswordRequest struct {
	Description  *string `json:"description"`
	Name         *string `json:"name"`
	Password     *string `json:"password"` // Already encrypted on client-side
	OptionalLink *int    `json:"optionalLink"`
	LinkUrl      *string `json:"linkUrl"`
}

// IMPORTANT: ALL encryption and decryption happens on the client-side ONLY.
// The master password NEVER leaves the client.
// The server only stores and retrieves already-encrypted passwords.

// ListPasswords lists all password entries for the authenticated user
func (h *PasswordHandler) ListPasswords(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	passwords, total, err := h.passwordRepo.List(c.Request.Context(), userID, limit, offset)
	if err != nil {
		log.Printf("Failed to list passwords: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch passwords"})
		return
	}

	// Return passwords without decrypting them
	// Client will request decryption individually with master password
	c.JSON(http.StatusOK, gin.H{
		"passwords": passwords,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	})
}

// GetPassword gets a password entry by ID (encrypted)
func (h *PasswordHandler) GetPassword(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	id, err := utils.ParseInt(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid password ID"})
		return
	}

	password, err := h.passwordRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		log.Printf("Failed to get password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if password == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "password not found"})
		return
	}

	// Verify the password belongs to the authenticated user
	if password.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, password)
}

// NOTE: There is no decrypt endpoint. Decryption happens entirely on the client side.
// The client retrieves the encrypted password via GET /passwords/:id, then decrypts
// it locally using JavaScript with the user-provided master password.
// This ensures the master password NEVER leaves the client and is never sent over the network.

// CreatePassword creates a new password entry
func (h *PasswordHandler) CreatePassword(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	username, _ := middleware.GetUsername(c)

	var req CreatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Store the already-encrypted password from client (no server-side encryption)
	password := &models.PdatPasswd{
		Descr:      req.Description,
		Name:       req.Name,
		Passwd:     &req.Password, // Already encrypted by client
		OptLinkID:  req.OptionalLink,
		LinkUrl:    req.LinkUrl,
		UserID:     userID,
		CreateUser: username,
		ModifyUser: username,
		ActiveFlag: "Y",
	}

	if err := h.passwordRepo.Create(c.Request.Context(), password); err != nil {
		log.Printf("Failed to create password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create password"})
		return
	}

	c.JSON(http.StatusCreated, password)
}

// UpdatePassword updates a password entry
func (h *PasswordHandler) UpdatePassword(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	username, _ := middleware.GetUsername(c)

	id, err := utils.ParseInt(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid password ID"})
		return
	}

	var req UpdatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing password
	password, err := h.passwordRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		log.Printf("Failed to get password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if password == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "password not found"})
		return
	}

	// Verify ownership
	if password.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Update fields
	if req.Description != nil {
		password.Descr = req.Description
	}
	if req.Name != nil {
		password.Name = req.Name
	}
	if req.OptionalLink != nil {
		password.OptLinkID = req.OptionalLink
	}
	// LinkUrl can be set to empty string to clear it
	if req.LinkUrl != nil {
		password.LinkUrl = req.LinkUrl
	}

	// If password is provided, store it (already encrypted by client)
	if req.Password != nil && *req.Password != "" {
		password.Passwd = req.Password
	}

	password.ModifyUser = username

	if err := h.passwordRepo.Update(c.Request.Context(), password); err != nil {
		log.Printf("Failed to update password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update password"})
		return
	}

	c.JSON(http.StatusOK, password)
}

// DeletePassword deletes a password entry
func (h *PasswordHandler) DeletePassword(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	id, err := utils.ParseInt(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid password ID"})
		return
	}

	// Verify ownership before deleting
	password, err := h.passwordRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		log.Printf("Failed to get password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if password == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "password not found"})
		return
	}

	if password.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if err := h.passwordRepo.Delete(c.Request.Context(), id); err != nil {
		log.Printf("Failed to delete password: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password deleted successfully"})
}

// SearchPasswords searches for password entries
func (h *PasswordHandler) SearchPasswords(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	searchTerm := c.Query("q")
	if searchTerm == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search term required"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	passwords, total, err := h.passwordRepo.Search(c.Request.Context(), userID, searchTerm, limit, offset)
	if err != nil {
		log.Printf("Failed to search passwords: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to search passwords"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"passwords": passwords,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	})
}
