ALTER TABLE prices ADD COLUMN reopen_confirmed integer NOT NULL DEFAULT 0;
CREATE TRIGGER protect_sold_lots BEFORE UPDATE OF status ON prices WHEN OLD.status='sold' AND NEW.status<>'sold' AND NEW.reopen_confirmed<>1 BEGIN SELECT RAISE(ABORT,'Explicit confirmation required to reopen a sold lot'); END;
