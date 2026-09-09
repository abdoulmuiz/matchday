-- Admin role + account suspension
USE ef_matchday;

ALTER TABLE users
  ADD COLUMN is_admin BOOLEAN DEFAULT FALSE AFTER profile_completed,
  ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE AFTER is_admin;

ALTER TABLE users
  ADD INDEX idx_users_is_admin (is_admin),
  ADD INDEX idx_users_is_suspended (is_suspended);

-- Grant admin manually, e.g.:
-- UPDATE users SET is_admin = TRUE WHERE email = 'you@example.com';
