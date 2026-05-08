BEGIN;

INSERT INTO modal_bancada_condicao_tipo_pgto (modalidade_tipo_bancada_codigo, tipo_pgto_codigo, condicao_codigo)
SELECT seed.modalidade_tipo_bancada_codigo, seed.tipo_pgto_codigo, seed.condicao_codigo
FROM (
  VALUES
    (5, 1, 6),
    (5, 1, 7),
    (5, 1, 8),
    (5, 2, 6),
    (5, 2, 7),
    (5, 2, 8),
    (7, 1, 3),
    (7, 1, 4),
    (7, 1, 5),
    (7, 2, 3),
    (7, 2, 4),
    (7, 2, 5),
    (3, 1, 9),
    (3, 2, 11),
    (4, 1, 9),
    (4, 2, 10),
    (2, 1, 16),
    (2, 1, 17),
    (2, 1, 18),
    (2, 2, 16),
    (2, 2, 17),
    (2, 2, 18)
) AS seed(modalidade_tipo_bancada_codigo, tipo_pgto_codigo, condicao_codigo)
WHERE NOT EXISTS (
  SELECT 1
  FROM modal_bancada_condicao_tipo_pgto item
  WHERE item.modalidade_tipo_bancada_codigo = seed.modalidade_tipo_bancada_codigo
    AND item.tipo_pgto_codigo = seed.tipo_pgto_codigo
    AND item.condicao_codigo = seed.condicao_codigo
);

COMMIT;