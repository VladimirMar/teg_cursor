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
const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const round2 = (v) => Number(n(v).toFixed(2));

(async () => {
  const c = new Client(cfg);
  await c.connect();

  const grouped = await c.query(`
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
  `, [MES_ANO, DATA_REF]);

  const reg = await c.query(`SELECT valor::numeric(14,2) AS valor FROM continua_valor WHERE UPPER(BTRIM(tipo_continua)) = 'REGULAR' AND data <= $1::date ORDER BY data DESC, codigo DESC LIMIT 1`, [DATA_REF]);
  const cad = await c.query(`SELECT valor::numeric(14,2) AS valor FROM continua_valor WHERE UPPER(BTRIM(tipo_continua)) = 'CADEIRANTE' AND data <= $1::date ORDER BY data DESC, codigo DESC LIMIT 1`, [DATA_REF]);

  const vReg = n(reg.rows[0]?.valor);
  const vCad = n(cad.rows[0]?.valor);

  let continuaRegularMaiorZero = 0;
  let continuaCadeiranteMaiorZero = 0;
  let kmMaiorZero = 0;

  const kmCache = new Map();
  const amostra = [];

  for (const row of grouped.rows) {
    const modalidade = String(row.modalidade_descricao || '').trim().toUpperCase();
    const tipoVeiculo = String(row.tipo_veiculo || '').trim().toUpperCase();
    const contNc = n(row.cont_nc_total);
    const contCad = n(row.cont_cad_total);
    const kmTotal = Number(n(row.km_total).toFixed(4));

    let continuaRegular = 0;
    let continuaCadeirante = 0;

    if (modalidade === 'TEG REGULAR' && tipoVeiculo === 'NORMAL' && contNc > 0) {
      continuaRegular = round2(contNc * vReg);
    }

    if (modalidade === 'TEG REGULAR' && tipoVeiculo === 'ACESSIVEL' && contCad > 0) {
      continuaCadeirante = round2(contCad * vCad);
    }

    let kmValor = 0;
    if (kmTotal > 0) {
      const key = kmTotal.toFixed(4);
      let lookup = kmCache.get(key);
      if (!lookup) {
        const r = await c.query(`
          SELECT kv.valor::numeric(14,2) AS valor, c.qtde_ini::numeric(14,4) AS qtde_ini
          FROM km_valor kv
          INNER JOIN condicao c ON c.codigo = kv.condicao_codigo
          WHERE kv.data <= $1::date AND c.qtde_ini::numeric(14,4) <= $2::numeric(14,4)
          ORDER BY c.qtde_ini DESC, kv.data DESC, kv.codigo DESC
          LIMIT 1
        `, [DATA_REF, kmTotal]);
        lookup = r.rows[0] ? { valor: n(r.rows[0].valor), qtdeIni: n(r.rows[0].qtde_ini) } : null;
        kmCache.set(key, lookup);
      }
      if (lookup && kmTotal >= lookup.qtdeIni) {
        kmValor = round2(kmTotal * lookup.valor);
      }
    }

    if (continuaRegular > 0) continuaRegularMaiorZero += 1;
    if (continuaCadeirante > 0) continuaCadeiranteMaiorZero += 1;
    if (kmValor > 0) kmMaiorZero += 1;

    if (amostra.length < 5 && (continuaRegular > 0 || continuaCadeirante > 0 || kmValor > 0)) {
      amostra.push({
        chave: `${row.mes_ano}|${row.data_referencia}|${row.dre_codigo}|${row.ordem_servico_codigo}|${row.revisao}|${row.tipo_pessoa}`,
        modalidade,
        tipoVeiculo,
        continuaRegular,
        continuaCadeirante,
        kmValor,
      });
    }
  }

  console.log(JSON.stringify({
    mesAno: MES_ANO,
    dataReferencia: DATA_REF,
    totalAgrupamentos: grouped.rows.length,
    valorContinuaRegular: vReg,
    valorContinuaCadeirante: vCad,
    esperadosMaiorZero: {
      continuaRegular: continuaRegularMaiorZero,
      continuaCadeirante: continuaCadeiranteMaiorZero,
      kmValor: kmMaiorZero,
    },
    amostra,
  }, null, 2));

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
