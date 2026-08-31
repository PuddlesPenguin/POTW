-- Existing accounts are trusted so this migration does not lock anyone out.
-- Accounts registered after this migration must verify their email.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT true;
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at timestamp without time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at timestamp without time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamp without time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS leaderboard_hidden boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_verification_token_idx
  ON users (email_verification_token_hash)
  WHERE email_verification_token_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_password_reset_token_idx
  ON users (password_reset_token_hash)
  WHERE password_reset_token_hash IS NOT NULL;
