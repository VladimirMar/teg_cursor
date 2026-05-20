import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '12345', database: 'teg_financ' });
const monthStart = '2026-04-01';
const monthEnd = '2026-04-30';
const query = `SELECT
  os.codigo::text AS codigo,
  COALESCE(BTRIM(os.os_concat), '') AS os_concat,
  COALESCE(BTRIM(os.termo_adesao), '') AS termo_adesao,
  COALESCE(BTRIM(os.num_os), '') AS num_os,
  COALESCE(BTRIM(os.revisao), '') AS revisao,
  COALESCE(BTRIM(os.dre_codigo), '') AS dre_codigo,
  COALESCE(BTRIM(os.dre_descricao), '') AS dre_descricao,
  COALESCE(BTRIM(os.modalidade_descricao), '') AS modalidade_descricao,
  COALESCE(BTRIM((SELECT cr.tipo_pessoa FROM credenciada cr WHERE cr.codigo = (SELECT credenciada_codigo FROM termo WHERE codigo = os.termo_codigo))), '') AS tipo_pessoa,
  COALESCE(BTRIM((SELECT cr.cnpj_cpf FROM credenciada cr WHERE cr.codigo = (SELECT credenciada_codigo FROM termo WHERE codigo = os.termo_codigo))), '') AS cnpj_cpf,
  COALESCE(os.vigencia_os, os.data_emissao, os.data_inclusao::date)::text AS active_start,
  COALESCE(
    os.data_encerramento,
    os.data_eol,
    CASE
      WHEN UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO' THEN 'infinity'::date
      ELSE COALESCE(os.data_modificacao::date, os.data_inclusao::date, os.data_emissao, os.vigencia_os)
    END
  )::text AS active_end
FROM ordem_servico os
WHERE COALESCE(os.vigencia_os, os.data_emissao, os.data_inclusao::date) <= $2::date
  AND COALESCE(
    os.data_encerramento,
    os.data_eol,
    CASE
      WHEN UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO' THEN 'infinity'::date
      ELSE COALESCE(os.data_modificacao::date, os.data_inclusao::date, os.data_emissao, os.vigencia_os)
    END
  ) >= $1::date
  AND BTRIM(COALESCE(os.dre_codigo, '')) = $3
ORDER BY UPPER(BTRIM(COALESCE(os.termo_adesao, ''))) ASC,
         UPPER(BTRIM(COALESCE(os.num_os, ''))) ASC,
         UPPER(BTRIM(COALESCE(os.revisao, ''))) ASC,
         os.codigo ASC`;
const result = await pool.query(query, [monthStart, monthEnd, 'BT']);
const filtered = result.rows.filter((row) => String(row.tipo_pessoa).trim().toUpperCase() === 'PJ' && String(row.os_concat).trim() === '2025/0001815-001D');
console.log(JSON.stringify(filtered, null, 2));
await pool.end();
