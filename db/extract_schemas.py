#!/usr/bin/env python3
"""
Extract sec_* and pdat_* schemas and data from PostgreSQL dump file.
Generates init_manifimind_crm.sql and load_manifimind_crm.sql files.
"""

import re
import sys

def extract_schemas_and_data(dump_file_path):
    """Extract schemas and data for sec_* and pdat_* tables."""

    # Target tables
    target_prefixes = ('sec_', 'pdat_')

    # Storage
    schemas = []
    sequences = []
    sequence_ownerships = []
    alter_sequences = []
    constraints = []
    data_statements = []

    # Reading state
    in_create_table = False
    in_sequence = False
    in_copy = False
    current_statement = []
    current_table = None
    copy_columns = None
    copy_data = []

    print(f"Reading dump file: {dump_file_path}")

    with open(dump_file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line_num, line in enumerate(f, 1):
            # Check for CREATE TABLE
            match = re.match(r'CREATE TABLE (sec_\w+|pdat_\w+)', line)
            if match:
                in_create_table = True
                current_table = match.group(1)
                current_statement = [line]
                continue

            # Check for CREATE SEQUENCE
            match = re.match(r'CREATE SEQUENCE (sec_\w+|pdat_\w+|\w*pdat_\w+|\w*sec_\w+)', line)
            if match:
                in_sequence = True
                current_statement = [line]
                continue

            # Continue building CREATE TABLE
            if in_create_table:
                current_statement.append(line)
                if line.strip().endswith(');'):
                    schemas.append(''.join(current_statement))
                    print(f"  Found CREATE TABLE: {current_table}")
                    in_create_table = False
                    current_statement = []
                    current_table = None
                continue

            # Continue building CREATE SEQUENCE
            if in_sequence:
                current_statement.append(line)
                if line.strip().endswith(';'):
                    sequences.append(''.join(current_statement))
                    in_sequence = False
                    current_statement = []
                continue

            # Check for ALTER SEQUENCE OWNED BY
            match = re.match(r'ALTER SEQUENCE (\w+) OWNED BY (sec_\w+|pdat_\w+)', line)
            if match:
                sequence_ownerships.append(line)
                continue

            # Check for ALTER TABLE DEFAULT nextval
            if 'DEFAULT nextval' in line and ('sec_' in line or 'pdat_' in line):
                alter_sequences.append(line)
                continue

            # Check for COPY statement
            match = re.match(r'COPY (sec_\w+|pdat_\w+) \(([^)]+)\) FROM stdin;', line)
            if match:
                in_copy = True
                current_table = match.group(1)
                copy_columns = match.group(2)
                copy_data = []
                print(f"  Found COPY data for: {current_table}")
                continue

            # Collect COPY data
            if in_copy:
                if line.strip() == '\\.':
                    # End of COPY data - convert to INSERT
                    if copy_data:
                        # Create INSERT statements
                        insert_header = f"-- Data for {current_table}\n"
                        inserts = [f"INSERT INTO {current_table} ({copy_columns}) VALUES"]

                        for i, data_line in enumerate(copy_data):
                            # Escape single quotes and format values
                            values = data_line.strip().split('\t')
                            formatted_values = []
                            for val in values:
                                if val == '\\N':
                                    formatted_values.append('NULL')
                                else:
                                    # Escape single quotes
                                    val = val.replace("'", "''")
                                    formatted_values.append(f"'{val}'")

                            value_str = f"  ({', '.join(formatted_values)})"
                            if i < len(copy_data) - 1:
                                value_str += ","
                            else:
                                value_str += ";"
                            inserts.append(value_str)

                        data_statements.append(insert_header + '\n'.join(inserts) + '\n')

                    in_copy = False
                    copy_data = []
                    current_table = None
                    copy_columns = None
                else:
                    copy_data.append(line)
                continue

            # Check for constraints (PRIMARY KEY, UNIQUE, FOREIGN KEY)
            if 'ALTER TABLE ONLY' in line and ('sec_' in line or 'pdat_' in line):
                # Start of constraint - need to read until semicolon
                current_statement = [line]
                while not line.strip().endswith(';'):
                    line = next(f)
                    current_statement.append(line)

                constraint_sql = ''.join(current_statement)

                # Only include constraints for our target tables
                # Skip foreign keys to tables outside sec_* and pdat_*
                if 'FOREIGN KEY' in constraint_sql:
                    # Check if it references a sec_* or pdat_* table
                    if re.search(r'REFERENCES (sec_\w+|pdat_\w+)', constraint_sql):
                        # Check if the foreign key doesn't reference excluded tables
                        if not re.search(r'REFERENCES (cmn_|mde_|stage_|tmp_)', constraint_sql):
                            constraints.append(constraint_sql)
                else:
                    # Include PRIMARY KEY and UNIQUE constraints
                    constraints.append(constraint_sql)

    print(f"\nExtraction complete:")
    print(f"  Tables: {len(schemas)}")
    print(f"  Sequences: {len(sequences)}")
    print(f"  Constraints: {len(constraints)}")
    print(f"  Data statements: {len(data_statements)}")

    return schemas, sequences, sequence_ownerships, constraints, data_statements


def write_init_sql(schemas, sequences, sequence_ownerships, constraints, output_file):
    """Write the init SQL file with schemas only."""
    print(f"\nWriting init file: {output_file}")

    with open(output_file, 'w') as f:
        f.write("-- ManifimindCrm Database Initialization\n")
        f.write("-- This file contains schema definitions for sec_* and pdat_* tables\n")
        f.write("-- Generated from dump_mde_20200411_2343.dbb\n\n")

        f.write("SET statement_timeout = 0;\n")
        f.write("SET lock_timeout = 0;\n")
        f.write("SET client_encoding = 'UTF8';\n")
        f.write("SET standard_conforming_strings = on;\n")
        f.write("SET check_function_bodies = false;\n")
        f.write("SET client_min_messages = warning;\n\n")

        # Write sequences first
        f.write("-- =============================================\n")
        f.write("-- SEQUENCES\n")
        f.write("-- =============================================\n\n")
        for seq in sequences:
            f.write(seq + "\n")

        # Write sequence ownerships
        if sequence_ownerships:
            f.write("\n-- Sequence Ownerships\n")
            for ownership in sequence_ownerships:
                f.write(ownership + "\n")

        # Write tables
        f.write("\n-- =============================================\n")
        f.write("-- TABLES\n")
        f.write("-- =============================================\n\n")
        for schema in schemas:
            f.write(schema + "\n")

        # Write constraints
        f.write("\n-- =============================================\n")
        f.write("-- CONSTRAINTS\n")
        f.write("-- =============================================\n\n")
        for constraint in constraints:
            f.write(constraint + "\n")

    print(f"  Init file written successfully")


def write_load_sql(data_statements, output_file):
    """Write the load SQL file with data only."""
    print(f"\nWriting load file: {output_file}")

    with open(output_file, 'w') as f:
        f.write("-- ManifimindCrm Database Data Load\n")
        f.write("-- This file contains seed data for sec_* and pdat_* tables\n")
        f.write("-- Generated from dump_mde_20200411_2343.dbb\n\n")

        f.write("SET statement_timeout = 0;\n")
        f.write("SET lock_timeout = 0;\n")
        f.write("SET client_encoding = 'UTF8';\n")
        f.write("SET standard_conforming_strings = on;\n\n")

        # Write data
        f.write("-- =============================================\n")
        f.write("-- DATA\n")
        f.write("-- =============================================\n\n")
        for data in data_statements:
            f.write(data + "\n")

    print(f"  Load file written successfully")


def main():
    dump_file = '/Users/denglish/gitDevelopment/BB/genesis/docker/mde/db/sql/dump_mde_20200411_2343.dbb'
    init_file = '/Users/denglish/gitDevelopment/github/davealexenglish/magnifimind-crm/db/init_manifimind_crm.sql'
    load_file = '/Users/denglish/gitDevelopment/github/davealexenglish/magnifimind-crm/db/load_manifimind_crm.sql'

    # Extract
    schemas, sequences, sequence_ownerships, constraints, data_statements = extract_schemas_and_data(dump_file)

    # Write files
    write_init_sql(schemas, sequences, sequence_ownerships, constraints, init_file)
    write_load_sql(data_statements, load_file)

    print("\n✓ Extraction complete!")
    print(f"  Schema file: {init_file}")
    print(f"  Data file: {load_file}")


if __name__ == '__main__':
    main()
