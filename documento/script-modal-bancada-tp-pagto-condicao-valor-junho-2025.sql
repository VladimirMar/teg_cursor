-- Previa de carga para modal_bancada_condicao_tipo_pgto_valor.
-- Origem considerada: tabelas da imagem para TEG REGULAR, veiculo Acessivel e TEG ESPECIAL.
-- Vigencia assumida para a chave data: 2025-06-01.
-- Este arquivo NAO foi executado automaticamente.

-- MAPEAMENTO EXPLICITO DAS CONDICOES QUE RECEBERAO VALOR
--
-- TEG REGULAR / Convencionalll / Fixo
--   - condicao 'Ate 15 alunos' -> 0,00
--   - condicao '16 alunos'     -> 7.492,52
--   - condicao '17 em diante'  -> 7.492,52
--
-- TEG REGULAR / Convencionalll / Per capita
--   - condicao 'Ate 15 alunos' -> 385,23
--   - condicao '16 alunos'     -> 0,00
--   - condicao '17 em diante'  -> 385,23
--
-- TEG REGULAR / Acessível / Fixo
--   - condicao '1 aluno'      -> 0,00
--   - condicao '2 alunos'     -> 7.492,52
--   - condicao '3 em diante'  -> 7.492,52
--
-- TEG REGULAR / Acessível / Per capita
--   - condicao '1 aluno'      -> 2.043,65
--   - condicao '2 alunos'     -> 0,00
--   - condicao '3 em diante'  -> 2.043,65
--
-- TEG ESPECIAL / Convencionalll / Fixo
--   - condicao 'Fixo Esp'        -> 11.465,63
--
-- TEG ESPECIAL / Convencionalll / Per capita
--   - condicao 'Per Cap Regular' -> 385,23
--
-- TEG ESPECIAL / Acessível / Fixo
--   - condicao 'Fixo Esp'        -> 11.465,63
--
-- TEG ESPECIAL / Acessível / Per capita
--   - condicao 'Per Cap Acessi'  -> 2.043,65
--
-- TEG CRECHE / Crecheeee / Fixo
--   - condicao 'Ate 9 alunos'    -> 0,00
--   - condicao '10 alunos'       -> 7.492,52
--   - condicao '11 em diante'    -> 7.492,52
--
-- TEG CRECHE / Crecheeee / Per capita
--   - condicao 'Ate 9 alunos'    -> 621,14
--   - condicao '10 alunos'       -> 0,00
--   - condicao '11 em diante'    -> 621,14

-- 1. Conferencia previa do mapeamento das associacoes pai.
WITH parametros AS (
  SELECT DATE '2025-06-01' AS vigencia_data
), carga(descricao_modalidade, descricao_tipo_bancada, descricao_tipo_pgto, descricao_condicao, valor) AS (
  VALUES
    ('TEG REGULAR', 'Convencionalll', 'Fixo',       'Ate 15 alunos', 0.00::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Fixo',       '16 alunos',     7492.52::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Fixo',       '17 em diante',  7492.52::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Per capita', 'Ate 15 alunos', 385.23::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Per capita', '16 alunos',     0.00::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Per capita', '17 em diante',  385.23::numeric(14,2)),

    ('TEG REGULAR', 'Acessível',      'Fixo',       '1 aluno',       0.00::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Fixo',       '2 alunos',      7492.52::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Fixo',       '3 em diante',   7492.52::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Per capita', '1 aluno',       2043.65::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Per capita', '2 alunos',      0.00::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Per capita', '3 em diante',   2043.65::numeric(14,2)),

    ('TEG ESPECIAL', 'Convencionalll', 'Fixo',       'Fixo Esp',        11465.63::numeric(14,2)),
    ('TEG ESPECIAL', 'Convencionalll', 'Per capita', 'Per Cap Regular',   385.23::numeric(14,2)),
    ('TEG ESPECIAL', 'Acessível',      'Fixo',       'Fixo Esp',        11465.63::numeric(14,2)),
    ('TEG ESPECIAL', 'Acessível',      'Per capita', 'Per Cap Acessi',  2043.65::numeric(14,2)),

    ('TEG CRECHE',   'Crecheeee',      'Fixo',       'Ate 9 alunos',    0.00::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Fixo',       '10 alunos',       7492.52::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Fixo',       '11 em diante',    7492.52::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Per capita', 'Ate 9 alunos',    621.14::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Per capita', '10 alunos',       0.00::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Per capita', '11 em diante',    621.14::numeric(14,2))
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


-- 2. Efetivacao da carga.
-- Remova o comentario deste bloco somente apos validar o SELECT acima.
/*
BEGIN;

WITH parametros AS (
  SELECT DATE '2025-06-01' AS vigencia_data
), carga(descricao_modalidade, descricao_tipo_bancada, descricao_tipo_pgto, descricao_condicao, valor) AS (
  VALUES
    ('TEG REGULAR', 'Convencionalll', 'Fixo',       'Ate 15 alunos', 0.00::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Fixo',       '16 alunos',     7492.52::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Fixo',       '17 em diante',  7492.52::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Per capita', 'Ate 15 alunos', 385.23::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Per capita', '16 alunos',     0.00::numeric(14,2)),
    ('TEG REGULAR', 'Convencionalll', 'Per capita', '17 em diante',  385.23::numeric(14,2)),

    ('TEG REGULAR', 'Acessível',      'Fixo',       '1 aluno',       0.00::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Fixo',       '2 alunos',      7492.52::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Fixo',       '3 em diante',   7492.52::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Per capita', '1 aluno',       2043.65::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Per capita', '2 alunos',      0.00::numeric(14,2)),
    ('TEG REGULAR', 'Acessível',      'Per capita', '3 em diante',   2043.65::numeric(14,2)),

    ('TEG ESPECIAL', 'Convencionalll', 'Fixo',       'Fixo Esp',        11465.63::numeric(14,2)),
    ('TEG ESPECIAL', 'Convencionalll', 'Per capita', 'Per Cap Regular',   385.23::numeric(14,2)),
    ('TEG ESPECIAL', 'Acessível',      'Fixo',       'Fixo Esp',        11465.63::numeric(14,2)),
    ('TEG ESPECIAL', 'Acessível',      'Per capita', 'Per Cap Acessi',  2043.65::numeric(14,2)),

    ('TEG CRECHE',   'Crecheeee',      'Fixo',       'Ate 9 alunos',    0.00::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Fixo',       '10 alunos',       7492.52::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Fixo',       '11 em diante',    7492.52::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Per capita', 'Ate 9 alunos',    621.14::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Per capita', '10 alunos',       0.00::numeric(14,2)),
    ('TEG CRECHE',   'Crecheeee',      'Per capita', '11 em diante',    621.14::numeric(14,2))
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

COMMIT;
*/