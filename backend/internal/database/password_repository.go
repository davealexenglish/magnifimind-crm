package database

import (
	"context"
	"database/sql"
	"time"

	"github.com/davealexenglish/magnifimind-crm/internal/models"
)

// PasswordRepository handles password vault database operations
type PasswordRepository struct {
	db *DB
}

// NewPasswordRepository creates a new PasswordRepository
func NewPasswordRepository(db *DB) *PasswordRepository {
	return &PasswordRepository{db: db}
}

// FindByID finds a password entry by ID
func (r *PasswordRepository) FindByID(ctx context.Context, id int) (*models.PdatPasswd, error) {
	query := `SELECT pdat_passwd_id, descr, name, passwd, opt_link_id, sec_users_id,
	                 create_date, create_user, modify_date, modify_user, active_flag
	          FROM pdat_passwd WHERE pdat_passwd_id = $1 AND active_flag = 'Y'`

	password := &models.PdatPasswd{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&password.ID,
		&password.Descr,
		&password.Name,
		&password.Passwd,
		&password.OptLinkID,
		&password.UserID,
		&password.CreateDate,
		&password.CreateUser,
		&password.ModifyDate,
		&password.ModifyUser,
		&password.ActiveFlag,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return password, nil
}

// FindByUserID finds all password entries for a user
func (r *PasswordRepository) FindByUserID(ctx context.Context, userID int) ([]*models.PdatPasswd, error) {
	query := `SELECT pdat_passwd_id, descr, name, passwd, opt_link_id, sec_users_id,
	                 create_date, create_user, modify_date, modify_user, active_flag
	          FROM pdat_passwd WHERE sec_users_id = $1 AND active_flag = 'Y'
	          ORDER BY descr, name`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	passwords := []*models.PdatPasswd{}
	for rows.Next() {
		password := &models.PdatPasswd{}
		err := rows.Scan(
			&password.ID,
			&password.Descr,
			&password.Name,
			&password.Passwd,
			&password.OptLinkID,
			&password.UserID,
			&password.CreateDate,
			&password.CreateUser,
			&password.ModifyDate,
			&password.ModifyUser,
			&password.ActiveFlag,
		)
		if err != nil {
			return nil, err
		}
		passwords = append(passwords, password)
	}

	return passwords, nil
}

// List returns a list of password entries for a user with pagination
func (r *PasswordRepository) List(ctx context.Context, userID int, limit, offset int) ([]*models.PdatPasswd, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM pdat_passwd WHERE sec_users_id = $1 AND active_flag = 'Y'`
	err := r.db.QueryRowContext(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get passwords
	query := `SELECT pdat_passwd_id, descr, name, passwd, opt_link_id, sec_users_id,
	                 create_date, create_user, modify_date, modify_user, active_flag
	          FROM pdat_passwd WHERE sec_users_id = $1 AND active_flag = 'Y'
	          ORDER BY descr, name LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	passwords := []*models.PdatPasswd{}
	for rows.Next() {
		password := &models.PdatPasswd{}
		err := rows.Scan(
			&password.ID,
			&password.Descr,
			&password.Name,
			&password.Passwd,
			&password.OptLinkID,
			&password.UserID,
			&password.CreateDate,
			&password.CreateUser,
			&password.ModifyDate,
			&password.ModifyUser,
			&password.ActiveFlag,
		)
		if err != nil {
			return nil, 0, err
		}
		passwords = append(passwords, password)
	}

	return passwords, total, nil
}

// Create creates a new password entry (password should be encrypted before calling this)
func (r *PasswordRepository) Create(ctx context.Context, password *models.PdatPasswd) error {
	query := `INSERT INTO pdat_passwd (descr, name, passwd, opt_link_id, sec_users_id,
	                                    create_date, create_user, modify_date, modify_user, active_flag)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING pdat_passwd_id`

	now := time.Now()
	return r.db.QueryRowContext(ctx, query,
		password.Descr,
		password.Name,
		password.Passwd, // Should already be encrypted
		password.OptLinkID,
		password.UserID,
		now,
		password.CreateUser,
		now,
		password.ModifyUser,
		password.ActiveFlag,
	).Scan(&password.ID)
}

// Update updates a password entry (password should be encrypted before calling this)
func (r *PasswordRepository) Update(ctx context.Context, password *models.PdatPasswd) error {
	query := `UPDATE pdat_passwd SET descr = $1, name = $2, passwd = $3, opt_link_id = $4,
	                                  modify_date = $5, modify_user = $6, active_flag = $7
	          WHERE pdat_passwd_id = $8`

	_, err := r.db.ExecContext(ctx, query,
		password.Descr,
		password.Name,
		password.Passwd, // Should already be encrypted
		password.OptLinkID,
		time.Now(),
		password.ModifyUser,
		password.ActiveFlag,
		password.ID,
	)

	return err
}

// Delete soft-deletes a password entry by setting active_flag to 'N'
func (r *PasswordRepository) Delete(ctx context.Context, id int) error {
	query := `UPDATE pdat_passwd SET active_flag = 'N', modify_date = $1 WHERE pdat_passwd_id = $2`
	_, err := r.db.ExecContext(ctx, query, time.Now(), id)
	return err
}

// Search searches for password entries by description or name
func (r *PasswordRepository) Search(ctx context.Context, userID int, searchTerm string, limit, offset int) ([]*models.PdatPasswd, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM pdat_passwd
	               WHERE sec_users_id = $1 AND active_flag = 'Y'
	               AND (descr ILIKE $2 OR name ILIKE $2)`
	err := r.db.QueryRowContext(ctx, countQuery, userID, "%"+searchTerm+"%").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get passwords
	query := `SELECT pdat_passwd_id, descr, name, passwd, opt_link_id, sec_users_id,
	                 create_date, create_user, modify_date, modify_user, active_flag
	          FROM pdat_passwd
	          WHERE sec_users_id = $1 AND active_flag = 'Y' AND (descr ILIKE $2 OR name ILIKE $2)
	          ORDER BY descr, name LIMIT $3 OFFSET $4`

	rows, err := r.db.QueryContext(ctx, query, userID, "%"+searchTerm+"%", limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	passwords := []*models.PdatPasswd{}
	for rows.Next() {
		password := &models.PdatPasswd{}
		err := rows.Scan(
			&password.ID,
			&password.Descr,
			&password.Name,
			&password.Passwd,
			&password.OptLinkID,
			&password.UserID,
			&password.CreateDate,
			&password.CreateUser,
			&password.ModifyDate,
			&password.ModifyUser,
			&password.ActiveFlag,
		)
		if err != nil {
			return nil, 0, err
		}
		passwords = append(passwords, password)
	}

	return passwords, total, nil
}
