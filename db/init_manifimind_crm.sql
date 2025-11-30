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
    link_text character varying(255),
    link_url character varying(8190) NOT NULL,
    note text,
    pdat_person_id integer NOT NULL,
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
    password character varying(100) NOT NULL,
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
    ADD CONSTRAINT chk_pdat_links_pdat_person_id FOREIGN KEY (pdat_person_id) REFERENCES pdat_person(pdat_person_id) MATCH FULL;

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

-- Multi-tenant Views for Manifimind CRM
-- These views join person data to related tables and include sec_users_id for tenant filtering

-- View: Person Emails with Person Name and Email Type
CREATE OR REPLACE VIEW v_person_emails AS
SELECT
    pe.pdat_pers_emails_id,
    pe.email_addr,
    pe.pdat_person_id,
    pe.pdat_email_types_id,
    et.name AS email_type_name,
    p.fname AS person_fname,
    p.lname AS person_lname,
    p.fname || ' ' || p.lname AS person_full_name,
    p.sec_users_id,
    pe.create_date,
    pe.create_user,
    pe.modify_date,
    pe.modify_user,
    pe.active_flag
FROM pdat_pers_emails pe
JOIN pdat_person p ON pe.pdat_person_id = p.pdat_person_id
JOIN pdat_email_types et ON pe.pdat_email_types_id = et.pdat_email_types_id
WHERE pe.active_flag = 'Y' AND p.active_flag = 'Y' AND et.active_flag = 'Y';

-- View: Person Addresses with Person Name
CREATE OR REPLACE VIEW v_person_addresses AS
SELECT
    pa.pdat_address_id,
    pa.addr1,
    pa.addr2,
    pa.city,
    pa.cmn_states_id,
    pa.zip,
    pa.zip_plus_4,
    pa.country,
    pa.pdat_person_id,
    p.fname AS person_fname,
    p.lname AS person_lname,
    p.fname || ' ' || p.lname AS person_full_name,
    p.sec_users_id,
    pa.create_date,
    pa.create_user,
    pa.modify_date,
    pa.modify_user,
    pa.active_flag
FROM pdat_address pa
JOIN pdat_person p ON pa.pdat_person_id = p.pdat_person_id
WHERE pa.active_flag = 'Y' AND p.active_flag = 'Y';

-- View: Person Phones with Person Name and Phone Type
CREATE OR REPLACE VIEW v_person_phones AS
SELECT
    pp.pdat_pers_phone_id,
    pp.phone_num,
    pp.phone_ext,
    pp.country_code,
    pp.pdat_phone_type_id,
    pt.name AS phone_type_name,
    pp.pdat_person_id,
    p.fname AS person_fname,
    p.lname AS person_lname,
    p.fname || ' ' || p.lname AS person_full_name,
    p.sec_users_id,
    pp.create_date,
    pp.create_user,
    pp.modify_date,
    pp.modify_user,
    pp.active_flag
FROM pdat_pers_phone pp
JOIN pdat_person p ON pp.pdat_person_id = p.pdat_person_id
JOIN pdat_phone_type pt ON pp.pdat_phone_type_id = pt.pdat_phone_type_id
WHERE pp.active_flag = 'Y' AND p.active_flag = 'Y' AND pt.active_flag = 'Y';

-- View: Person Notes with Person Name
CREATE OR REPLACE VIEW v_person_notes AS
SELECT
    pn.pdat_pers_notes_id,
    pn.note_text,
    pn.pdat_person_id,
    p.fname AS person_fname,
    p.lname AS person_lname,
    p.fname || ' ' || p.lname AS person_full_name,
    p.sec_users_id,
    pn.create_date,
    pn.create_user,
    pn.modify_date,
    pn.modify_user,
    pn.active_flag
FROM pdat_pers_notes pn
JOIN pdat_person p ON pn.pdat_person_id = p.pdat_person_id
WHERE pn.active_flag = 'Y' AND p.active_flag = 'Y';

-- View: Person Links with Person Name
CREATE OR REPLACE VIEW v_person_links AS
SELECT
    pl.pdat_links_id,
    pl.link_text,
    pl.link_url,
    pl.note,
    pl.pdat_person_id,
    p.fname AS person_fname,
    p.lname AS person_lname,
    p.fname || ' ' || p.lname AS person_full_name,
    p.sec_users_id,
    pl.create_date,
    pl.create_user,
    pl.modify_date,
    pl.modify_user,
    pl.active_flag
FROM pdat_links pl
JOIN pdat_person p ON pl.pdat_person_id = p.pdat_person_id
WHERE pl.active_flag = 'Y' AND p.active_flag = 'Y';

-- View: Active People (already filtered by active_flag)
CREATE OR REPLACE VIEW v_active_people AS
SELECT
    pdat_person_id,
    fname,
    lname,
    fname || ' ' || lname AS full_name,
    birthday,
    business_flag,
    sec_users_id,
    create_date,
    create_user,
    modify_date,
    modify_user,
    active_flag
FROM pdat_person
WHERE active_flag = 'Y';

-- Grant permissions (adjust as needed for your database user)
-- GRANT SELECT ON v_person_emails TO your_app_user;
-- GRANT SELECT ON v_person_addresses TO your_app_user;
-- GRANT SELECT ON v_person_phones TO your_app_user;
-- GRANT SELECT ON v_person_notes TO your_app_user;
-- GRANT SELECT ON v_person_links TO your_app_user;
-- GRANT SELECT ON v_active_people TO your_app_user;
