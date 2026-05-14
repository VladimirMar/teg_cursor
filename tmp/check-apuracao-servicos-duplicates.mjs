import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345',
  database: 'teg_financ',
})

const sql = `
  SELECT
    mes_ano,
    dre_codigo,
    ordem_servico_codigo,
    revisao,
    tipo_escola_codigo,
    tipo_pessoa,
    LENGTH(mes_ano) AS mes_ano_len,
    LENGTH(tipo_pessoa) AS tipo_pessoa_len,
    COUNT(*) AS total
  FROM apuracao_servicos
  GROUP BY mes_ano, dre_codigo, ordem_servico_codigo, revisao, tipo_escola_codigo, tipo_pessoa
  HAVING COUNT(*) > 1
  ORDER BY total DESC, mes_ano, dre_codigo, ordem_servico_codigo
  LIMIT 20
`

try {
  const result = await pool.query(sql)
  console.log(JSON.stringify(result.rows, null, 2))
} finally {
  await pool.end()
}
