package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/davealexenglish/magnifimind-crm/internal/models"
)

// PersonRepository handles person-related database operations
type PersonRepository struct {
	db *DB
}

// NewPersonRepository creates a new PersonRepository
func NewPersonRepository(db *DB) *PersonRepository {
	return &PersonRepository{db: db}
}

// FindByID finds a person by ID
func (r *PersonRepository) FindByID(ctx context.Context, id int) (*models.PdatPerson, error) {
	query := `SELECT pdat_person_id, fname, lname, birthday, business_flag, sec_users_id,
	                 create_date, create_user, modify_date, modify_user, active_flag
	          FROM pdat_person WHERE pdat_person_id = $1`

	person := &models.PdatPerson{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&person.ID,
		&person.FirstName,
		&person.LastName,
		&person.Birthday,
		&person.BusinessFlag,
		&person.UserID,
		&person.CreateDate,
		&person.CreateUser,
		&person.ModifyDate,
		&person.ModifyUser,
		&person.ActiveFlag,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return person, nil
}

// List returns a list of persons
func (r *PersonRepository) List(ctx context.Context, limit, offset int) ([]*models.PdatPerson, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM pdat_person WHERE active_flag = 'Y'`
	err := r.db.QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get persons
	query := `SELECT pdat_person_id, fname, lname, birthday, business_flag, sec_users_id,
	                 create_date, create_user, modify_date, modify_user, active_flag
	          FROM pdat_person WHERE active_flag = 'Y'
	          ORDER BY pdat_person_id LIMIT $1 OFFSET $2`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	persons := []*models.PdatPerson{}
	for rows.Next() {
		person := &models.PdatPerson{}
		err := rows.Scan(
			&person.ID,
			&person.FirstName,
			&person.LastName,
			&person.Birthday,
			&person.BusinessFlag,
			&person.UserID,
			&person.CreateDate,
			&person.CreateUser,
			&person.ModifyDate,
			&person.ModifyUser,
			&person.ActiveFlag,
		)
		if err != nil {
			return nil, 0, err
		}
		persons = append(persons, person)
	}

	return persons, total, nil
}

// ListWithFilters returns a filtered list of persons
func (r *PersonRepository) ListWithFilters(ctx context.Context, fname, lname string, businessFlag bool, limit, offset int) ([]*models.PdatPerson, int, error) {
	// Build WHERE conditions
	conditions := []string{"active_flag = 'Y'"}
	args := []interface{}{}
	argNum := 1

	if fname != "" {
		conditions = append(conditions, fmt.Sprintf("fname ILIKE $%d", argNum))
		args = append(args, "%"+fname+"%")
		argNum++
	}

	if lname != "" {
		conditions = append(conditions, fmt.Sprintf("lname ILIKE $%d", argNum))
		args = append(args, "%"+lname+"%")
		argNum++
	}

	if businessFlag {
		conditions = append(conditions, "business_flag = true")
	}

	whereClause := ""
	for i, cond := range conditions {
		if i == 0 {
			whereClause = "WHERE " + cond
		} else {
			whereClause += " AND " + cond
		}
	}

	// Get total count
	var total int
	countQuery := "SELECT COUNT(*) FROM pdat_person " + whereClause
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Add LIMIT and OFFSET to args
	limitArg := fmt.Sprintf("$%d", argNum)
	argNum++
	offsetArg := fmt.Sprintf("$%d", argNum)
	args = append(args, limit, offset)

	// Get persons
	query := fmt.Sprintf(`SELECT pdat_person_id, fname, lname, birthday, business_flag, sec_users_id,
	                 create_date, create_user, modify_date, modify_user, active_flag
	          FROM pdat_person %s
	          ORDER BY pdat_person_id LIMIT %s OFFSET %s`, whereClause, limitArg, offsetArg)

	fmt.Printf("[DEBUG] ListWithFilters SQL Query: %s\n", query)
	fmt.Printf("[DEBUG] ListWithFilters SQL Args: %v\n", args)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	persons := []*models.PdatPerson{}
	for rows.Next() {
		person := &models.PdatPerson{}
		err := rows.Scan(
			&person.ID,
			&person.FirstName,
			&person.LastName,
			&person.Birthday,
			&person.BusinessFlag,
			&person.UserID,
			&person.CreateDate,
			&person.CreateUser,
			&person.ModifyDate,
			&person.ModifyUser,
			&person.ActiveFlag,
		)
		if err != nil {
			return nil, 0, err
		}
		persons = append(persons, person)
	}

	return persons, total, nil
}

// Create creates a new person
func (r *PersonRepository) Create(ctx context.Context, person *models.PdatPerson) error {
	query := `INSERT INTO pdat_person (fname, lname, birthday, business_flag, sec_users_id,
	                                    create_date, create_user, modify_date, modify_user, active_flag)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING pdat_person_id`

	now := time.Now()
	return r.db.QueryRowContext(ctx, query,
		person.FirstName,
		person.LastName,
		person.Birthday,
		person.BusinessFlag,
		person.UserID,
		now,
		person.CreateUser,
		now,
		person.ModifyUser,
		person.ActiveFlag,
	).Scan(&person.ID)
}

// Update updates a person
func (r *PersonRepository) Update(ctx context.Context, person *models.PdatPerson) error {
	query := `UPDATE pdat_person SET fname = $1, lname = $2, birthday = $3, business_flag = $4,
	                                  modify_date = $5, modify_user = $6, active_flag = $7
	          WHERE pdat_person_id = $8`

	_, err := r.db.ExecContext(ctx, query,
		person.FirstName,
		person.LastName,
		person.Birthday,
		person.BusinessFlag,
		time.Now(),
		person.ModifyUser,
		person.ActiveFlag,
		person.ID,
	)

	return err
}

// Delete soft-deletes a person by setting active_flag to 'N'
func (r *PersonRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE pdat_person SET active_flag = 'N', modify_date = $1 WHERE pdat_person_id = $2`
	_, err := r.db.ExecContext(ctx, query, time.Now(), id)
	return err
}

// Search searches for persons by name
func (r *PersonRepository) Search(ctx context.Context, searchTerm string, limit, offset int) ([]*models.PdatPerson, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM pdat_person
	               WHERE active_flag = 'Y' AND (fname ILIKE $1 OR lname ILIKE $1)`
	err := r.db.QueryRowContext(ctx, countQuery, "%"+searchTerm+"%").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get persons
	query := `SELECT pdat_person_id, fname, lname, birthday, business_flag, sec_users_id,
	                 create_date, create_user, modify_date, modify_user, active_flag
	          FROM pdat_person
	          WHERE active_flag = 'Y' AND (fname ILIKE $1 OR lname ILIKE $1)
	          ORDER BY pdat_person_id LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, "%"+searchTerm+"%", limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	persons := []*models.PdatPerson{}
	for rows.Next() {
		person := &models.PdatPerson{}
		err := rows.Scan(
			&person.ID,
			&person.FirstName,
			&person.LastName,
			&person.Birthday,
			&person.BusinessFlag,
			&person.UserID,
			&person.CreateDate,
			&person.CreateUser,
			&person.ModifyDate,
			&person.ModifyUser,
			&person.ActiveFlag,
		)
		if err != nil {
			return nil, 0, err
		}
		persons = append(persons, person)
	}

	return persons, total, nil
}
