const { Pool } = require('pg');
(async () => {
  const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '12345',
    database: process.env.PGDATABASE || 'teg_financ',
  });
  try {
    const sql = "select pid, state, wait_event_type, wait_event, query from pg_stat_activity where datname = current_database() and usename = current_user and query not ilike '%pg_stat_activity%' order by state, pid";
    const r = await pool.query(sql);
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
})();
