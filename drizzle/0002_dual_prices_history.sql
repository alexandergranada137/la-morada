ALTER TABLE prices ADD COLUMN usd_cents integer;
CREATE TABLE price_history (id text PRIMARY KEY NOT NULL, lot_id text NOT NULL, created text NOT NULL, actor text NOT NULL, before_json text, after_json text NOT NULL);
CREATE INDEX price_history_lot_date ON price_history(lot_id,created);
