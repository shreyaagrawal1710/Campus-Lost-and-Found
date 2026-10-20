
-- Campus Lost & Found
-- File: backend/database/queries.sql
-- Run after schema.sql, seed.sql, and view creation.

-- 1. JOIN: List items with category, location, and reporter
SELECT
    item_id,
    item_name,
    report_type,
    status,
    category_name,
    location_name,
    reporter_name,
    item_date
FROM v_item_public
ORDER BY created_at DESC;


-- 2. SUBQUERY: Find found items with no approved claim
SELECT
    i.item_id,
    i.item_name,
    i.status
FROM ITEMS AS i
WHERE i.report_type = 'FOUND'
  AND i.status IN ('OPEN', 'CLAIM_PENDING')
  AND NOT EXISTS (
      SELECT 1
      FROM CLAIMS AS c
      WHERE c.item_id = i.item_id
        AND c.status = 'APPROVED'
  )
ORDER BY i.item_date DESC;


-- 3. AGGREGATE: Count items in each category
SELECT
    c.category_id,
    c.category_name,
    COUNT(i.item_id) AS total_items
FROM ITEM_CATEGORIES AS c
LEFT JOIN ITEMS AS i
    ON i.category_id = c.category_id
GROUP BY c.category_id, c.category_name
ORDER BY total_items DESC;


-- 4. HAVING: Categories with more than one reported item
SELECT
    c.category_name,
    COUNT(i.item_id) AS total_items
FROM ITEM_CATEGORIES AS c
JOIN ITEMS AS i
    ON i.category_id = c.category_id
GROUP BY c.category_id, c.category_name
HAVING COUNT(i.item_id) > 1
ORDER BY total_items DESC;


-- 5. JOIN: Display pending claims for admin review
-- This query contains private claimant descriptions.
-- Use it only in an authorized admin context.
SELECT
    claim_id,
    item_id,
    item_name,
    category_name,
    location_name,
    claimant_name,
    status,
    created_at,
    admin_remarks
FROM v_claim_admin_review
WHERE status = 'PENDING'
ORDER BY created_at ASC;


-- 6. SUBQUERIES + AGGREGATES: Dashboard summary
SELECT
    (SELECT COUNT(*)
     FROM ITEMS) AS total_items,

    (SELECT COUNT(*)
     FROM ITEMS
     WHERE status = 'OPEN') AS open_items,

    (SELECT COUNT(*)
     FROM ITEMS
     WHERE status = 'CLAIM_PENDING') AS items_with_pending_claims,

    (SELECT COUNT(*)
     FROM ITEMS
     WHERE status = 'RETURNED') AS returned_items,

    (SELECT COUNT(*)
     FROM CLAIMS
     WHERE status = 'PENDING') AS pending_claims;


-- 7. JOIN + GROUP BY: Item counts by campus location
SELECT
    l.location_name,
    COUNT(i.item_id) AS total_items,
    SUM(CASE WHEN i.report_type = 'LOST'
             THEN 1 ELSE 0 END) AS lost_items,
    SUM(CASE WHEN i.report_type = 'FOUND'
             THEN 1 ELSE 0 END) AS found_items
FROM LOCATIONS AS l
LEFT JOIN ITEMS AS i
    ON i.location_id = l.location_id
GROUP BY l.location_id, l.location_name
ORDER BY total_items DESC;
