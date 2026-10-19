import app from './app.js';
import { closePool } from './config/db.js';

const port = process.env.PORT === undefined ? 5000 : Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
const server = app.listen(port, () => {
  console.log(`Campus Lost & Found API listening on port ${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received; closing HTTP server.`);
  server.close(async () => {
    try { await closePool(); } finally { process.exit(0); }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
