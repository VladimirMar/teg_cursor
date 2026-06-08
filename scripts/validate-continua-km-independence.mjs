import pg from 'pg'
import { readFileSync } from 'node:fs'

const mesAno = process.argv[2] || '04/2026'
const dreCodigo = process.argv[3] || ''

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const idx = line.indexOf('=')
  return [line.slice(0, idx), line.slice(idx + 1)]
}))

const pool = new pg.Pool({
  host: env.PGHOST,
  port: Number(env.PGPORT),
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
})

const n = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const round2 = (value) => Number(n(value).toFixed(2))

const normalizeTipoBancada = (tipoVeiculo) => {
  const normalizedKey = String(tipoVeiculo || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (!normalizedKey || normalizedKey === 'convencional' || normalizedKey === 'normal') return 'CONVENCIONAL'
  if (normalizedKey === 'adaptado' || normalizedKey === 'acessivel') return 'ACESSIVEL'
  if (normalizedKey === 'creche') return 'CRECHE'
  return ''
}

const shouldCalculateContinuaRegular = ({ contNc }) => n(contNc) > 0

const shouldCalculateContinuaCadeirante = ({ contCad }) => n(contCad) > 0

const filters = ['aps.mes_ano = $1']
const values = [mesAno]
if (dreCodigo) {
  values.push(Number(dreCodigo))
  filters.push(`aps.dre_codigo = $${values.length}`)
}

const grouped = await pool.query(`
  WITH grouped AS (
    SELECT
      aps.mes_ano,
      TO_CHAR(aps.data_referencia, 'YYYY-MM-DD') AS data_referencia,
      aps.dre_codigo::text AS dre_codigo,
      aps.ordem_servico_codigo::text AS ordem_servico_codigo,
      aps.revisao,
      COALESCE(BTRIM(aps.tipo_pessoa), '') AS tipo_pessoa,
      COALESCE(MAX(BTRIM(os.os_concat)), '') AS os_concat,
      COALESCE(MAX(BTRIM(m.descricao)), '') AS modalidade_os,
      COALESCE(MAX(BTRIM(aps.tipo_veiculo)), '') AS tipo_veiculo,
      COALESCE(SUM(aps.cont_nc), 0)::numeric AS cont_nc_total,
      COALESCE(SUM(aps.cont_cad), 0)::numeric AS cont_cad_total,
      COALESCE(SUM(aps.km), 0)::numeric(14,4) AS km_total
    FROM apuracao_servicos aps
    INNER JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
    LEFT JOIN modalidade m ON m.codigo = os.modalidade_codigo
    WHERE ${filters.join(' AND ')}
    GROUP BY 1,2,3,4,5,6
  )
  SELECT
    g.*,
    COALESCE(r.continua_regular, 0)::numeric(14,2) AS continua_regular,
    COALESCE(r.continua_cadeirante, 0)::numeric(14,2) AS continua_cadeirante,
    COALESCE(r.km_valor, 0)::numeric(14,2) AS km_valor
  FROM grouped g
  LEFT JOIN remuneracao_servicos r
    ON r.mes_ano = g.mes_ano
   AND TO_CHAR(r.data_referencia, 'YYYY-MM-DD') = g.data_referencia
   AND r.dre_codigo::text = g.dre_codigo
   AND r.ordem_servico_codigo::text = g.ordem_servico_codigo
   AND r.revisao = g.revisao
   AND COALESCE(BTRIM(r.tipo_pessoa), '') = g.tipo_pessoa
  WHERE g.cont_nc_total > 0 OR g.cont_cad_total > 0 OR g.km_total > 0
`, values)

const continuaValorRows = await pool.query(`
  SELECT tipo_continua, valor::numeric(14,2) AS valor
  FROM continua_valor
  WHERE data <= (
    SELECT MAX(data_referencia) FROM apuracao_servicos WHERE mes_ano = $1
  )
  ORDER BY data DESC, codigo DESC
`, [mesAno])

const valorContinuaRegular = n(continuaValorRows.rows.find((row) => String(row.tipo_continua).toUpperCase() === 'REGULAR')?.valor)
const valorContinuaCadeirante = n(continuaValorRows.rows.find((row) => String(row.tipo_continua).toUpperCase().includes('CADEIR'))?.valor)

const kmLookupCache = new Map()
const getKmExpected = async (dataReferencia, kmTotal) => {
  const key = `${dataReferencia}|${kmTotal}`
  if (kmLookupCache.has(key)) return kmLookupCache.get(key)

  const result = await pool.query(`
    SELECT kv.valor::numeric(14,2) AS valor, c.qtde_ini::numeric(14,4) AS qtde_ini
    FROM km_valor kv
    INNER JOIN condicao c ON c.codigo = kv.condicao_codigo
    WHERE kv.data <= $1::date
      AND c.qtde_ini::numeric(14,4) <= $2::numeric(14,4)
    ORDER BY c.qtde_ini DESC, kv.data DESC, kv.codigo DESC
    LIMIT 1
  `, [dataReferencia, kmTotal])

  const lookup = result.rows[0]
    ? { valor: n(result.rows[0].valor), qtdeIni: n(result.rows[0].qtde_ini) }
    : null
  const expected = lookup && kmTotal >= lookup.qtdeIni ? round2(kmTotal * lookup.valor) : 0
  kmLookupCache.set(key, expected)
  return expected
}

const continuaRegularIssues = []
const continuaCadeiranteIssues = []
const kmIssues = []
const blockedByRules = {
  continuaRegular: [],
  continuaCadeirante: [],
}

for (const row of grouped.rows) {
  const ctx = {
    modalidadeOs: row.modalidade_os,
    tipoVeiculo: row.tipo_veiculo,
    contNc: row.cont_nc_total,
    contCad: row.cont_cad_total,
  }

  if (n(row.cont_nc_total) > 0) {
    const eligible = shouldCalculateContinuaRegular(ctx)
    const expected = eligible ? round2(n(row.cont_nc_total) * valorContinuaRegular) : 0
    if (!eligible) {
      blockedByRules.continuaRegular.push({
        dataReferencia: row.data_referencia,
        os: row.os_concat,
        modalidadeOs: row.modalidade_os,
        tipoVeiculo: row.tipo_veiculo,
        contNc: n(row.cont_nc_total),
        continuaRegular: n(row.continua_regular),
      })
    } else if (round2(row.continua_regular) !== expected) {
      continuaRegularIssues.push({
        dataReferencia: row.data_referencia,
        os: row.os_concat,
        modalidadeOs: row.modalidade_os,
        contNc: n(row.cont_nc_total),
        expected,
        actual: n(row.continua_regular),
      })
    }
  }

  if (n(row.cont_cad_total) > 0) {
    const eligible = shouldCalculateContinuaCadeirante(ctx)
    const expected = eligible ? round2(n(row.cont_cad_total) * valorContinuaCadeirante) : 0
    if (!eligible) {
      blockedByRules.continuaCadeirante.push({
        dataReferencia: row.data_referencia,
        os: row.os_concat,
        modalidadeOs: row.modalidade_os,
        tipoVeiculo: row.tipo_veiculo,
        contCad: n(row.cont_cad_total),
        continuaCadeirante: n(row.continua_cadeirante),
      })
    } else if (round2(row.continua_cadeirante) !== expected) {
      continuaCadeiranteIssues.push({
        dataReferencia: row.data_referencia,
        os: row.os_concat,
        modalidadeOs: row.modalidade_os,
        contCad: n(row.cont_cad_total),
        expected,
        actual: n(row.continua_cadeirante),
      })
    }
  }

  if (n(row.km_total) > 0) {
    const expectedKm = await getKmExpected(row.data_referencia, n(row.km_total))
    if (normalizeTipoBancada(row.tipo_veiculo) === '' && n(row.km_valor) === 0) {
      kmIssues.push({
        dataReferencia: row.data_referencia,
        os: row.os_concat,
        tipoVeiculo: row.tipo_veiculo,
        kmTotal: n(row.km_total),
        expected: expectedKm,
        actual: n(row.km_valor),
        reason: 'tipo_veiculo_invalido_pula_registro',
      })
    } else if (round2(row.km_valor) !== expectedKm) {
      kmIssues.push({
        dataReferencia: row.data_referencia,
        os: row.os_concat,
        tipoVeiculo: row.tipo_veiculo,
        kmTotal: n(row.km_total),
        expected: expectedKm,
        actual: n(row.km_valor),
        reason: expectedKm > 0 ? 'divergencia_calculo' : 'km_abaixo_limite_ou_sem_tabela',
      })
    }
  }
}

const summary = {
  mesAno,
  dreCodigo: dreCodigo || 'todas',
  rowsWithApontamentoMetrics: grouped.rows.length,
  continuaRegularBlockedByTegOrTipo: blockedByRules.continuaRegular.length,
  continuaCadeiranteBlockedByTegOrTipo: blockedByRules.continuaCadeirante.length,
  continuaRegularCalculationIssues: continuaRegularIssues.length,
  continuaCadeiranteCalculationIssues: continuaCadeiranteIssues.length,
  kmIssues: kmIssues.length,
  rules: {
    continuaRegular: 'cont_nc > 0',
    continuaCadeirante: 'cont_cad > 0',
    km: 'km > 0 E registro nao ignorado por tipo veiculo invalido; exige faixa km_valor com qtde_ini <= km',
  },
}

const breakdown = await pool.query(`
  SELECT
    COALESCE(m.descricao, '') AS modalidade_os,
    COALESCE(aps.tipo_veiculo, '') AS tipo_veiculo,
    COUNT(*)::int AS registros,
    SUM(CASE WHEN aps.cont_nc > 0 THEN 1 ELSE 0 END)::int AS com_cont_nc,
    SUM(CASE WHEN aps.cont_cad > 0 THEN 1 ELSE 0 END)::int AS com_cont_cad,
    SUM(CASE WHEN aps.km > 0 THEN 1 ELSE 0 END)::int AS com_km
  FROM apuracao_servicos aps
  JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  LEFT JOIN modalidade m ON m.codigo = os.modalidade_codigo
  WHERE ${filters.join(' AND ')}
    AND (aps.cont_nc > 0 OR aps.cont_cad > 0 OR aps.km > 0)
  GROUP BY 1, 2
  ORDER BY registros DESC
`, values)

console.log(JSON.stringify({
  summary,
  apontamentoBreakdown: breakdown.rows,
  continuaRegularBlockedSamples: blockedByRules.continuaRegular.slice(0, 10),
  continuaCadeiranteBlockedSamples: blockedByRules.continuaCadeirante.slice(0, 10),
  continuaRegularIssues: continuaRegularIssues.slice(0, 10),
  continuaCadeiranteIssues: continuaCadeiranteIssues.slice(0, 10),
  kmIssues: kmIssues.slice(0, 10),
}, null, 2))

await pool.end()
