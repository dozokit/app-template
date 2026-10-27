-- What the hourly cron last told the owner about (so it tells each thing once).
CREATE TABLE alert_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
