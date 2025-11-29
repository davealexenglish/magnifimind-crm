package handlers

import (
	"fmt"
	"net/http"

	"github.com/davealexenglish/magnifimind-crm/internal/database"
	"github.com/gin-gonic/gin"
)

// UserHandler handles user-related endpoints
type UserHandler struct {
	userRepo *database.UserRepository
}

// NewUserHandler creates a new user handler
func NewUserHandler(userRepo *database.UserRepository) *UserHandler {
	return &UserHandler{
		userRepo: userRepo,
	}
}

// ListUsers returns all users
func (h *UserHandler) ListUsers(c *gin.Context) {
	limit := 50
	offset := 0

	users, total, err := h.userRepo.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"total": total,
	})
}

// GetUser returns a single user by ID
func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")

	// Parse ID
	var userID int
	if _, err := fmt.Sscanf(id, "%d", &userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.userRepo.FindByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// SearchUsers searches for users
func (h *UserHandler) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	limit := 50
	offset := 0

	users, total, err := h.userRepo.Search(c.Request.Context(), query, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"total": total,
	})
}

// UpdateUser updates a user
func (h *UserHandler) UpdateUser(c *gin.Context) {
	// TODO: Implement update logic
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}

// DeleteUser deletes a user
func (h *UserHandler) DeleteUser(c *gin.Context) {
	// TODO: Implement delete logic
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}
