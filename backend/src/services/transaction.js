import { getPool } from '../config/db.js';

export async function withTransaction(actorId, work) {
  const connection = await getPool().getConnection();
  let reusable = true;
  try {
    await connection.beginTransaction();
    await connection.query('SET @app_actor_user_id = ?', [actorId ?? null]);
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch { reusable = false; }
    throw error;
  } finally {
    try {
      await connection.query('SET @app_actor_user_id = NULL');
    } catch {
      reusable = false;
    }
    if (reusable) connection.release();
    else connection.destroy();
  }
}
