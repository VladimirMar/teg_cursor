BEGIN;

DELETE FROM condicao
WHERE descricao IN (
  'Ate 15 anos',
  '16 alunos',
  '17 em diante',
  '1 aluno',
  '2 alunos',
  '3 em diante',
  'Fixo Esp',
  'Per Cap Reg Conv',
  'Per Cap Acessi',
  'Regular',
  'Cadeirante',
  'Ate 5 km',
  'A partir de 6 km',
  'Ate 9 anos',
  '10 anos',
  '11 em diante'
);

INSERT INTO condicao (descricao, qtde_ini, qtde_fim)
VALUES
  ('Ate 15 anos', 1, 15),
  ('16 alunos', 16, 16),
  ('17 em diante', 17, 99),
  ('1 aluno', 1, 1),
  ('2 alunos', 2, 2),
  ('3 em diante', 3, 99),
  ('Fixo Esp', 1, 99),
  ('Per Cap Reg Conv', 1, 99),
  ('Per Cap Acessi', 1, 99),
  ('Regular', 1, 99),
  ('Cadeirante', 1, 99),
  ('Ate 5 km', 1, 5),
  ('A partir de 6 km', 6, 99),
  ('Ate 9 anos', 1, 9),
  ('10 anos', 10, 10),
  ('11 em diante', 11, 99);

COMMIT;