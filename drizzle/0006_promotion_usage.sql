ALTER TABLE leads ADD COLUMN promotion_id TEXT NOT NULL DEFAULT '';
CREATE INDEX leads_promotion_idx ON leads(promotion_id);
