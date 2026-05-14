import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? '5432'),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
  database: process.env.PGDATABASE ?? 'teg_financ',
})

const previewModalSql = `
WITH parametros AS (
  SELECT DATE '2025-04-01' AS vigencia_data
), carga(descricao_modalidade, descricao_tipo_bancada, descricao_tipo_pgto, descricao_condicao, valor) AS (
  VALUES
    ('TEG REGULAR',  'Convencional', 'Fixo',       'Ate 15 alunos', 0.00::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Fixo',       '16 alunos',     6811.38::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Fixo',       '17 em diante',  6811.38::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Per capita', 'Ate 15 alunos', 350.21::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Per capita', '16 alunos',     0.00::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Per capita', '17 em diante',  350.21::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Fixo',       '1 aluno',       0.00::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Fixo',       '2 alunos',      6811.38::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Fixo',       '3 em diante',   6811.38::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Per capita', '1 aluno',       2043.65::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Per capita', '2 alunos',      0.00::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Per capita', '3 em diante',   2043.65::numeric(14,2)),
    ('TEG ESPECIAL', 'Convencional', 'Fixo',       'Fixo Esp',        10423.30::numeric(14,2)),
    ('TEG ESPECIAL', 'Convencional', 'Per capita', 'Per Cap Regular',   350.21::numeric(14,2)),
    ('TEG ESPECIAL', 'Acessível',    'Fixo',       'Fixo Esp',        10423.30::numeric(14,2)),
    ('TEG ESPECIAL', 'Acessível',    'Per capita', 'Per Cap Acessi',  2043.65::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Fixo',       'Ate 9 alunos',    0.00::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Fixo',       '10 alunos',       6811.38::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Fixo',       '11 em diante',    6811.38::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Per capita', 'Ate 9 alunos',    564.67::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Per capita', '10 alunos',       0.00::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Per capita', '11 em diante',    564.67::numeric(14,2))
), carga_resolvida AS (
  SELECT
    rel.codigo AS modal_bancada_condicao_tipo_pgto_codigo,
    parametros.vigencia_data AS data,
    carga.valor,
    mod.descricao AS modalidade,
    tb.descricao AS tipo_bancada,
    tp.descricao AS tipo_pgto,
    cond.descricao AS condicao
  FROM carga
  CROSS JOIN parametros
  INNER JOIN modalidade mod
    ON BTRIM(mod.descricao) = carga.descricao_modalidade
  INNER JOIN tipo_bancada tb
    ON BTRIM(tb.descricao) = carga.descricao_tipo_bancada
  INNER JOIN tipo_pgto tp
    ON BTRIM(tp.descricao) = carga.descricao_tipo_pgto
  INNER JOIN condicao cond
    ON BTRIM(cond.descricao) = carga.descricao_condicao
  INNER JOIN modalidade_tipo_bancada mtb
    ON mtb.modalidade_codigo = mod.codigo
   AND mtb.tipo_bancada_codigo = tb.codigo
  INNER JOIN modal_bancada_condicao_tipo_pgto rel
    ON rel.modalidade_tipo_bancada_codigo = mtb.codigo
   AND rel.tipo_pgto_codigo = tp.codigo
   AND rel.condicao_codigo = cond.codigo
)
SELECT *
FROM carga_resolvida
ORDER BY modalidade, tipo_bancada, tipo_pgto, condicao;
`

const previewKmSql = `
WITH parametros AS (
  SELECT DATE '2025-04-01' AS vigencia_data
), carga(descricao_condicao, valor) AS (
  VALUES
    ('Ate 5 km', 0.00::numeric(14,2)),
    ('A partir de 6 km', 1.16::numeric(14,2))
)
SELECT
  cond.codigo AS condicao_codigo,
  cond.descricao AS condicao,
  parametros.vigencia_data AS data,
  carga.valor
FROM carga
CROSS JOIN parametros
INNER JOIN condicao cond
  ON BTRIM(cond.descricao) = carga.descricao_condicao
ORDER BY cond.qtde_ini ASC, cond.qtde_fim ASC, cond.codigo ASC;
`

const executionSql = `
BEGIN;
WITH parametros AS (
  SELECT DATE '2025-04-01' AS vigencia_data
), carga(descricao_modalidade, descricao_tipo_bancada, descricao_tipo_pgto, descricao_condicao, valor) AS (
  VALUES
    ('TEG REGULAR',  'Convencional', 'Fixo',       'Ate 15 alunos', 0.00::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Fixo',       '16 alunos',     6811.38::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Fixo',       '17 em diante',  6811.38::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Per capita', 'Ate 15 alunos', 350.21::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Per capita', '16 alunos',     0.00::numeric(14,2)),
    ('TEG REGULAR',  'Convencional', 'Per capita', '17 em diante',  350.21::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Fixo',       '1 aluno',       0.00::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Fixo',       '2 alunos',      6811.38::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Fixo',       '3 em diante',   6811.38::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Per capita', '1 aluno',       2043.65::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Per capita', '2 alunos',      0.00::numeric(14,2)),
    ('TEG REGULAR',  'Acessível',    'Per capita', '3 em diante',   2043.65::numeric(14,2)),
    ('TEG ESPECIAL', 'Convencional', 'Fixo',       'Fixo Esp',        10423.30::numeric(14,2)),
    ('TEG ESPECIAL', 'Convencional', 'Per capita', 'Per Cap Regular',   350.21::numeric(14,2)),
    ('TEG ESPECIAL', 'Acessível',    'Fixo',       'Fixo Esp',        10423.30::numeric(14,2)),
    ('TEG ESPECIAL', 'Acessível',    'Per capita', 'Per Cap Acessi',  2043.65::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Fixo',       'Ate 9 alunos',    0.00::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Fixo',       '10 alunos',       6811.38::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Fixo',       '11 em diante',    6811.38::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Per capita', 'Ate 9 alunos',    564.67::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Per capita', '10 alunos',       0.00::numeric(14,2)),
    ('TEG CRECHE',   'Creche',       'Per capita', '11 em diante',    564.67::numeric(14,2))
), carga_resolvida AS (
  SELECT
    rel.codigo AS modal_bancada_condicao_tipo_pgto_codigo,
    parametros.vigencia_data AS data,
    carga.valor
  FROM carga
  CROSS JOIN parametros
  INNER JOIN modalidade mod
    ON BTRIM(mod.descricao) = carga.descricao_modalidade
  INNER JOIN tipo_bancada tb
    ON BTRIM(tb.descricao) = carga.descricao_tipo_bancada
  INNER JOIN tipo_pgto tp
    ON BTRIM(tp.descricao) = carga.descricao_tipo_pgto
  INNER JOIN condicao cond
    ON BTRIM(cond.descricao) = carga.descricao_condicao
  INNER JOIN modalidade_tipo_bancada mtb
    ON mtb.modalidade_codigo = mod.codigo
   AND mtb.tipo_bancada_codigo = tb.codigo
  INNER JOIN modal_bancada_condicao_tipo_pgto rel
    ON rel.modalidade_tipo_bancada_codigo = mtb.codigo
   AND rel.tipo_pgto_codigo = tp.codigo
   AND rel.condicao_codigo = cond.codigo
)
INSERT INTO modal_bancada_condicao_tipo_pgto_valor (
  modal_bancada_condicao_tipo_pgto_codigo,
  data,
  valor,
  data_inclusao,
  data_modificacao
)
SELECT
  modal_bancada_condicao_tipo_pgto_codigo,
  data,
  valor,
  NOW(),
  NOW()
FROM carga_resolvida
ON CONFLICT (modal_bancada_condicao_tipo_pgto_codigo, data)
DO UPDATE SET
  valor = EXCLUDED.valor,
  data_modificacao = NOW();

WITH parametros AS (
  SELECT DATE '2025-04-01' AS vigencia_data
), carga(descricao_condicao, valor) AS (
  VALUES
    ('Ate 5 km', 0.00::numeric(14,2)),
    ('A partir de 6 km', 1.16::numeric(14,2))
)
INSERT INTO km_valor (
  condicao_codigo,
  data,
  valor,
  data_inclusao,
  data_modificacao
)
SELECT
  cond.codigo,
  parametros.vigencia_data,
  carga.valor,
  NOW(),
  NOW()
FROM carga
CROSS JOIN parametros
INNER JOIN condicao cond
  ON BTRIM(cond.descricao) = carga.descricao_condicao
ON CONFLICT (condicao_codigo, data)
DO UPDATE SET
  valor = EXCLUDED.valor,
  data_modificacao = NOW();

COMMIT;
`

const verifyModalSql = `
SELECT
  valor.codigo,
  valor.modal_bancada_condicao_tipo_pgto_codigo,
  mod.descricao AS modalidade,
  tb.descricao AS tipo_bancada,
  tp.descricao AS tipo_pgto,
  cond.descricao AS condicao,
  TO_CHAR(valor.data, 'YYYY-MM-DD') AS data,
  valor.valor
FROM modal_bancada_condicao_tipo_pgto_valor valor
INNER JOIN modal_bancada_condicao_tipo_pgto rel
  ON rel.codigo = valor.modal_bancada_condicao_tipo_pgto_codigo
INNER JOIN modalidade_tipo_bancada mtb
  ON mtb.codigo = rel.modalidade_tipo_bancada_codigo
INNER JOIN modalidade mod
  ON mod.codigo = mtb.modalidade_codigo
INNER JOIN tipo_bancada tb
  ON tb.codigo = mtb.tipo_bancada_codigo
INNER JOIN tipo_pgto tp
  ON tp.codigo = rel.tipo_pgto_codigo
INNER JOIN condicao cond
  ON cond.codigo = rel.condicao_codigo
WHERE valor.data = DATE '2025-04-01'
ORDER BY mod.descricao, tb.descricao, tp.descricao, cond.descricao, valor.codigo;
`

const verifyKmSql = `
SELECT
  km.codigo,
  km.condicao_codigo,
  cond.descricao AS condicao,
  TO_CHAR(km.data, 'YYYY-MM-DD') AS data,
  km.valor
FROM km_valor km
INNER JOIN condicao cond
  ON cond.codigo = km.condicao_codigo
WHERE km.data = DATE '2025-04-01'
ORDER BY cond.qtde_ini ASC, cond.qtde_fim ASC, km.codigo ASC;
`

const client = await pool.connect()

try {
  const previewModal = await client.query(previewModalSql)
  const previewKm = await client.query(previewKmSql)

  if (previewModal.rowCount !== 22) {
    throw new Error(`Mapeamento de Modalidade x Bancada x Pagamento x Condicao Valor retornou ${previewModal.rowCount} linhas; esperado: 22.`)
  }

  if (previewKm.rowCount !== 2) {
    throw new Error(`Mapeamento de KM_valor retornou ${previewKm.rowCount} linhas; esperado: 2.`)
  }

  console.log('Preview Modalidade x Bancada x Pagamento x Condicao Valor:')
  console.table(previewModal.rows)
  console.log('Preview KM_valor:')
  console.table(previewKm.rows)

  await client.query(executionSql)

  const verifyModal = await client.query(verifyModalSql)
  const verifyKm = await client.query(verifyKmSql)

  console.log('Carga executada com sucesso.')
  console.log('Conferencia final Modalidade x Bancada x Pagamento x Condicao Valor:')
  console.table(verifyModal.rows)
  console.log('Conferencia final KM_valor:')
  console.table(verifyKm.rows)
} catch (error) {
  try {
    await client.query('ROLLBACK')
  } catch {
    // noop
  }

  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
