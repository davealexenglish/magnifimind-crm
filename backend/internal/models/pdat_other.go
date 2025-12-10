package models

import (
	"time"
)

// PdatCalendar represents a calendar event
type PdatCalendar struct {
	ID          int        `json:"id" db:"pdat_calendar_id"`
	EventDate   time.Time  `json:"eventDate" db:"event_date"`
	BeginTime   *time.Time `json:"beginTime" db:"begin_time"`
	EventEnd    *time.Time `json:"eventEnd" db:"event_end"`
	Description *string    `json:"description" db:"description"`
	Title       string     `json:"title" db:"title"`
	UserID      *int       `json:"userId" db:"sec_users_id"`
	CreateDate  time.Time  `json:"createDate" db:"create_date"`
	CreateUser  string     `json:"createUser" db:"create_user"`
	ModifyDate  time.Time  `json:"modifyDate" db:"modify_date"`
	ModifyUser  string     `json:"modifyUser" db:"modify_user"`
	ActiveFlag  string     `json:"activeFlag" db:"active_flag"`
	Period      *string    `json:"period" db:"period"`
}

// PdatCalPers represents the relationship between calendar events and persons
type PdatCalPers struct {
	ID         int       `json:"id" db:"pdat_cal_pers_id"`
	CalendarID int       `json:"calendarId" db:"pdat_calendar_id"`
	PersonID   int       `json:"personId" db:"pdat_person_id"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
	ActiveFlag string    `json:"activeFlag" db:"active_flag"`
}

// PdatLink represents a web link
type PdatLink struct {
	ID         int       `json:"id" db:"pdat_links_id"`
	Name       *string   `json:"name" db:"name"`
	Link       string    `json:"link" db:"link"`
	UserID     int       `json:"userId" db:"sec_users_id"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
	ActiveFlag string    `json:"activeFlag" db:"active_flag"`
}

// PdatPasswd represents a stored password/credential
type PdatPasswd struct {
	ID         int       `json:"id" db:"pdat_passwd_id"`
	Descr      *string   `json:"descr" db:"descr"`
	Name       *string   `json:"name" db:"name"`
	Passwd     *string   `json:"passwd" db:"passwd"`
	OptLinkID  *int      `json:"optLinkId" db:"opt_link_id"`
	LinkUrl    *string   `json:"linkUrl" db:"link_url"`
	UserID     int       `json:"userId" db:"sec_users_id"`
	CreateDate time.Time `json:"createDate" db:"create_date"`
	CreateUser string    `json:"createUser" db:"create_user"`
	ModifyDate time.Time `json:"modifyDate" db:"modify_date"`
	ModifyUser string    `json:"modifyUser" db:"modify_user"`
	ActiveFlag string    `json:"activeFlag" db:"active_flag"`
}
