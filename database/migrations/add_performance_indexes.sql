-- Performance indexes for existing databases
-- Run once against ef_matchday. Ignore "Duplicate key name" if index already exists.
USE ef_matchday;

CREATE INDEX idx_matches_tournament_round ON matches (tournament_id, round);
CREATE INDEX idx_matches_next_match ON matches (next_match_id);
CREATE INDEX idx_matches_players ON matches (player_1_id, player_2_id);

CREATE INDEX idx_tournaments_code_status ON tournaments (tournament_code, status);
CREATE INDEX idx_tournaments_status_created ON tournaments (status, created_at);

CREATE INDEX idx_notifications_user_read_created ON notifications (user_id, is_read, created_at);
