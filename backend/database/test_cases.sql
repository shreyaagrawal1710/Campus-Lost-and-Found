
-- Campus Lost & Found
-- File: backend/database/test_cases.sql
-- Read-only database verification tests.
-- Run after schema.sql and seed.sql.

-- TEST 1: Verify all six expected tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
      'USERS',
      'ITEM_CATEGORIES',
      'LOCATIONS',
      'ITEMS',
      'CLAIMS',
      'ITEM_STATUS_HISTORY'
  )
ORDER BY table_name;

-- Expected: 6 rows.

-- TEST 2: Find items with missing category, location,
-- or reporter references.
SELECT i.item_id, i.item_name
FROM ITEMS AS i
LEFT JOIN ITEM_CATEGORIES AS c
    ON c.category_id = i.category_id
LEFT JOIN LOCATIONS AS l
    ON l.location_id = i.location_id
LEFT JOIN USERS AS u
    ON u.user_id = i.reporter_id
WHERE c.category_id IS NULL
   OR l.location_id IS NULL
   OR u.user_id IS NULL;

-- Expected: 0 rows.

-- TEST 3: Find claims with invalid item or claimant references.
SELECT cl.claim_id
FROM CLAIMS AS cl
LEFT JOIN ITEMS AS i
    ON i.item_id = cl.item_id
LEFT JOIN USERS AS u
    ON u.user_id = cl.claimant_id
WHERE i.item_id IS NULL
   OR u.user_id IS NULL;

-- Expected: 0 rows.

-- TEST 4: Check claim review metadata.
SELECT claim_id, status, reviewed_by, reviewed_at
FROM CLAIMS
WHERE (status = 'PENDING' AND reviewed_at IS NOT NULL)
   OR (status IN ('APPROVED', 'REJECTED')
       AND reviewed_at IS NULL);

-- Expected: 0 rows.

-- TEST 5: Check that an item has no more than one
-- approved claim.
SELECT item_id, COUNT(*) AS approved_claims
FROM CLAIMS
WHERE status = 'APPROVED'
GROUP BY item_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows.

-- TEST 6: Summarize item statuses.
SELECT status, COUNT(*) AS total
FROM ITEMS
GROUP BY status
ORDER BY status;

-- Review the counts and confirm they match your test data.

-- TEST 7: Summarize claim statuses.
SELECT status, COUNT(*) AS total
FROM CLAIMS
GROUP BY status
ORDER BY status;

-- Review the counts and confirm they match your test data.

-- TEST 8: Verify that status history has no
-- identical old and new statuses.
SELECT history_id, item_id, old_status, new_status
FROM ITEM_STATUS_HISTORY
WHERE old_status = new_status;

-- Expected: 0 rows.
