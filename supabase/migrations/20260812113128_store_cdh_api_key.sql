/*
  Server-side secret storage.

  IMPORTANT: never commit the real CheapDataHub API key to Git.
  Set CDH_API_KEY as a Supabase Edge Function secret instead.
*/

CREATE TABLE IF NOT EXISTS api_secrets (
  key_name text PRIMARY KEY,
  key_value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_secrets ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only service-role/server code can read this table.
