package models

import (
	"time"
)

// PdatPerson represents a person in the personal data system
type PdatPerson struct {
	ID           int        `json:"id" db:"pdat_person_id"`
	FirstName    *string    `json:"firstName" db:"fname"`
	LastName     *string    `json:"lastName" db:"lname"`
	Birthday     *time.Time `json:"birthday" db:"birthday"`
	BusinessFlag string     `json:"businessFlag" db:"business_flag"`
	UserID       int        `json:"userId" db:"sec_users_id"`
	CreateDate   time.Time  `json:"createDate" db:"create_date"`
	CreateUser   string     `json:"createUser" db:"create_user"`
	ModifyDate   time.Time  `json:"modifyDate" db:"modify_date"`
	ModifyUser   string     `json:"modifyUser" db:"modify_user"`
	ActiveFlag   string     `json:"activeFlag" db:"active_flag"`
}

// PdatAddress represents a person's address
type PdatAddress struct {
	ID         int        `json:"id" db:"pdat_address_id"`
	Addr1      *string    `json:"addr1" db:"addr1"`
	Addr2      *string    `json:"addr2" db:"addr2"`
	City       *string    `json:"city" db:"city"`
	Zip        *string    `json:"zip" db:"zip"`
	ZipPlus4   *string    `json:"zipPlus4" db:"zip_plus_4"`
	StateID    *int       `json:"stateId" db:"cmn_states_id"`
	Country    *string    `json:"country" db:"country"`
	PersonID   int        `json:"personId" db:"pdat_person_id"`
	CreateDate time.Time  `json:"createDate" db:"create_date"`
	CreateUser string     `json:"createUser" db:"create_user"`
	ModifyDate time.Time  `json:"modifyDate" db:"modify_date"`
	ModifyUser string     `json:"modifyUser" db:"modify_user"`
	ActiveFlag string     `json:"activeFlag" db:"active_flag"`
}

// PdatPersEmail represents a person's email address
type PdatPersEmail struct {
	ID           int       `json:"id" db:"pdat_pers_emails_id"`
	EmailAddr    *string   `json:"emailAddr" db:"email_addr"`
	PersonID     int       `json:"personId" db:"pdat_person_id"`
	EmailTypeID  int       `json:"emailTypeId" db:"pdat_email_types_id"`
	CreateDate   time.Time `json:"createDate" db:"create_date"`
	CreateUser   string    `json:"createUser" db:"create_user"`
	ModifyDate   time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser   string    `json:"modifyUser" db:"modify_user"`
	ActiveFlag   string    `json:"activeFlag" db:"active_flag"`
}

// PdatEmailType represents an email type
type PdatEmailType struct {
	ID         int       `json:"id" db:"pdat_email_types_id"`
	Name       *string   `json:"name" db:"name"`
	UserID     int       `json:"userId" db:"sec_users_id"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
	ActiveFlag string    `json:"activeFlag" db:"active_flag"`
}

// PdatPersPhone represents a person's phone number
type PdatPersPhone struct {
	ID          int       `json:"id" db:"pdat_pers_phone_id"`
	PhoneNum    *string   `json:"phoneNum" db:"phone_num"`
	PhoneExt    *string   `json:"phoneExt" db:"phone_ext"`
	CountryCode *string   `json:"countryCode" db:"country_code"`
	PhoneTypeID int       `json:"phoneTypeId" db:"pdat_phone_type_id"`
	PersonID    *int      `json:"personId" db:"pdat_person_id"`
	CreateDate  time.Time `json:"createDate" db:"create_date"`
	CreateUser  string    `json:"createUser" db:"create_user"`
	ModifyDate  time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser  string    `json:"modifyUser" db:"modify_user"`
	ActiveFlag  string    `json:"activeFlag" db:"active_flag"`
}

// PdatPhoneType represents a phone type
type PdatPhoneType struct {
	ID         int       `json:"id" db:"pdat_phone_type_id"`
	Name       *string   `json:"name" db:"name"`
	UserID     int       `json:"userId" db:"sec_users_id"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
	ActiveFlag string    `json:"activeFlag" db:"active_flag"`
}

// PdatPersNote represents a note about a person
type PdatPersNote struct {
	ID         int       `json:"id" db:"pdat_pers_notes_id"`
	NoteText   string    `json:"noteText" db:"note_text"`
	PersonID   int       `json:"personId" db:"pdat_person_id"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
	ActiveFlag string    `json:"activeFlag" db:"active_flag"`
}
