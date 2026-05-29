const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '12345',
    database: process.env.POSTGRES_DB || 'teg_financ',
  });

  await client.connect();

  const sql = `
    WITH latest AS (
      SELECT
        m.descricao AS modalidade,
        tb.descricao AS tipo_bancada,
        tp.descricao AS tipo_pgto,
        c.descricao AS condicao,
        mbv.valor::numeric(14,2) AS valor,
        TO_CHAR(mbv.data,'YYYY-MM-DD') AS data,
        ROW_NUMBER() OVER (
          PARTITION BY
            translate(UPPER(BTRIM(m.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC'),
            translate(UPPER(BTRIM(tb.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC'),
            translate(UPPER(BTRIM(tp.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC'),
            translate(UPPER(BTRIM(c.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
          ORDER BY mbv.data DESC, mbv.codigo DESC
        ) AS rn
      FROM modal_bancada_condicao_tipo_pgto_valor mbv
      INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
      INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
      INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
      INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
      INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
      INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
      WHERE translate(UPPER(BTRIM(m.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = translate(UPPER(BTRIM('TEG ESPECIAL')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
        AND translate(UPPER(BTRIM(tp.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = translate(UPPER(BTRIM('Fixo')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
        AND (
          (
            translate(UPPER(BTRIM(tb.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = translate(UPPER(BTRIM('Convencional')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
            AND translate(UPPER(BTRIM(c.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = translate(UPPER(BTRIM('Fixo Esp')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
          )
          OR
          (
            translate(UPPER(BTRIM(tb.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = translate(UPPER(BTRIM('Acessível')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
            AND translate(UPPER(BTRIM(c.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = translate(UPPER(BTRIM('Fixo Esp para acessivel')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
          )
        )
    )
    SELECT modalidade, tipo_bancada, tipo_pgto, condicao, valor, data
    FROM latest
    WHERE rn = 1
    ORDER BY tipo_bancada, condicao
  `;

  const { rows } = await client.query(sql);
  console.log(JSON.stringify(rows, null, 2));
  await client.end();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
