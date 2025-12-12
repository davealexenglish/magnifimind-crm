package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/davealexenglish/magnifimind-crm/pkg/config"
	"github.com/gin-gonic/gin"
)

// AdminHandler handles administrative operations like backup and restore
type AdminHandler struct {
	cfg *config.Config
}

// NewAdminHandler creates a new AdminHandler
func NewAdminHandler(cfg *config.Config) *AdminHandler {
	return &AdminHandler{cfg: cfg}
}

// Backup creates a binary backup of the PostgreSQL database and streams it to the client
func (h *AdminHandler) Backup(c *gin.Context) {
	// Generate filename with timestamp
	timestamp := time.Now().Format("2006-01-02_150405")
	filename := fmt.Sprintf("magnifimind_backup_%s.dump", timestamp)

	// Set headers for file download
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Header("Cache-Control", "no-cache")

	// Build pg_dump command
	// Using custom format (-Fc) for binary backup that can be restored with pg_restore
	cmd := exec.Command("pg_dump",
		"-h", h.cfg.Database.Host,
		"-p", h.cfg.Database.Port,
		"-U", h.cfg.Database.User,
		"-d", h.cfg.Database.Database,
		"-Fc", // Custom format (binary, compressed)
	)

	// Set PGPASSWORD environment variable
	cmd.Env = append(os.Environ(), fmt.Sprintf("PGPASSWORD=%s", h.cfg.Database.Password))

	// Get stdout pipe
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create backup pipe: " + err.Error()})
		return
	}

	// Get stderr pipe for error messages
	stderr, err := cmd.StderrPipe()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create error pipe: " + err.Error()})
		return
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start backup: " + err.Error()})
		return
	}

	// Stream the output to the response
	_, copyErr := io.Copy(c.Writer, stdout)

	// Read any error output
	errOutput, _ := io.ReadAll(stderr)

	// Wait for the command to complete
	if err := cmd.Wait(); err != nil {
		errMsg := string(errOutput)
		if errMsg == "" {
			errMsg = err.Error()
		}
		// Note: We can't send JSON error here since we already started streaming
		// The download will just be incomplete/corrupted
		fmt.Printf("Backup error: %s\n", errMsg)
		return
	}

	if copyErr != nil {
		fmt.Printf("Error streaming backup: %v\n", copyErr)
	}
}

// Restore restores the database from an uploaded backup file
func (h *AdminHandler) Restore(c *gin.Context) {
	// Get the uploaded file
	file, header, err := c.Request.FormFile("backup")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No backup file provided: " + err.Error()})
		return
	}
	defer file.Close()

	// Create a temporary file to store the upload
	tempDir := os.TempDir()
	tempFile := filepath.Join(tempDir, fmt.Sprintf("restore_%d_%s", time.Now().UnixNano(), header.Filename))

	out, err := os.Create(tempFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp file: " + err.Error()})
		return
	}

	// Copy uploaded file to temp file
	_, err = io.Copy(out, file)
	out.Close()
	if err != nil {
		os.Remove(tempFile)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file: " + err.Error()})
		return
	}

	// Ensure temp file is removed after we're done
	defer os.Remove(tempFile)

	// Build pg_restore command
	// Using --clean to drop existing objects before restoring
	// Using --if-exists to prevent errors if objects don't exist
	cmd := exec.Command("pg_restore",
		"-h", h.cfg.Database.Host,
		"-p", h.cfg.Database.Port,
		"-U", h.cfg.Database.User,
		"-d", h.cfg.Database.Database,
		"--clean",     // Drop existing objects before restoring
		"--if-exists", // Don't error if objects don't exist when dropping
		"--no-owner",  // Don't set ownership
		"--no-acl",    // Don't restore access privileges
		tempFile,
	)

	// Set PGPASSWORD environment variable
	cmd.Env = append(os.Environ(), fmt.Sprintf("PGPASSWORD=%s", h.cfg.Database.Password))

	// Capture output
	output, err := cmd.CombinedOutput()
	if err != nil {
		// pg_restore often returns non-zero exit codes for warnings
		// Check if the output contains actual errors vs just warnings
		outputStr := string(output)
		// Common warning patterns that aren't fatal
		if len(outputStr) > 0 {
			fmt.Printf("pg_restore output: %s\n", outputStr)
		}
		// For now, we'll consider it a failure if exit code is non-zero
		// but include the output in the response for debugging
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":  "Restore completed with warnings or errors",
			"detail": outputStr,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Database restored successfully from " + header.Filename,
	})
}
