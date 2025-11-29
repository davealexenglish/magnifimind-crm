package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/davealexenglish/magnifimind-crm/internal/database"
	"github.com/davealexenglish/magnifimind-crm/internal/handlers"
	"github.com/davealexenglish/magnifimind-crm/internal/middleware"
	"github.com/davealexenglish/magnifimind-crm/internal/services"
	"github.com/davealexenglish/magnifimind-crm/pkg/config"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Set Gin mode
	gin.SetMode(cfg.Server.GinMode)

	// Initialize database
	db, err := database.NewDB(cfg.GetDSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Database connection established")

	// Initialize repositories
	userRepo := database.NewUserRepository(db)
	personRepo := database.NewPersonRepository(db)

	// Initialize email service
	devMode := !cfg.HasAWSCredentials()
	emailService := services.NewEmailService(
		devMode,
		cfg.AWS.Region,
		cfg.AWS.AccessKeyID,
		cfg.AWS.SecretAccessKey,
		cfg.Server.SESFromEmail,
	)

	if devMode {
		log.Println("Email service initialized (development mode - no AWS credentials)")
	} else {
		log.Println("Email service initialized (production mode - using AWS SES)")
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, emailService, cfg)
	userHandler := handlers.NewUserHandler(userRepo)
	personHandler := handlers.NewPersonHandler(personRepo)

	// Initialize router
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "manifimind-crm-backend",
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		v1.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "Manifimind CRM API v1",
				"version": "1.0.0",
			})
		})

		// Auth routes (public)
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/refresh", authHandler.Refresh)
			authRoutes.POST("/logout", authHandler.Logout)
		}

		// User routes
		userRoutes := v1.Group("/users")
		{
			// Public routes
			userRoutes.GET("", userHandler.ListUsers)
			userRoutes.GET("/:id", userHandler.GetUser)
			userRoutes.GET("/search", userHandler.SearchUsers)

			// Protected routes
			protected := userRoutes.Group("")
			protected.Use(middleware.AuthMiddleware(cfg.JWT.Secret))
			{
				protected.PUT("/:id", userHandler.UpdateUser)
				protected.DELETE("/:id", userHandler.DeleteUser)
			}
		}

		// Person routes
		personRoutes := v1.Group("/persons")
		personRoutes.Use(middleware.AuthMiddleware(cfg.JWT.Secret))
		{
			personRoutes.GET("", personHandler.ListPersons)
			personRoutes.GET("/:id", personHandler.GetPerson)
			personRoutes.POST("", personHandler.CreatePerson)
			personRoutes.PUT("/:id", personHandler.UpdatePerson)
			personRoutes.DELETE("/:id", personHandler.DeletePerson)
			personRoutes.GET("/search", personHandler.SearchPersons)
		}

		// TODO: Add more CRUD routes for other tables:
		// - Addresses (pdat_address)
		// - Emails (pdat_pers_emails)
		// - Phones (pdat_pers_phone)
		// - Calendar (pdat_calendar)
		// - Links (pdat_links)
		// - Passwords (pdat_passwd)
		// - Roles (sec_roles)
		// - Privileges (sec_privileges)
		// etc.
	}

	// Create HTTP server with timeouts
	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting Manifimind CRM backend server on port %s", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown HTTP server gracefully
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	// Close database connection
	db.Close()
	log.Println("Database connection closed")

	log.Println("Server exited gracefully")
}
