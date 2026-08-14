/*
# Store CheapDataHub API key as a server-only secret

## Overview
Creates a `api_secrets` table to store the CheapDataHub API key.
RLS is enabled with NO policies for anon/authenticated, so the frontend
can never read it. The edge function uses the service role key which
bypasses RLS to read the key at runtime.

## New Table
- `api_secrets` (key_name text PK, key_value text, created_at timestamptz)

## Security
- RLS enabled, NO policies -> frontend cannot read or write.
- Only the service role (used by edge functions) can access.
*/

CREATE TABLE IF NOT EXISTS api_secrets (
  key_name text PRIMARY KEY,
  key_value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE api_secrets ENABLE ROW LEVEL SECURITY;

-- Insert the CheapDataHub API key
INSERT INTO api_secrets (key_name, key_value)
VALUES ('CDH_API_KEY', '7c9445ac5b5dc176f8392f5f26b095c5d96ce88a')
ON CONFLICT (key_name) DO UPDATE SET key_value = EXCLUDED.key_value;