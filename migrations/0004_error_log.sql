-- The app's unhandled errors (at most 200 a day), for the owner and Claude through Dozokit Apps.
CREATE TABLE error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  route TEXT NOT NULL,
  message TEXT NOT NULL
);
CREATE INDEX error_log_at ON error_log(at);
