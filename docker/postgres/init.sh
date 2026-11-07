#!/bin/sh
# Creates one example database per environment and applies the fictitious schema to each.
set -e
for database in qa_orders local_orders; do
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c "CREATE DATABASE $database"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" -f /docker-entrypoint-initdb.d/schema.sql.txt
done
