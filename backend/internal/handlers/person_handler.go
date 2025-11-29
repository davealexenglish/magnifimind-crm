package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/davealexenglish/magnifimind-crm/internal/database"
	"github.com/davealexenglish/magnifimind-crm/internal/middleware"
	"github.com/davealexenglish/magnifimind-crm/internal/models"
	"github.com/davealexenglish/magnifimind-crm/pkg/utils"
)

// PersonHandler handles person-related requests
type PersonHandler struct {
	personRepo *database.PersonRepository
}

// NewPersonHandler creates a new PersonHandler
func NewPersonHandler(personRepo *database.PersonRepository) *PersonHandler {
	return &PersonHandler{personRepo: personRepo}
}

// ListPersons lists all persons
func (h *PersonHandler) ListPersons(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	persons, total, err := h.personRepo.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch persons"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"persons": persons,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetPerson gets a person by ID
func (h *PersonHandler) GetPerson(c *gin.Context) {
	id, err := utils.ParseInt(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid person ID"})
		return
	}

	person, err := h.personRepo.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	if person == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "person not found"})
		return
	}

	c.JSON(http.StatusOK, person)
}

// CreatePerson creates a new person
func (h *PersonHandler) CreatePerson(c *gin.Context) {
	var person models.PdatPerson
	if err := c.ShouldBindJSON(&person); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current user from context
	username, _ := middleware.GetUsername(c)
	person.CreateUser = username
	person.ModifyUser = username
	person.ActiveFlag = "Y"

	if err := h.personRepo.Create(c.Request.Context(), &person); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create person"})
		return
	}

	c.JSON(http.StatusCreated, person)
}

// UpdatePerson updates a person
func (h *PersonHandler) UpdatePerson(c *gin.Context) {
	id, err := utils.ParseInt(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid person ID"})
		return
	}

	var person models.PdatPerson
	if err := c.ShouldBindJSON(&person); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current user from context
	username, _ := middleware.GetUsername(c)
	person.ID = id
	person.ModifyUser = username

	if err := h.personRepo.Update(c.Request.Context(), &person); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update person"})
		return
	}

	c.JSON(http.StatusOK, person)
}

// DeletePerson deletes a person
func (h *PersonHandler) DeletePerson(c *gin.Context) {
	id, err := utils.ParseInt(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid person ID"})
		return
	}

	if err := h.personRepo.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete person"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "person deleted successfully"})
}

// SearchPersons searches for persons
func (h *PersonHandler) SearchPersons(c *gin.Context) {
	searchTerm := c.Query("q")
	if searchTerm == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search term required"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	persons, total, err := h.personRepo.Search(c.Request.Context(), searchTerm, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to search persons"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"persons": persons,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}
