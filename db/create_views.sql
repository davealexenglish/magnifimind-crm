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
