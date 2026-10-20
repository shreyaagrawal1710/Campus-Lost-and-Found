
# Campus Lost & Found — Database Documentation

## 1. Overview

The database supports a Campus Lost & Found Management System. Students can report lost or found items, search reports, and submit claims. Administrators review claims and manage the return of items.

## 2. Database Technology

- DBMS: MySQL 8.0+
- Storage engine: InnoDB
- Character set: utf8mb4

## 3. Database Tables

The database contains six main tables.

| Table | Purpose |
|---|---|
| USERS | Stores student and administrator accounts |
| ITEM_CATEGORIES | Stores item categories |
| LOCATIONS | Stores campus locations |
| ITEMS | Stores lost and found item reports |
| CLAIMS | Stores claims submitted by students |
| ITEM_STATUS_HISTORY | Records changes to item status |

## 4. Table Relationships

- One user can report many items.
- One category can be associated with many items.
- One location can be associated with many items.
- One item can have multiple claims.
- One user can submit multiple claims.
- An administrator can review multiple claims.
- Item status history records status changes and the user responsible, when available.

## 5. Status Values

### Item status

- OPEN
- CLAIM_PENDING
- RETURNED
- CLOSED

### Claim status

- PENDING
- APPROVED
- REJECTED

## 6. SQL Features

The database implementation includes or is intended to include:

- Primary keys and foreign keys
- Unique constraints and data validation
- Joins and subqueries
- Aggregate functions with GROUP BY and HAVING
- Views for item listings and claim review
- Stored procedures for claim review
- Triggers for item status history
- Indexes for common searches
- Transactions for multi-step operations

Verify that each feature is implemented in the SQL files before final submission.

## 7. Database Files

| File | Purpose |
|---|---|
| schema.sql | Creates tables, constraints, indexes, and views |
| seed.sql | Inserts development sample data |
| triggers.sql | Defines database triggers |
| queries.sql | Demonstrates SQL queries |
| procedures.sql | Defines stored procedures |
| test_cases.sql | Runs read-only integrity checks |

## 8. Setup Instructions

1. Install MySQL 8.0 or a compatible version.
2. Open MySQL Workbench or another MySQL client.
3. Run schema.sql first.
4. Run seed.sql to add sample data.
5. Run triggers.sql and procedures.sql.
6. Run queries.sql and test_cases.sql to inspect the results.

Run each script in the correct database and resolve any SQL errors before using the application.

## 9. Security Notes

- Store password hashes, never plaintext passwords.
- Keep database credentials in environment variables.
- Restrict private claim descriptions to authorized administrators and the appropriate claimant.
- Validate administrator permissions in the backend.
- Use parameterized queries in application code.

## 10. Project Contribution

Database and integration work includes schema documentation, SQL queries, sample-data verification, stored procedures, triggers, and database testing.
