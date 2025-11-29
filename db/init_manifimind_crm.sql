-- ManifimindCrm Database Initialization
-- This file contains schema definitions for sec_* and pdat_* tables
-- Generated from dump_mde_20200411_2343.dbb

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

-- =============================================
-- SEQUENCES
-- =============================================

CREATE SEQUENCE pdat_address_pdat_address_i_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_cal_pers_pdat_cal_pers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_calendar_pdat_calendar_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_email_ty_pdat_email_ty_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_links_pdat_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_passwd_pdat_passwd_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_pers_ema_pdat_pers_ema_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_pers_not_pdat_pers_not_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_pers_pho_pdat_pers_pho_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_person_pdat_person_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE pdat_phone_ty_pdat_phone_ty_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE sec_accounts_sec_accounts_i_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE sec_privilege_sec_privilege_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE sec_roles_sec_roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE sec_users_sec_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- Sequence Ownerships
ALTER SEQUENCE pdat_cal_pers_pdat_cal_pers_id_seq OWNED BY pdat_cal_pers.pdat_cal_pers_id;

ALTER SEQUENCE pdat_calendar_pdat_calendar_id_seq OWNED BY pdat_calendar.pdat_calendar_id;


-- =============================================
-- TABLES
-- =============================================

CREATE TABLE pdat_address (
    pdat_address_id integer DEFAULT nextval(('"pdat_address_pdat_address_i_seq"'::text)::regclass) NOT NULL,
    addr1 character varying(80),
    addr2 character varying(80),
    city character varying(50),
    zip character varying(5),
    zip_plus_4 character varying(4),
    cmn_states_id integer,
    country character varying(50),
    pdat_person_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE pdat_cal_pers (
    pdat_cal_pers_id integer NOT NULL,
    pdat_calendar_id integer NOT NULL,
    pdat_person_id integer NOT NULL,
    create_date timestamp without time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp without time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE pdat_calendar (
    pdat_calendar_id integer NOT NULL,
    event_date date NOT NULL,
    begin_time timestamp without time zone,
    event_end timestamp without time zone,
    description text,
    title character varying(80) NOT NULL,
    sec_users_id integer,
    create_date timestamp without time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp without time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL,
    period character(1)
);

CREATE TABLE pdat_email_types (
    pdat_email_types_id integer DEFAULT nextval(('"pdat_email_ty_pdat_email_ty_seq"'::text)::regclass) NOT NULL,
    name character varying(50),
    sec_users_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE pdat_links (
    pdat_links_id integer DEFAULT nextval(('"pdat_links_pdat_links_id_seq"'::text)::regclass) NOT NULL,
    name character varying(50),
    link character varying(8190) NOT NULL,
    sec_users_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE pdat_passwd (
    pdat_passwd_id integer DEFAULT nextval(('"pdat_passwd_pdat_passwd_id_seq"'::text)::regclass) NOT NULL,
    descr character varying(120),
    name character varying(50),
    passwd character varying(254),
    opt_link_id integer,
    sec_users_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE pdat_pers_emails (
    pdat_pers_emails_id integer DEFAULT nextval(('"pdat_pers_ema_pdat_pers_ema_seq"'::text)::regclass) NOT NULL,
    email_addr character varying(50),
    pdat_person_id integer NOT NULL,
    pdat_email_types_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE pdat_pers_notes (
    pdat_pers_notes_id integer DEFAULT nextval(('"pdat_pers_not_pdat_pers_not_seq"'::text)::regclass) NOT NULL,
    note_text character varying(8190) NOT NULL,
    pdat_person_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE pdat_pers_phone (
    pdat_pers_phone_id integer DEFAULT nextval(('"pdat_pers_pho_pdat_pers_pho_seq"'::text)::regclass) NOT NULL,
    phone_num character varying(10),
    phone_ext character varying(5),
    country_code character varying(5),
    pdat_phone_type_id integer NOT NULL,
    pdat_person_id integer,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE pdat_person (
    pdat_person_id integer DEFAULT nextval(('"pdat_person_pdat_person_id_seq"'::text)::regclass) NOT NULL,
    fname character varying(120),
    lname character varying(120),
    birthday timestamp with time zone,
    business_flag character(1) NOT NULL,
    sec_users_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE pdat_phone_type (
    pdat_phone_type_id integer DEFAULT nextval(('"pdat_phone_ty_pdat_phone_ty_seq"'::text)::regclass) NOT NULL,
    name character varying(50),
    sec_users_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(30) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(30) NOT NULL,
    active_flag character(1) NOT NULL
);

CREATE TABLE sec_accounts (
    sec_accounts_id integer DEFAULT nextval(('"sec_accounts_sec_accounts_i_seq"'::text)::regclass) NOT NULL,
    name character varying(50) NOT NULL,
    password character varying(50) NOT NULL,
    sec_users_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(20) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(20) NOT NULL
);

CREATE TABLE sec_acct_roles (
    sec_roles_id integer NOT NULL,
    sec_accounts_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(20) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(20) NOT NULL
);

CREATE TABLE sec_privileges (
    sec_privileges_id integer DEFAULT nextval(('"sec_privilege_sec_privilege_seq"'::text)::regclass) NOT NULL,
    name character varying(50) NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(20) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(20) NOT NULL
);

CREATE TABLE sec_role_privs (
    sec_privileges_id integer NOT NULL,
    sec_roles_id integer NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(20) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(20) NOT NULL
);

CREATE TABLE sec_roles (
    sec_roles_id integer DEFAULT nextval(('"sec_roles_sec_roles_id_seq"'::text)::regclass) NOT NULL,
    name character varying(50) NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(20) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(20) NOT NULL
);

CREATE TABLE sec_users (
    sec_users_id integer DEFAULT nextval(('"sec_users_sec_users_id_seq"'::text)::regclass) NOT NULL,
    fname character varying(50) NOT NULL,
    lname character varying(50) NOT NULL,
    create_date timestamp with time zone NOT NULL,
    create_user character varying(20) NOT NULL,
    modify_date timestamp with time zone NOT NULL,
    modify_user character varying(20) NOT NULL
);


-- =============================================
-- CONSTRAINTS
-- =============================================

ALTER TABLE ONLY pdat_cal_pers
    ADD CONSTRAINT uk_pdat_cal_pers_id UNIQUE (pdat_cal_pers_id);

ALTER TABLE ONLY pdat_calendar
    ADD CONSTRAINT uk_pdat_calendar_id UNIQUE (pdat_calendar_id);

ALTER TABLE ONLY pdat_address
    ADD CONSTRAINT chk_pdat_address_pdat_person_id FOREIGN KEY (pdat_person_id) REFERENCES pdat_person(pdat_person_id) MATCH FULL;

ALTER TABLE ONLY pdat_cal_pers
    ADD CONSTRAINT chk_pdat_cal_pers_pdat_calendar_id FOREIGN KEY (pdat_calendar_id) REFERENCES pdat_calendar(pdat_calendar_id) MATCH FULL;

ALTER TABLE ONLY pdat_cal_pers
    ADD CONSTRAINT chk_pdat_cal_pers_pdat_person_id FOREIGN KEY (pdat_person_id) REFERENCES pdat_person(pdat_person_id) MATCH FULL;

ALTER TABLE ONLY pdat_calendar
    ADD CONSTRAINT chk_pdat_calendar_sec_users_id FOREIGN KEY (sec_users_id) REFERENCES sec_users(sec_users_id) MATCH FULL;

ALTER TABLE ONLY pdat_email_types
    ADD CONSTRAINT chk_pdat_email_types_sec_users_ FOREIGN KEY (sec_users_id) REFERENCES sec_users(sec_users_id) MATCH FULL;

ALTER TABLE ONLY pdat_links
    ADD CONSTRAINT chk_pdat_links_sec_users_id FOREIGN KEY (sec_users_id) REFERENCES sec_users(sec_users_id) MATCH FULL;

ALTER TABLE ONLY pdat_passwd
    ADD CONSTRAINT chk_pdat_passwd_sec_users_id FOREIGN KEY (sec_users_id) REFERENCES sec_users(sec_users_id) MATCH FULL;

ALTER TABLE ONLY pdat_pers_emails
    ADD CONSTRAINT chk_pdat_pers_emails_pdat_email FOREIGN KEY (pdat_email_types_id) REFERENCES pdat_email_types(pdat_email_types_id) MATCH FULL;

ALTER TABLE ONLY pdat_person
    ADD CONSTRAINT chk_pdat_person_sec_users_id FOREIGN KEY (sec_users_id) REFERENCES sec_users(sec_users_id) MATCH FULL;

ALTER TABLE ONLY pdat_phone_type
    ADD CONSTRAINT chk_pdat_phone_type_sec_users_i FOREIGN KEY (sec_users_id) REFERENCES sec_users(sec_users_id) MATCH FULL;

ALTER TABLE ONLY sec_acct_roles
    ADD CONSTRAINT chk_sec_acct_roles_sec_accounts FOREIGN KEY (sec_accounts_id) REFERENCES sec_accounts(sec_accounts_id) MATCH FULL;

ALTER TABLE ONLY sec_role_privs
    ADD CONSTRAINT chk_sec_role_privs_sec_privileg FOREIGN KEY (sec_privileges_id) REFERENCES sec_privileges(sec_privileges_id) MATCH FULL;

