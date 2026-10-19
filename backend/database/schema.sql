-- Campus Lost & Found schema (MySQL 8.0+, InnoDB, utf8mb4).
-- Run with a MySQL account permitted to create the database.
CREATE DATABASE IF NOT EXISTS campus_lost_found
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE campus_lost_found;

CREATE TABLE IF NOT EXISTS USERS (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT','ADMIN') NOT NULL DEFAULT 'STUDENT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT chk_users_name CHECK (CHAR_LENGTH(TRIM(name)) > 0),
  CONSTRAINT chk_users_email CHECK (CHAR_LENGTH(TRIM(email)) > 2)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ITEM_CATEGORIES (
  category_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(80) NOT NULL,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_item_categories_name (category_name),
  CONSTRAINT chk_item_categories_name CHECK (CHAR_LENGTH(TRIM(category_name)) > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS LOCATIONS (
  location_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  location_name VARCHAR(120) NOT NULL,
  PRIMARY KEY (location_id),
  UNIQUE KEY uq_locations_name (location_name),
  CONSTRAINT chk_locations_name CHECK (CHAR_LENGTH(TRIM(location_name)) > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ITEMS (
  item_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_name VARCHAR(160) NOT NULL,
  report_type ENUM('LOST','FOUND') NOT NULL,
  status ENUM('OPEN','CLAIM_PENDING','RETURNED','CLOSED') NOT NULL DEFAULT 'OPEN',
  description TEXT NOT NULL,
  item_date DATE NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  location_id INT UNSIGNED NOT NULL,
  reporter_id INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (item_id),
  KEY ix_items_status_type_date (status, report_type, item_date),
  KEY ix_items_category_status_date (category_id, status, item_date),
  KEY ix_items_location_status_date (location_id, status, item_date),
  KEY ix_items_reporter_date (reporter_id, item_date),
  KEY ix_items_claim_eligibility (report_type, status, item_id),
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES ITEM_CATEGORIES (category_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_items_location FOREIGN KEY (location_id) REFERENCES LOCATIONS (location_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_items_reporter FOREIGN KEY (reporter_id) REFERENCES USERS (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_items_name CHECK (CHAR_LENGTH(TRIM(item_name)) > 0),
  CONSTRAINT chk_items_description CHECK (CHAR_LENGTH(TRIM(description)) > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS CLAIMS (
  claim_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  claimant_id INT UNSIGNED NOT NULL,
  private_description TEXT NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  admin_remarks VARCHAR(1000) NULL,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  approved_marker TINYINT UNSIGNED GENERATED ALWAYS AS
    (CASE WHEN status = 'APPROVED' THEN 1 ELSE NULL END) STORED,
  PRIMARY KEY (claim_id),
  UNIQUE KEY uq_claims_one_approved_per_item (item_id, approved_marker),
  KEY ix_claims_item_status_created (item_id, status, created_at),
  KEY ix_claims_claimant_created (claimant_id, created_at),
  KEY ix_claims_status_created (status, created_at),
  CONSTRAINT fk_claims_item FOREIGN KEY (item_id) REFERENCES ITEMS (item_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_claims_claimant FOREIGN KEY (claimant_id) REFERENCES USERS (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_claims_reviewer FOREIGN KEY (reviewed_by) REFERENCES USERS (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_claims_description CHECK (CHAR_LENGTH(TRIM(private_description)) > 0),
  CONSTRAINT chk_claims_review_metadata CHECK (
    (status = 'PENDING' AND reviewed_at IS NULL)
    OR (status IN ('APPROVED','REJECTED') AND reviewed_at IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ITEM_STATUS_HISTORY (
  history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id INT UNSIGNED NOT NULL,
  old_status ENUM('OPEN','CLAIM_PENDING','RETURNED','CLOSED') NOT NULL,
  new_status ENUM('OPEN','CLAIM_PENDING','RETURNED','CLOSED') NOT NULL,
  changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  changed_by INT UNSIGNED NULL,
  PRIMARY KEY (history_id),
  KEY ix_item_status_history_item_time (item_id, changed_at),
  KEY ix_item_status_history_actor_time (changed_by, changed_at),
  CONSTRAINT fk_item_history_item FOREIGN KEY (item_id) REFERENCES ITEMS (item_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_item_history_actor FOREIGN KEY (changed_by) REFERENCES USERS (user_id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_item_history_change CHECK (old_status <> new_status)
) ENGINE=InnoDB;

-- Safe response views. Do not SELECT password_hash or private_description through general APIs.
CREATE OR REPLACE VIEW v_item_public AS
SELECT i.item_id, i.item_name, i.report_type, i.status, i.description, i.item_date,
       i.category_id, c.category_name, i.location_id, l.location_name,
       i.reporter_id, u.name AS reporter_name, i.created_at
FROM ITEMS i
JOIN ITEM_CATEGORIES c ON c.category_id = i.category_id
JOIN LOCATIONS l ON l.location_id = i.location_id
JOIN USERS u ON u.user_id = i.reporter_id;

CREATE OR REPLACE VIEW v_claim_student AS
SELECT cl.claim_id, cl.item_id, i.item_name, i.status AS item_status,
       cl.status, cl.created_at, cl.admin_remarks, cl.claimant_id
FROM CLAIMS cl JOIN ITEMS i ON i.item_id = cl.item_id;

CREATE OR REPLACE VIEW v_claim_admin_review AS
SELECT cl.claim_id, cl.item_id, i.item_name, c.category_name, l.location_name,
       u.name AS claimant_name, u.email AS claimant_email,
       cl.private_description, cl.status, cl.created_at, cl.admin_remarks
FROM CLAIMS cl
JOIN ITEMS i ON i.item_id = cl.item_id
JOIN ITEM_CATEGORIES c ON c.category_id = i.category_id
JOIN LOCATIONS l ON l.location_id = i.location_id
JOIN USERS u ON u.user_id = cl.claimant_id;
