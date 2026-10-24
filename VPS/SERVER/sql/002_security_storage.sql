CREATE TABLE IF NOT EXISTS auth_tokens (id bigserial PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash text NOT NULL UNIQUE,purpose text NOT NULL CHECK(purpose IN ('verify','reset')),expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS auth_tokens_expiry_idx ON auth_tokens(expires_at);
CREATE TABLE IF NOT EXISTS uploads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,object_key text NOT NULL UNIQUE,mime_type text NOT NULL,declared_size bigint NOT NULL CHECK(declared_size>0),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS uploads_user_idx ON uploads(user_id);
