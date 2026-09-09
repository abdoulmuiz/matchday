-- Migration: Add user_code column to users table
-- Run this on existing databases to add the user_code column

USE ef_matchday;

-- Add the user_code column
ALTER TABLE users ADD COLUMN user_code VARCHAR(11) UNIQUE NOT NULL AFTER profile_completed;

-- Add index for user_code
ALTER TABLE users ADD INDEX idx_user_code (user_code);
