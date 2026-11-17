-- Security hardening: expire legacy sessions instead of retaining bearer tokens in storage.
DELETE FROM sessions;
ALTER TABLE sessions ADD COLUMN created INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN agent TEXT NOT NULL DEFAULT '';
CREATE INDEX sessions_expiry ON sessions(expires);
CREATE TABLE security_events(id TEXT PRIMARY KEY NOT NULL,event TEXT NOT NULL,actor TEXT NOT NULL,created TEXT NOT NULL);
ALTER TABLE leads ADD COLUMN stage TEXT NOT NULL DEFAULT 'new';
ALTER TABLE leads ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN updated TEXT NOT NULL DEFAULT '';
