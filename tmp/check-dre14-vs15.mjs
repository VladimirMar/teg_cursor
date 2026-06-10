import pg from 'pg'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const idx = line.indexOf('=')
  return [line.slice(0, idx), line.slice(idx + 1)]
}))

const pool = new pg.Pool({
  host: env.PGHOST,
  port: Number(env.PGPORT),
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
})

for (const dre of [14, 15]) {
  const r = await pool.query(`
    SELECT COUNT(*)::int AS total,
           SUM(CASE WHEN nc_pres<>0 OR cad<>0 OR ac_nc<>0 OR ac_cad<>0 OR cont_nc<>0 OR cont_cad<>0 OR km<>0 THEN 1 ELSE 0 END)::int AS com_valor,
           SUM(nc_pres)::int AS nc_pres
    FROM apuracao_servicos
    WHERE mes_ano='04/2026' AND dre_codigo=$1 AND tipo_pessoa='PJ' AND revisao=0 AND data_referencia='2026-04-01'
  `, [dre])
  const af = await pool.query(`SELECT situacao FROM apuracao_financeira WHERE mes_ano='04/2026' AND dre_codigo=$1 AND tipo_pessoa='PJ' AND revisao=0`, [dre])
  console.log('DRE', dre, r.rows[0], 'situacao', af.rows[0]?.situacao)
}

await pool.end()
