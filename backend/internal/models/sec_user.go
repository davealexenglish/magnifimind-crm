package models

import (
	"time"
)

// SecUser represents a user in the system
type SecUser struct {
	ID         int        `json:"id" db:"sec_users_id"`
	FirstName  string     `json:"firstName" db:"fname"`
	LastName   string     `json:"lastName" db:"lname"`
	CreateDate time.Time  `json:"createDate" db:"create_date"`
	CreateUser string     `json:"createUser" db:"create_user"`
	ModifyDate time.Time  `json:"modifyDate" db:"modify_date"`
	ModifyUser string     `json:"modifyUser" db:"modify_user"`
	Email      *string    `json:"email,omitempty" db:"-"` // Not in original schema, added for auth
	Password   *string    `json:"-" db:"-"`               // Not in original schema, added for auth
}

// SecAccount represents an account with authentication credentials
type SecAccount struct {
	ID         int       `json:"id" db:"sec_accounts_id"`
	Name       string    `json:"name" db:"name"`
	Password   string    `json:"-" db:"password"`
	UserID     int       `json:"userId" db:"sec_users_id"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
}

// SecRole represents a security role
type SecRole struct {
	ID         int       `json:"id" db:"sec_roles_id"`
	Name       string    `json:"name" db:"name"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
}

// SecPrivilege represents a security privilege
type SecPrivilege struct {
	ID         int       `json:"id" db:"sec_privileges_id"`
	Name       string    `json:"name" db:"name"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
}

// SecAccountRole represents the relationship between accounts and roles
type SecAccountRole struct {
	RoleID     int       `json:"roleId" db:"sec_roles_id"`
	AccountID  int       `json:"accountId" db:"sec_accounts_id"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
}

// SecRolePrivilege represents the relationship between roles and privileges
type SecRolePrivilege struct {
	PrivilegeID int       `json:"privilegeId" db:"sec_privileges_id"`
	RoleID      int       `json:"roleId" db:"sec_roles_id"`
	CreateDate  time.Time `json:"createDate" db:"create_date"`
	CreateUser  string    `json:"createUser" db:"create_user"`
	ModifyDate  time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser  string    `json:"modifyUser" db:"modify_user"`
}

// RefreshToken represents a refresh token for authentication
type RefreshToken struct {
	ID        int       `json:"id" db:"id"`
	UserID    int       `json:"userId" db:"user_id"`
	Token     string    `json:"token" db:"token"`
	ExpiresAt time.Time `json:"expiresAt" db:"expires_at"`
	Revoked   bool      `json:"revoked" db:"revoked"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}
