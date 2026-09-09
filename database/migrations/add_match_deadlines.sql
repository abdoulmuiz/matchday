-- Match time limit / deadline / forfeit support
USE ef_matchday;

ALTER TABLE matches
  ADD COLUMN match_deadline DATETIME NULL AFTER status,
  ADD COLUMN deadline_notified BOOLEAN DEFAULT FALSE AFTER match_deadline,
  ADD COLUMN is_forfeit BOOLEAN DEFAULT FALSE AFTER verification_status;

ALTER TABLE matches
  ADD INDEX idx_matches_deadline (match_deadline, status, deadline_notified);

ALTER TABLE notifications
  MODIFY COLUMN type ENUM(
    'tournament_joined',
    'match_assigned',
    'result_submitted',
    'match_won',
    'match_lost',
    'advanced_round',
    'mismatch_flagged',
    'tournament_started',
    'tournament_closing_soon',
    'score_manually_edited',
    'match_deadline_reached'
  ) NOT NULL;
