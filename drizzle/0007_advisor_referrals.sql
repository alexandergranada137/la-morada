CREATE TABLE advisors (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);
ALTER TABLE leads ADD COLUMN advisor_id TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN advisor_name TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN ticket_json TEXT NOT NULL DEFAULT '';
CREATE INDEX leads_advisor_created_idx ON leads(advisor_id, created);
CREATE INDEX leads_created_idx ON leads(created);
CREATE INDEX security_events_created_idx ON security_events(created);
