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

  const result = await client.query(`
    SELECT
      to_char(mbv.data,'YYYY-MM-DD') AS data,
      m.descricao AS modalidade,
      tb.descricao AS tipo_bancada,
      tp.descricao AS tipo_pgto,
      c.descricao AS condicao,
      c.qtde_ini,
      c.qtde_fim,
      mbv.valor::numeric(14,2) AS valor
    FROM modal_bancada_condicao_tipo_pgto_valor mbv
    INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
    INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
    INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
    INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
    INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
    INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
    WHERE translate(upper(trim(m.descricao)),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') = translate(upper('TEG REGULAR'),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC')
      AND translate(upper(trim(tb.descricao)),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') = translate(upper('ACESSIVEL'),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC')
      AND translate(upper(trim(tp.descricao)),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') = translate(upper('FIXO'),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC')
      AND c.qtde_ini <= 2
      AND c.qtde_fim >= 2
    ORDER BY mbv.data DESC, mbv.codigo DESC
    LIMIT 30
  `);

  console.log('PARAM_TEG_REGULAR_ACESSIVEL_Q2:', JSON.stringify(result.rows, null, 2));
  await client.end();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
