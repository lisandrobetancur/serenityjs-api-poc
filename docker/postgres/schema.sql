-- Fictitious schema used by the database examples. Applied by docker/postgres/init.sh and scripts/setup-local-db.ts.

CREATE TABLE IF NOT EXISTS public.orders (
    id             uuid PRIMARY KEY,
    reference      text        NOT NULL UNIQUE,
    status         text        NOT NULL,
    total          numeric(12, 2) NOT NULL,
    customer_email text        NOT NULL,
    notes          text,
    expires_at     timestamptz,
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_users (
    id       uuid PRIMARY KEY,
    email    text NOT NULL UNIQUE,
    password text NOT NULL,
    tenant   text NOT NULL
);

TRUNCATE public.orders, public.app_users;

INSERT INTO public.orders (id, reference, status, total, customer_email, notes, expires_at) VALUES
    ('00000000-0000-0000-0000-000000000001', 'ACME-0001', 'pending',   125.50, 'qa.user.01@example.test', 'Deliver to the stage door', now() + interval '7 days'),
    ('00000000-0000-0000-0000-000000000002', 'ACME-0002', 'confirmed',  80.00, 'qa.user.02@example.test', NULL,                         now() + interval '7 days'),
    ('00000000-0000-0000-0000-000000000003', 'ACME-0003', 'pending',    12.00, 'qa.user.02@example.test', NULL,                         now() + interval '7 days');

INSERT INTO public.app_users (id, email, password, tenant) VALUES
    ('00000000-0000-0000-0000-0000000000a1', 'qa.user.01@example.test', '$2a$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz012', 'AC'),
    ('00000000-0000-0000-0000-0000000000a2', 'qa.user.02@example.test', '$2a$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyz345', 'AC');
