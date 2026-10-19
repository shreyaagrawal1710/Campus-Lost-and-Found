USE campus_lost_found;
DROP TRIGGER IF EXISTS trg_items_status_history;
DROP TRIGGER IF EXISTS trg_claims_review_metadata_insert;
DROP TRIGGER IF EXISTS trg_claims_review_metadata_update;
DELIMITER $$
CREATE TRIGGER trg_claims_review_metadata_insert
BEFORE INSERT ON CLAIMS
FOR EACH ROW
BEGIN
  IF (NEW.status = 'PENDING' AND NEW.reviewed_by IS NOT NULL)
     OR (NEW.status IN ('APPROVED','REJECTED') AND NEW.reviewed_by IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'reviewed_by must be NULL for pending claims and set for reviewed claims';
  END IF;
END$$

CREATE TRIGGER trg_claims_review_metadata_update
BEFORE UPDATE ON CLAIMS
FOR EACH ROW
BEGIN
  IF (NEW.status = 'PENDING' AND NEW.reviewed_by IS NOT NULL)
     OR (NEW.status IN ('APPROVED','REJECTED') AND NEW.reviewed_by IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'reviewed_by must be NULL for pending claims and set for reviewed claims';
  END IF;
END$$

CREATE TRIGGER trg_items_status_history
AFTER UPDATE ON ITEMS
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO ITEM_STATUS_HISTORY (item_id, old_status, new_status, changed_at, changed_by)
    VALUES (NEW.item_id, OLD.status, NEW.status, CURRENT_TIMESTAMP(3), @app_actor_user_id);
  END IF;
END$$
DELIMITER ;
