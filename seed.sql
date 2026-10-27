-- Sample data for draft previews only (never live), loaded after the migrations at each draft build.
-- Keep it realistic, for every table, so previews and owner views aren't empty. INSERT OR IGNORE with
-- fixed ids, so loading it twice changes nothing. preview can sign in as these users (…@preview.test).
INSERT OR IGNORE INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES
  ('seed-sam', 'Sam', 'sam@preview.test', 1, datetime('now'), datetime('now')),
  ('seed-alex', 'Alex', 'alex@preview.test', 1, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO item (id, user_id, text, created_at) VALUES
  (1001, 'seed-sam', 'Call the supplier about the 12 chairs', datetime('now', '-3 days')),
  (1002, 'seed-sam', 'Send the March invoice', datetime('now', '-1 day')),
  (1003, 'seed-sam', 'Book the van for Saturday', datetime('now', '-2 hours')),
  (1004, 'seed-alex', 'Renew the shop insurance', datetime('now', '-5 days'));
