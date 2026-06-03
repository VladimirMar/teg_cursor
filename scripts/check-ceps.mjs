import pg from 'pg'
const { Pool } = pg
const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'teg_cursor',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
})
const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='ceps' ORDER BY ordinal_position`)
console.log('Columns:', r.rows.map(x => x.column_name).join(', ') || '(table not found)')

// Alter table to match expected schema
try { await pool.query(`ALTER TABLE ceps RENAME COLUMN cidade TO municipio`) } catch(e) { console.log('rename cidade:', e.message) }
try { await pool.query(`ALTER TABLE ceps ADD COLUMN IF NOT EXISTS data_inclusao timestamp`) } catch(e) { console.log('add data_inclusao:', e.message) }
try { await pool.query(`ALTER TABLE ceps ADD COLUMN IF NOT EXISTS data_modificacao timestamp`) } catch(e) { console.log('add data_modificacao:', e.message) }

const r2 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='ceps' ORDER BY ordinal_position`)
console.log('Updated columns:', r2.rows.map(x => x.column_name).join(', '))
await pool.end()
