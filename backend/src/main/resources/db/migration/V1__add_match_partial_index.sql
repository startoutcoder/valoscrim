CREATE INDEX idx_match_status_open
    ON scrim_matches (scheduled_time)
    WHERE status = 'OPEN';