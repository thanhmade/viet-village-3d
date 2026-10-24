CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL, display_name text NOT NULL,
 password_hash text, email_verified boolean NOT NULL DEFAULT false,
 role text NOT NULL DEFAULT 'player' CHECK (role IN ('player','teacher','admin')),
 disabled boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users(lower(email));
CREATE TABLE IF NOT EXISTS auth_identities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK (provider IN ('google')), provider_subject text NOT NULL,
 UNIQUE(provider, provider_subject)
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS characters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name text NOT NULL, level integer NOT NULL DEFAULT 1 CHECK(level>=1), exp bigint NOT NULL DEFAULT 0 CHECK(exp>=0),
 map_id text NOT NULL DEFAULT 'lang-viet', x double precision NOT NULL DEFAULT 0,
 y double precision NOT NULL DEFAULT 0, z double precision NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id bigserial PRIMARY KEY, actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
