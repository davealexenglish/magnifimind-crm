package database

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/davealexenglish/magnifimind-crm/internal/models"
)

// UserRepository handles user-related database operations
type UserRepository struct {
	db *DB
}

// NewUserRepository creates a new UserRepository
func NewUserRepository(db *DB) *UserRepository {
	return &UserRepository{db: db}
}

// FindByID finds a user by ID
func (r *UserRepository) FindByID(ctx context.Context, id int) (*models.SecUser, error) {
	query := `SELECT sec_users_id, fname, lname, create_date, create_user, modify_date, modify_user
	          FROM sec_users WHERE sec_users_id = $1`

	user := &models.SecUser{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.CreateDate,
		&user.CreateUser,
		&user.ModifyDate,
		&user.ModifyUser,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// FindByUsername finds a user account by username (account name)
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*models.SecAccount, error) {
	query := `SELECT sec_accounts_id, name, password, sec_users_id, create_date, create_user, modify_date, modify_user
	          FROM sec_accounts WHERE name = $1`

	account := &models.SecAccount{}
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&account.ID,
		&account.Name,
		&account.Password,
		&account.UserID,
		&account.CreateDate,
		&account.CreateUser,
		&account.ModifyDate,
		&account.ModifyUser,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return account, nil
}

// Create creates a new user and account
func (r *UserRepository) Create(ctx context.Context, user *models.SecUser, account *models.SecAccount) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Insert user
	userQuery := `INSERT INTO sec_users (fname, lname, create_date, create_user, modify_date, modify_user)
	              VALUES ($1, $2, $3, $4, $5, $6) RETURNING sec_users_id`

	now := time.Now()
	createUser := "system"

	err = tx.QueryRowContext(ctx, userQuery,
		user.FirstName,
		user.LastName,
		now,
		createUser,
		now,
		createUser,
	).Scan(&user.ID)

	if err != nil {
		return err
	}

	// Insert account
	accountQuery := `INSERT INTO sec_accounts (name, password, sec_users_id, create_date, create_user, modify_date, modify_user)
	                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING sec_accounts_id`

	err = tx.QueryRowContext(ctx, accountQuery,
		account.Name,
		account.Password,
		user.ID,
		now,
		createUser,
		now,
		createUser,
	).Scan(&account.ID)

	if err != nil {
		return err
	}

	account.UserID = user.ID

	return tx.Commit()
}

// SaveRefreshToken saves a refresh token
func (r *UserRepository) SaveRefreshToken(ctx context.Context, rt *models.RefreshToken) error {
	// Create refresh_tokens table if it doesn't exist
	createTableQuery := `
		CREATE TABLE IF NOT EXISTS refresh_tokens (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			token VARCHAR(255) NOT NULL UNIQUE,
			expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
			revoked BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
		)
	`
	_, err := r.db.ExecContext(ctx, createTableQuery)
	if err != nil {
		return err
	}

	query := `INSERT INTO refresh_tokens (user_id, token, expires_at)
	          VALUES ($1, $2, $3) RETURNING id, created_at`

	return r.db.QueryRowContext(ctx, query, rt.UserID, rt.Token, rt.ExpiresAt).Scan(&rt.ID, &rt.CreatedAt)
}

// FindRefreshToken finds a refresh token
func (r *UserRepository) FindRefreshToken(ctx context.Context, token string) (*models.RefreshToken, error) {
	query := `SELECT id, user_id, token, expires_at, revoked, created_at
	          FROM refresh_tokens WHERE token = $1`

	rt := &models.RefreshToken{}
	err := r.db.QueryRowContext(ctx, query, token).Scan(
		&rt.ID,
		&rt.UserID,
		&rt.Token,
		&rt.ExpiresAt,
		&rt.Revoked,
		&rt.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return rt, nil
}

// RevokeRefreshToken revokes a refresh token
func (r *UserRepository) RevokeRefreshToken(ctx context.Context, token string) error {
	query := `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`
	result, err := r.db.ExecContext(ctx, query, token)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.New("token not found")
	}

	return nil
}

// List returns a list of all users
func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]*models.SecUser, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM sec_users`
	err := r.db.QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get users
	query := `SELECT sec_users_id, fname, lname, create_date, create_user, modify_date, modify_user
	          FROM sec_users ORDER BY sec_users_id LIMIT $1 OFFSET $2`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	users := []*models.SecUser{}
	for rows.Next() {
		user := &models.SecUser{}
		err := rows.Scan(
			&user.ID,
			&user.FirstName,
			&user.LastName,
			&user.CreateDate,
			&user.CreateUser,
			&user.ModifyDate,
			&user.ModifyUser,
		)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}

	return users, total, nil
}

// Update updates a user
func (r *UserRepository) Update(ctx context.Context, user *models.SecUser) error {
	query := `UPDATE sec_users SET fname = $1, lname = $2, modify_date = $3, modify_user = $4
	          WHERE sec_users_id = $5`

	_, err := r.db.ExecContext(ctx, query,
		user.FirstName,
		user.LastName,
		time.Now(),
		"system",
		user.ID,
	)

	return err
}

// Delete deletes a user
func (r *UserRepository) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM sec_users WHERE sec_users_id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// Search searches for users by name
func (r *UserRepository) Search(ctx context.Context, searchTerm string, limit, offset int) ([]*models.SecUser, int, error) {
	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM sec_users WHERE fname ILIKE $1 OR lname ILIKE $1`
	err := r.db.QueryRowContext(ctx, countQuery, "%"+searchTerm+"%").Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get users
	query := `SELECT sec_users_id, fname, lname, create_date, create_user, modify_date, modify_user
	          FROM sec_users WHERE fname ILIKE $1 OR lname ILIKE $1
	          ORDER BY sec_users_id LIMIT $2 OFFSET $3`

	rows, err := r.db.QueryContext(ctx, query, "%"+searchTerm+"%", limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	users := []*models.SecUser{}
	for rows.Next() {
		user := &models.SecUser{}
		err := rows.Scan(
			&user.ID,
			&user.FirstName,
			&user.LastName,
			&user.CreateDate,
			&user.CreateUser,
			&user.ModifyDate,
			&user.ModifyUser,
		)
		if err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}

	return users, total, nil
}
