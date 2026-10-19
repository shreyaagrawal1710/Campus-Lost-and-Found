import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { withTransaction } from '../services/transaction.js';
import { dateValue, HttpError, objectBody, optionalId, passwordValue, positiveId, requiredText } from '../validators/input.js';

const router = Router();
const PUBLIC_ITEM_FIELDS = `item_id, item_name, report_type, status, description, item_date,
  category_id, category_name, location_id, location_name, reporter_id, reporter_name`;
const ITEM_SELECT = `SELECT ${PUBLIC_ITEM_FIELDS} FROM v_item_public`;
const toUser = (row) => ({ id: row.user_id, name: row.name, email: row.email, role: row.role });

function issueToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new HttpError(500, 'JWT_SECRET must contain at least 32 characters.');
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: String(user.user_id), expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

function publicUser(row) { return { token: issueToken(row), user: toUser(row) }; }

// Authentication
router.post('/auth/register', asyncHandler(async (req, res) => {
  const body = objectBody(req.body);
  const name = requiredText(body.name, 'Name', 120);
  const email = requiredText(body.email, 'Email', 254).toLowerCase();
  const password = passwordValue(body.password, 6);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  const passwordHash = await bcrypt.hash(password, 12);
  const pool = getPool();
  const [result] = await pool.execute(
    `INSERT INTO USERS (name, email, password_hash, role) VALUES (?, ?, ?, 'STUDENT')`,
    [name, email, passwordHash],
  );
  const [rows] = await pool.execute('SELECT user_id, name, email, role FROM USERS WHERE user_id = ?', [result.insertId]);
  res.status(201).json({ success: true, data: { user: toUser(rows[0]) } });
}));

router.post('/auth/login', asyncHandler(async (req, res) => {
  const body = objectBody(req.body);
  const email = requiredText(body.email, 'Email', 254).toLowerCase();
  const password = passwordValue(body.password, 1);
  const [rows] = await getPool().execute('SELECT user_id, name, email, role, password_hash FROM USERS WHERE email = ?', [email]);
  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) throw new HttpError(401, 'Email or password is incorrect.');
  res.json({ success: true, data: publicUser(row) });
}));

const protectedRouter = Router();
protectedRouter.use(['/categories', '/locations', '/items', '/my', '/admin'], requireAuth);

// Catalog
protectedRouter.get('/categories', asyncHandler(async (req, res) => {
  const [rows] = await getPool().execute('SELECT category_id, category_name FROM ITEM_CATEGORIES ORDER BY category_name');
  res.json({ success: true, data: rows });
}));

protectedRouter.get('/locations', asyncHandler(async (req, res) => {
  const [rows] = await getPool().execute('SELECT location_id, location_name FROM LOCATIONS ORDER BY location_name');
  res.json({ success: true, data: rows });
}));

// Item browse/create/detail
protectedRouter.get('/items', asyncHandler(async (req, res) => {
  const { q = '', report_type: type, category_id: category, location_id: location, date_from: from, date_to: to, status } = req.query;
  if (typeof q !== 'string' || q.length > 200) throw new HttpError(400, 'Search text must be at most 200 characters.');
  if (type && !['LOST', 'FOUND'].includes(type)) throw new HttpError(400, 'report_type must be LOST or FOUND.');
  if (status && !['OPEN', 'CLAIM_PENDING', 'RETURNED', 'CLOSED'].includes(status)) throw new HttpError(400, 'Invalid item status.');
  const categoryId = optionalId(category, 'category_id');
  const locationId = optionalId(location, 'location_id');
  const fromDate = from ? dateValue(from, 'date_from') : null;
  const toDate = to ? dateValue(to, 'date_to') : null;
  if (fromDate && toDate && fromDate > toDate) throw new HttpError(400, 'date_from must be on or before date_to.');
  const clauses = [];
  const params = [];
  if (q.trim()) {
    const search = q.trim().replace(/[\\%_]/g, '\\$&');
    clauses.push('(item_name LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (type) { clauses.push('report_type = ?'); params.push(type); }
  if (categoryId) { clauses.push('category_id = ?'); params.push(categoryId); }
  if (locationId) { clauses.push('location_id = ?'); params.push(locationId); }
  if (fromDate) { clauses.push('item_date >= ?'); params.push(fromDate); }
  if (toDate) { clauses.push('item_date <= ?'); params.push(toDate); }
  if (status) { clauses.push('status = ?'); params.push(status); }
  const sql = `${ITEM_SELECT}${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY item_date DESC, item_id DESC`;
  const [rows] = await getPool().execute(sql, params);
  res.json({ success: true, data: rows });
}));

protectedRouter.post('/items', asyncHandler(async (req, res) => {
  const body = objectBody(req.body);
  const itemName = requiredText(body.item_name, 'Item name', 160);
  const description = requiredText(body.description, 'Description', 10000);
  const categoryId = positiveId(body.category_id, 'category_id');
  const locationId = positiveId(body.location_id, 'location_id');
  const itemDate = dateValue(body.item_date, 'item_date');
  if (itemDate > new Date().toISOString().slice(0, 10)) throw new HttpError(400, 'item_date cannot be in the future.');
  if (!['LOST', 'FOUND'].includes(body.report_type)) throw new HttpError(400, 'report_type must be LOST or FOUND.');
  const [result] = await getPool().execute(
    `INSERT INTO ITEMS (item_name, report_type, description, item_date, category_id, location_id, reporter_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
    [itemName, body.report_type, description, itemDate, categoryId, locationId, req.user.id],
  );
  const [rows] = await getPool().execute(`${ITEM_SELECT} WHERE item_id = ?`, [result.insertId]);
  res.status(201).json({ success: true, data: rows[0] });
}));

protectedRouter.get('/items/:id', asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id, 'item ID');
  const [rows] = await getPool().execute(`${ITEM_SELECT} WHERE item_id = ?`, [id]);
  if (!rows.length) throw new HttpError(404, 'Item not found.');
  res.json({ success: true, data: rows[0] });
}));

// Claims
protectedRouter.post('/items/:id/claims', asyncHandler(async (req, res) => {
  const itemId = positiveId(req.params.id, 'item ID');
  const body = objectBody(req.body);
  const privateDescription = requiredText(body.private_description, 'Private description', 10000, 10);
  await withTransaction(req.user.id, async (connection) => {
    const [items] = await connection.execute('SELECT item_id, reporter_id, report_type, status FROM ITEMS WHERE item_id = ? FOR UPDATE', [itemId]);
    const item = items[0];
    if (!item) throw new HttpError(404, 'Item not found.');
    if (item.report_type !== 'FOUND' || item.status !== 'OPEN') throw new HttpError(409, 'Only open found items can be claimed.');
    if (item.reporter_id === req.user.id) throw new HttpError(403, 'You cannot claim your own found-item report.');
    await connection.execute('INSERT INTO CLAIMS (item_id, claimant_id, private_description) VALUES (?, ?, ?)', [itemId, req.user.id, privateDescription]);
  });
  res.status(201).json({ success: true, data: { message: 'Claim submitted.' } });
}));

protectedRouter.get('/my/items', asyncHandler(async (req, res) => {
  const [rows] = await getPool().execute(`${ITEM_SELECT} WHERE reporter_id = ? ORDER BY item_date DESC, item_id DESC`, [req.user.id]);
  res.json({ success: true, data: rows });
}));

protectedRouter.get('/my/claims', asyncHandler(async (req, res) => {
  const [rows] = await getPool().execute(
    `SELECT claim_id, item_id, item_name, item_status, status, created_at, admin_remarks
     FROM v_claim_student WHERE claimant_id = ? ORDER BY created_at DESC, claim_id DESC`, [req.user.id],
  );
  res.json({ success: true, data: rows });
}));

// Admin routes: role authorization is applied as one server-side boundary.
const admin = Router();
admin.use(requireAdmin);

admin.get('/stats', asyncHandler(async (req, res) => {
  const [rows] = await getPool().execute(
    `SELECT
       (SELECT COUNT(*) FROM ITEMS) AS total_items,
       (SELECT COUNT(*) FROM ITEMS WHERE status = 'OPEN') AS open_items,
       (SELECT COUNT(*) FROM CLAIMS WHERE status = 'PENDING') AS pending_claims,
       (SELECT COUNT(*) FROM ITEMS WHERE status = 'RETURNED') AS returned_items,
       (SELECT COUNT(*) FROM ITEMS i WHERE i.report_type = 'FOUND' AND i.status = 'OPEN'
          AND NOT EXISTS (SELECT 1 FROM CLAIMS c WHERE c.item_id = i.item_id AND c.status = 'APPROVED')) AS unclaimed_found`,
  );
  res.json({ success: true, data: rows[0] });
}));

admin.get('/claims', asyncHandler(async (req, res) => {
  const status = req.query.status;
  if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) throw new HttpError(400, 'Invalid claim status.');
  const [rows] = await getPool().execute(
    `SELECT claim_id, item_id, item_name, category_name, location_name, claimant_name,
            claimant_email, private_description, status, created_at
     FROM v_claim_admin_review${status ? ' WHERE status = ?' : ''} ORDER BY created_at DESC, claim_id DESC`,
    status ? [status] : [],
  );
  res.json({ success: true, data: rows });
}));

admin.patch('/claims/:id', asyncHandler(async (req, res) => {
  const claimId = positiveId(req.params.id, 'claim ID');
  const body = objectBody(req.body);
  if (!['APPROVED', 'REJECTED'].includes(body.status)) throw new HttpError(400, 'status must be APPROVED or REJECTED.');
  const remarks = body.remarks === undefined ? '' : requiredText(body.remarks, 'Remarks', 1000, 0);
  await withTransaction(req.user.id, async (connection) => {
    const [claimRefs] = await connection.execute('SELECT item_id FROM CLAIMS WHERE claim_id = ?', [claimId]);
    if (!claimRefs.length) throw new HttpError(404, 'Claim not found.');
    const itemId = claimRefs[0].item_id;
    const [items] = await connection.execute('SELECT item_id, report_type, status FROM ITEMS WHERE item_id = ? FOR UPDATE', [itemId]);
    const [claims] = await connection.execute('SELECT item_id, status FROM CLAIMS WHERE claim_id = ? FOR UPDATE', [claimId]);
    const target = claims[0];
    if (!target) throw new HttpError(404, 'Claim not found.');
    const item = items[0];
    if (target.status !== 'PENDING') throw new HttpError(409, 'This claim is no longer pending review.');
    if (body.status === 'APPROVED') {
      if (!item || item.report_type !== 'FOUND' || item.status !== 'OPEN') throw new HttpError(409, 'This item is no longer eligible for approval.');
      const [approved] = await connection.execute('SELECT claim_id FROM CLAIMS WHERE item_id = ? AND status = \'APPROVED\' FOR UPDATE', [itemId]);
      if (approved.length) throw new HttpError(409, 'Another claim has already been approved for this item.');
      await connection.execute(
        `UPDATE CLAIMS SET status = 'APPROVED', admin_remarks = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP(3) WHERE claim_id = ?`,
        [remarks || null, req.user.id, claimId],
      );
      const competitionRemark = 'Rejected because another claim for this item was approved.';
      await connection.execute(
        `UPDATE CLAIMS SET status = 'REJECTED', admin_remarks = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP(3)
         WHERE item_id = ? AND claim_id <> ? AND status = 'PENDING'`,
        [competitionRemark, req.user.id, itemId, claimId],
      );
      await connection.execute(`UPDATE ITEMS SET status = 'CLAIM_PENDING' WHERE item_id = ?`, [itemId]);
    } else {
      if (!item || item.status !== 'OPEN') throw new HttpError(409, 'This item is no longer open for claim review.');
      await connection.execute(
        `UPDATE CLAIMS SET status = 'REJECTED', admin_remarks = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP(3) WHERE claim_id = ?`,
        [remarks || null, req.user.id, claimId],
      );
    }
  });
  res.json({ success: true, data: { message: `Claim ${body.status.toLowerCase()}.` } });
}));

admin.post('/items/:id/return', asyncHandler(async (req, res) => {
  const itemId = positiveId(req.params.id, 'item ID');
  const body = objectBody(req.body);
  const remarks = body.remarks === undefined ? '' : requiredText(body.remarks, 'Remarks', 1000, 0);
  await withTransaction(req.user.id, async (connection) => {
    const [items] = await connection.execute('SELECT item_id, status FROM ITEMS WHERE item_id = ? FOR UPDATE', [itemId]);
    const item = items[0];
    if (!item) throw new HttpError(404, 'Item not found.');
    if (item.status !== 'CLAIM_PENDING') throw new HttpError(409, 'Only an approved claim awaiting handover can be returned.');
    const [claims] = await connection.execute('SELECT claim_id FROM CLAIMS WHERE item_id = ? AND status = \'APPROVED\' FOR UPDATE', [itemId]);
    if (!claims.length) throw new HttpError(409, 'No approved claim exists for this item.');
    if (remarks) await connection.execute('UPDATE CLAIMS SET admin_remarks = CONCAT_WS(CHAR(10), NULLIF(admin_remarks, \'\'), ?) WHERE claim_id = ?', [`Handover: ${remarks}`, claims[0].claim_id]);
    await connection.execute(`UPDATE ITEMS SET status = 'RETURNED' WHERE item_id = ?`, [itemId]);
  });
  res.json({ success: true, data: { message: 'Return recorded.' } });
}));

protectedRouter.use('/admin', admin);
router.use(protectedRouter);
export default router;
