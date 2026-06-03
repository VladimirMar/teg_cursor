const { Client } = require('pg');

const cfg = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '12345',
  database: process.env.POSTGRES_DB || 'teg_financ',
};

const MES_ANO = '04/2026';
const DATA_REF = '2026-04-30';

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

const round2 = (v) => Number((n(v)).toFixed(2));

(async () => {
  const c = new Client(cfg);
  await c.connect();

  const baseSql = `
    WITH grouped AS (
      SELECT
        aps.mes_ano,
        TO_CHAR(aps.data_referencia, 'YYYY-MM-DD') AS data_referencia,
        aps.dre_codigo::text AS dre_codigo,
        aps.ordem_servico_codigo::text AS ordem_servico_codigo,
        aps.revisao,
        COALESCE(BTRIM(aps.tipo_pessoa), '') AS tipo_pessoa,
        COALESCE(MAX(BTRIM(aps.tipo_veiculo)), '') AS tipo_veiculo,
        COALESCE(MAX(BTRIM(os.modalidade_descricao)), '') AS modalidade_descricao,
        COALESCE(SUM(aps.cont_nc), 0)::numeric AS cont_nc_total,
        COALESCE(SUM(aps.cont_cad), 0)::numeric AS cont_cad_total,
        COALESCE(SUM(aps.km), 0)::numeric(14,4) AS km_total
      FROM apuracao_servicos aps
      INNER JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
      WHERE aps.mes_ano = $1
        AND aps.data_referencia = $2::date
      GROUP BY 1,2,3,4,5,6
    )
    SELECT
      g.*,
      COALESCE(r.continua_regular, 0)::numeric(14,2) AS continua_regular_gravado,
      COALESCE(r.continua_cadeirante, 0)::numeric(14,2) AS continua_cadeirante_gravado,
      COALESCE(r.km_valor, 0)::numeric(14,2) AS km_valor_gravado
    FROM grouped g
    LEFT JOIN remuneracao_servicos r
      ON r.mes_ano = g.mes_ano
     AND TO_CHAR(r.data_referencia, 'YYYY-MM-DD') = g.data_referencia
     AND r.dre_codigo::text = g.dre_codigo
     AND r.ordem_servico_codigo::text = g.ordem_servico_codigo
     AND r.revisao = g.revisao
     AND COALESCE(BTRIM(r.tipo_pessoa), '') = g.tipo_pessoa
  `;

  const base = await c.query(baseSql, [MES_ANO, DATA_REF]);

  const continuaRegularRow = await c.query(
    `SELECT valor::numeric(14,2) AS valor
       FROM continua_valor
      WHERE UPPER(BTRIM(tipo_continua)) = UPPER(BTRIM('Regular'))
        AND data <= $1::date
      ORDER BY data DESC, codigo DESC
      LIMIT 1`,
    [DATA_REF],
  );

  const continuaCadeiranteRow = await c.query(
    `SELECT valor::numeric(14,2) AS valor
       FROM continua_valor
      WHERE UPPER(BTRIM(tipo_continua)) = UPPER(BTRIM('Cadeirante'))
        AND data <= $1::date
      ORDER BY data DESC, codigo DESC
      LIMIT 1`,
    [DATA_REF],
  );

  const valorContinuaRegular = n(continuaRegularRow.rows[0]?.valor);
  const valorContinuaCadeirante = n(continuaCadeiranteRow.rows[0]?.valor);

  const kmLookupCache = new Map();
  const continuaRegularDiff = [];
  const continuaCadeiranteDiff = [];
  const kmDiff = [];

  for (const row of base.rows) {
    const modalidade = String(row.modalidade_descricao || '').trim().toUpperCase();
    const tipoVeiculo = String(row.tipo_veiculo || '').trim().toUpperCase();

    const contNc = n(row.cont_nc_total);
    const contCad = n(row.cont_cad_total);
    const kmTotal = Number(n(row.km_total).toFixed(4));

    let expectedContinuaRegular = 0;
    let expectedContinuaCadeirante = 0;

    if (modalidade === 'TEG REGULAR' && tipoVeiculo === 'NORMAL' && contNc > 0) {
      expectedContinuaRegular = round2(contNc * valorContinuaRegular);
    }

    if (modalidade === 'TEG REGULAR' && tipoVeiculo === 'ACESSIVEL' && contCad > 0) {
      expectedContinuaCadeirante = round2(contCad * valorContinuaCadeirante);
    }

    let expectedKmValor = 0;
    if (kmTotal > 0) {
      const cacheKey = kmTotal.toFixed(4);
      let kmLookup = kmLookupCache.get(cacheKey);

      if (!kmLookup) {
        const kmRow = await c.query(
          `SELECT
             kv.valor::numeric(14,2) AS valor,
             c.qtde_ini::numeric(14,4) AS qtde_ini
           FROM km_valor kv
           INNER JOIN condicao c ON c.codigo = kv.condicao_codigo
           WHERE kv.data <= $1::date
             AND c.qtde_ini::numeric(14,4) <= $2::numeric(14,4)
           ORDER BY c.qtde_ini DESC, kv.data DESC, kv.codigo DESC
           LIMIT 1`,
          [DATA_REF, kmTotal],
        );

        kmLookup = kmRow.rows[0]
          ? { valor: n(kmRow.rows[0].valor), qtdeIni: n(kmRow.rows[0].qtde_ini) }
          : null;

        kmLookupCache.set(cacheKey, kmLookup);
      }

      if (kmLookup && kmTotal >= n(kmLookup.qtdeIni)) {
        expectedKmValor = round2(kmTotal * n(kmLookup.valor));
      }
    }

    const gravadoContinuaRegular = round2(row.continua_regular_gravado);
    const gravadoContinuaCadeirante = round2(row.continua_cadeirante_gravado);
    const gravadoKmValor = round2(row.km_valor_gravado);

    if (Math.abs(expectedContinuaRegular - gravadoContinuaRegular) > 0.009) {
      continuaRegularDiff.push({
        chave: `${row.mes_ano}|${row.data_referencia}|${row.dre_codigo}|${row.ordem_servico_codigo}|${row.revisao}|${row.tipo_pessoa}`,
        modalidade,
        tipoVeiculo,
        contNc,
        esperado: expectedContinuaRegular,
        gravado: gravadoContinuaRegular,
      });
    }

    if (Math.abs(expectedContinuaCadeirante - gravadoContinuaCadeirante) > 0.009) {
      continuaCadeiranteDiff.push({
        chave: `${row.mes_ano}|${row.data_referencia}|${row.dre_codigo}|${row.ordem_servico_codigo}|${row.revisao}|${row.tipo_pessoa}`,
        modalidade,
        tipoVeiculo,
        contCad,
        esperado: expectedContinuaCadeirante,
        gravado: gravadoContinuaCadeirante,
      });
    }

    if (Math.abs(expectedKmValor - gravadoKmValor) > 0.009) {
      kmDiff.push({
        chave: `${row.mes_ano}|${row.data_referencia}|${row.dre_codigo}|${row.ordem_servico_codigo}|${row.revisao}|${row.tipo_pessoa}`,
        kmTotal,
        esperado: expectedKmValor,
        gravado: gravadoKmValor,
      });
    }
  }

  const out = {
    mesAno: MES_ANO,
    dataReferencia: DATA_REF,
    totalLinhasRemuneracaoComparadas: base.rows.length,
    valorContinuaRegular,
    valorContinuaCadeirante,
    divergencias: {
      continuaRegular: continuaRegularDiff.length,
      continuaCadeirante: continuaCadeiranteDiff.length,
      kmValor: kmDiff.length,
    },
    amostras: {
      continuaRegular: continuaRegularDiff.slice(0, 5),
      continuaCadeirante: continuaCadeiranteDiff.slice(0, 5),
      kmValor: kmDiff.slice(0, 5),
    },
  };

  console.log(JSON.stringify(out, null, 2));
  await c.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
