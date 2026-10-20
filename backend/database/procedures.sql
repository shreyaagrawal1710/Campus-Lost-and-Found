
-- Campus Lost & Found
-- File: procedures.sql
-- MySQL 8.0+

DELIMITER $$

CREATE PROCEDURE review_claim(
    IN p_claim_id INT UNSIGNED,
    IN p_admin_id INT UNSIGNED,
    IN p_decision VARCHAR(10),
    IN p_remarks VARCHAR(500)
)
BEGIN
    DECLARE v_item_id INT UNSIGNED;
    DECLARE v_claim_status VARCHAR(20);
    DECLARE v_item_status VARCHAR(20);
    DECLARE v_found INT DEFAULT 1;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Decision must be APPROVED or REJECTED';
    END IF;

    START TRANSACTION;

    SET v_found = 1;

    BEGIN
        DECLARE CONTINUE HANDLER FOR NOT FOUND
            SET v_found = 0;

        SELECT item_id, status
        INTO v_item_id, v_claim_status
        FROM CLAIMS
        WHERE claim_id = p_claim_id
        FOR UPDATE;
    END;

    IF v_found = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Claim not found';
    END IF;

    IF v_claim_status <> 'PENDING' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Claim has already been reviewed';
    END IF;

    SET v_found = 1;

    BEGIN
        DECLARE CONTINUE HANDLER FOR NOT FOUND
            SET v_found = 0;

        SELECT status
        INTO v_item_status
        FROM ITEMS
        WHERE item_id = v_item_id
        FOR UPDATE;
    END;

    IF v_found = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Item not found';
    END IF;

    IF v_item_status NOT IN ('OPEN', 'CLAIM_PENDING') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Item is not available for claim review';
    END IF;

    IF p_decision = 'APPROVED' THEN

        UPDATE CLAIMS
        SET status = 'REJECTED',
            admin_remarks = 'Another claim was approved',
            reviewed_by = p_admin_id,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE item_id = v_item_id
          AND claim_id <> p_claim_id
          AND status = 'PENDING';

        UPDATE CLAIMS
        SET status = 'APPROVED',
            admin_remarks = p_remarks,
            reviewed_by = p_admin_id,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE claim_id = p_claim_id;

        UPDATE ITEMS
        SET status = 'CLAIM_PENDING'
        WHERE item_id = v_item_id;

    ELSE

        UPDATE CLAIMS
        SET status = 'REJECTED',
            admin_remarks = p_remarks,
            reviewed_by = p_admin_id,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE claim_id = p_claim_id;

        IF NOT EXISTS (
            SELECT 1
            FROM CLAIMS
            WHERE item_id = v_item_id
              AND status = 'PENDING'
        ) THEN
            UPDATE ITEMS
            SET status = 'OPEN'
            WHERE item_id = v_item_id
              AND status = 'CLAIM_PENDING';
        END IF;

    END IF;

    COMMIT;
END$$

DELIMITER ;
