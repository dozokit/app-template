-- Emails sent each day (UTC), so the Dozokit Apps builder can show them against Resend's 100 a day.
CREATE TABLE email_count (
  day TEXT PRIMARY KEY,
  n INTEGER NOT NULL
);
