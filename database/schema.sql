-- EF MatchDay Database Schema
-- Single schema for local and hosted MySQL.
-- Create/select the database first, then import this file:
--   Local:  mysql -u root -e "CREATE DATABASE IF NOT EXISTS ef_matchday;"
--           mysql -u root ef_matchday < database/schema.sql
--   Hosted: create DB in panel → select it in phpMyAdmin → Import this file

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  in_game_id VARCHAR(100),
  profile_picture_url VARCHAR(500),
  country VARCHAR(100),
  city VARCHAR(100),
  platform ENUM('PS', 'Xbox', 'PC', 'Mobile') DEFAULT NULL,
  profile_completed BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  user_code VARCHAR(11) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_user_code (user_code),
  INDEX idx_users_is_admin (is_admin),
  INDEX idx_users_is_suspended (is_suspended)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  player_limit INT NOT NULL,
  status ENUM('open', 'live', 'completed', 'closed') DEFAULT 'open',
  type ENUM('open', 'closed') DEFAULT 'open',
  pin VARCHAR(5) DEFAULT NULL,
  match_time_limit INT DEFAULT NULL,
  tournament_code VARCHAR(6) NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_created_by (created_by),
  INDEX idx_tournament_code (tournament_code),
  INDEX idx_tournaments_code_status (tournament_code, status),
  INDEX idx_tournaments_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tournament participants table
CREATE TABLE IF NOT EXISTS tournament_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_participant (tournament_id, user_id),
  INDEX idx_tournament_id (tournament_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT NOT NULL,
  round INT NOT NULL,
  player_1_id INT DEFAULT NULL,
  player_2_id INT DEFAULT NULL,
  player_1_score INT DEFAULT NULL,
  player_2_score INT DEFAULT NULL,
  winner_id INT DEFAULT NULL,
  next_match_id INT DEFAULT NULL,
  status ENUM('pending', 'live', 'completed') DEFAULT 'pending',
  match_deadline DATETIME DEFAULT NULL,
  deadline_notified BOOLEAN DEFAULT FALSE,
  player_1_screenshot_url VARCHAR(500) DEFAULT NULL,
  player_2_screenshot_url VARCHAR(500) DEFAULT NULL,
  player_1_reported_score VARCHAR(10) DEFAULT NULL,
  player_2_reported_score VARCHAR(10) DEFAULT NULL,
  verification_status ENUM('pending', 'auto_verified', 'mismatch', 'organizer_resolved') DEFAULT 'pending',
  is_forfeit BOOLEAN DEFAULT FALSE,
  manually_edited BOOLEAN DEFAULT FALSE,
  edited_by INT DEFAULT NULL,
  direct_input BOOLEAN DEFAULT FALSE,
  submitted_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (player_1_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (player_2_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (next_match_id) REFERENCES matches(id) ON DELETE SET NULL,
  FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tournament_id (tournament_id),
  INDEX idx_round (round),
  INDEX idx_status (status),
  INDEX idx_verification_status (verification_status),
  INDEX idx_matches_tournament_round (tournament_id, round),
  INDEX idx_matches_next_match (next_match_id),
  INDEX idx_matches_players (player_1_id, player_2_id),
  INDEX idx_matches_deadline (match_deadline, status, deadline_notified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('tournament_joined', 'match_assigned', 'result_submitted', 'match_won', 'match_lost', 'advanced_round', 'mismatch_flagged', 'tournament_started', 'tournament_closing_soon', 'score_manually_edited', 'match_deadline_reached') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_tournament_id INT DEFAULT NULL,
  related_match_id INT DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (related_match_id) REFERENCES matches(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_notifications_user_read_created (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Site settings (platform logo, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
