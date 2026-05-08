BEGIN;

INSERT INTO km_valor (
  condicao_codigo,
  data,
  valor,
  data_inclusao,
  data_modificacao
)
SELECT
  condicao.codigo,
  DATE '2026-05-01',
  0.00,
  NOW(),
  NOW()
FROM condicao
WHERE BTRIM(condicao.descricao) IN ('Ate 5 km', 'A partir de 6 km')
ON CONFLICT (condicao_codigo, data)
DO UPDATE SET
  valor = EXCLUDED.valor,
  data_modificacao = NOW();

INSERT INTO continua_valor (
  tipo_continua,
  data,
  valor,
  data_inclusao,
  data_modificacao
)
VALUES
  ('Regular', DATE '2026-05-01', 0.00, NOW(), NOW()),
  ('Cadeirante', DATE '2026-05-01', 0.00, NOW(), NOW())
ON CONFLICT (tipo_continua, data)
DO UPDATE SET
  valor = EXCLUDED.valor,
  data_modificacao = NOW();

COMMIT;

SELECT
  km_valor.codigo,
  km_valor.condicao_codigo,
  BTRIM(condicao.descricao) AS condicao_descricao,
  TO_CHAR(km_valor.data, 'YYYY-MM-DD') AS data,
  km_valor.valor
FROM km_valor
INNER JOIN condicao ON condicao.codigo = km_valor.condicao_codigo
WHERE km_valor.data = DATE '2026-05-01'
ORDER BY condicao.qtde_ini ASC, condicao.qtde_fim ASC, km_valor.codigo ASC;

SELECT
  continua_valor.codigo,
  continua_valor.tipo_continua,
  TO_CHAR(continua_valor.data, 'YYYY-MM-DD') AS data,
  continua_valor.valor
FROM continua_valor
WHERE continua_valor.data = DATE '2026-05-01'
ORDER BY CASE continua_valor.tipo_continua
  WHEN 'Regular' THEN 1
  WHEN 'Cadeirante' THEN 2
  ELSE 3
END, continua_valor.codigo ASC;