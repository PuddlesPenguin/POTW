-- An admin can intentionally unarchive an expired problem. Keep the cleanup
-- task from immediately changing that explicit choice back to archived.
ALTER TABLE problems ADD COLUMN IF NOT EXISTS archive_override boolean NOT NULL DEFAULT false;
