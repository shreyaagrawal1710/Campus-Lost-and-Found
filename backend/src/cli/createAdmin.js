import 'dotenv/config';
import { input, password } from '@inquirer/prompts';
import { stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import { getPool, closePool } from '../config/db.js';

async function main() {
  if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.JWT_SECRET) {
    throw new Error('Configure DB_NAME, DB_USER, and JWT_SECRET in backend/.env first.');
  }
  const name = (await input({ message: 'Administrator name:' })).trim();
  const email = (await input({ message: 'Administrator email:' })).trim().toLowerCase();
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Enter a valid name and email.');
  }
  const passwordValue = await password({ message: 'Password (hidden):', mask: '*', toggleMask: false });
  const confirmation = await password({ message: 'Confirm password (hidden):', mask: '*', toggleMask: false });
  if (passwordValue.length < 12 || passwordValue.length > 72 || Buffer.byteLength(passwordValue, 'utf8') > 72 || passwordValue !== confirmation) {
    throw new Error('Passwords must match and contain 12-72 characters (at most 72 UTF-8 bytes).');
  }

  const pool = getPool();
  const [existing] = await pool.execute('SELECT user_id, role FROM USERS WHERE email = ?', [email]);
  if (existing.length) {
    const answer = await input({ message: `This email exists as ${existing[0].role}. Type PROMOTE to set it as ADMIN and replace its password:` });
    if (answer !== 'PROMOTE') throw new Error('Admin provisioning cancelled.');
    const hash = await bcrypt.hash(passwordValue, 12);
    await pool.execute('UPDATE USERS SET name = ?, password_hash = ?, role = \'ADMIN\' WHERE user_id = ?', [name, hash, existing[0].user_id]);
  } else {
    const hash = await bcrypt.hash(passwordValue, 12);
    await pool.execute('INSERT INTO USERS (name, email, password_hash, role) VALUES (?, ?, ?, \'ADMIN\')', [name, email, hash]);
  }
  stdout.write(`Administrator ${email} provisioned.\n`);
}

main().catch((error) => {
  // Keep credentials and hashes out of command output.
  console.error(error.message);
  process.exitCode = 1;
}).finally(closePool);
