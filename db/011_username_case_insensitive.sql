-- Usernames are treated case-insensitively by login and username editing.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));
