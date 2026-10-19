import jwt from 'jsonwebtoken';
import { getPool } from '../config/db.js';
import { asyncHandler } from './asyncHandler.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return res.status(401).json({ success: false, message: 'Authentication required.' });
  let payload;
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT secret is not configured');
    payload = jwt.verify(match[1], process.env.JWT_SECRET);
    if (!payload.sub || !Number.isSafeInteger(Number(payload.sub))) throw new Error('Invalid token');
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
  const [rows] = await getPool().execute('SELECT user_id, role FROM USERS WHERE user_id = ?', [Number(payload.sub)]);
  if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  req.user = { id: rows[0].user_id, role: rows[0].role };
  return next();
});

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Administrator access required.' });
  }
  return next();
}
