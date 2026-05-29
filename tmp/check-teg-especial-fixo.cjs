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
    SELECT
      c.descricao AS condicao,
      tb.descricao AS tipo_bancada,
      m.descricao AS modalidade,
      tp.descricao AS tipo_pgto,
      mbv.valor::numeric(14,2) AS valor,
      TO_CHAR(mbv.data, 'YYYY-MM-DD') AS data
    FROM modal_bancada_condicao_tipo_pgto_valor mbv
    INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
    INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
    INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
    INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
    INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
    INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
    WHERE translate(UPPER(BTRIM(m.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = translate(UPPER(BTRIM('TEG ESPECIAL')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
      AND translate(UPPER(BTRIM(tb.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = translate(UPPER(BTRIM('Acessível')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
      AND translate(UPPER(BTRIM(tp.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = translate(UPPER(BTRIM('Fixo')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
      AND translate(UPPER(BTRIM(c.descricao)), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') IN (
        translate(UPPER(BTRIM('Fixo Esp')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC'),
        translate(UPPER(BTRIM('Fixo Esp para acessivel')), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')
      )
    ORDER BY c.descricao ASC, mbv.data DESC, mbv.codigo DESC
  `;

  const { rows } = await client.query(sql);
  const latestByCond = new Map();

  for (const row of rows) {
    if (!latestByCond.has(row.condicao)) {
      latestByCond.set(row.condicao, row);
    }
  }

  console.log(JSON.stringify(Array.from(latestByCond.values()), null, 2));
  await client.end();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
