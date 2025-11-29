package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/davealexenglish/magnifimind-crm/internal/database"
	"github.com/davealexenglish/magnifimind-crm/internal/models"
	"github.com/davealexenglish/magnifimind-crm/internal/services"
	"github.com/davealexenglish/magnifimind-crm/pkg/config"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	userRepo     *database.UserRepository
	emailService *services.EmailService
	config       *config.Config
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(userRepo *database.UserRepository, emailService *services.EmailService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		userRepo:     userRepo,
		emailService: emailService,
		config:       cfg,
	}
}

// Register handles user registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// TODO: Create user in database
	// For now, return success
	c.JSON(http.StatusCreated, gin.H{
		"message":         "User registered successfully",
		"username":        req.Username,
		"hashed_password": string(hashedPassword),
	})
}

// Login handles user login
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user by username (account name)
	user, err := h.userRepo.FindByUsername(c.Request.Context(), req.Username)
	if err != nil || user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":      user.ID,
		"account_name": user.Name,
		"exp":          time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(h.config.JWT.Secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":           user.ID,
			"account_name": user.Name,
		},
	})
}

// Refresh handles token refresh
func (h *AuthHandler) Refresh(c *gin.Context) {
	// TODO: Implement refresh token logic
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}

// Logout handles user logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// For JWT, logout is typically handled client-side by removing the token
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
