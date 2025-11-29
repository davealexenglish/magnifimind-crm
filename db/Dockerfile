# PostgreSQL with custom initialization scripts
FROM postgres:15-alpine

# Copy initialization scripts
COPY init_manifimind_crm.sql /docker-entrypoint-initdb.d/01-init.sql
COPY load_manifimind_crm.sql /docker-entrypoint-initdb.d/02-load.sql
COPY truncate_pdat_passwd.sql /docker-entrypoint-initdb.d/03-truncate.sql

# Set permissions
RUN chmod 644 /docker-entrypoint-initdb.d/*.sql

# Expose PostgreSQL port
EXPOSE 5432

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
    CMD pg_isready -U ${POSTGRES_USER:-postgres} || exit 1
