EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*)::int AS total
FROM apuracao_servicos aps
INNER JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
WHERE aps.data_referencia = DATE '2026-04-01'
  AND aps.mes_ano = '04/2026'
  AND COALESCE(os.vigencia_os, os.data_emissao, os.data_inclusao::date) <= DATE '2026-04-01'
  AND COALESCE(
    os.data_encerramento,
    os.data_eol,
    CASE
      WHEN UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO' THEN 'infinity'::date
      ELSE COALESCE(os.data_modificacao::date, os.data_inclusao::date, os.data_emissao, os.vigencia_os)
    END
  ) >= DATE '2026-04-01';

EXPLAIN (ANALYZE, BUFFERS)
WITH paged_apontamentos AS (
  SELECT
    BTRIM(aps.mes_ano) AS mes_ano,
    aps.data_referencia,
    CAST(aps.dre_codigo AS text) AS dre_codigo,
    aps.ordem_servico_codigo::text AS ordem_servico_codigo,
    aps.revisao,
    CAST(aps.tipo_escola_codigo AS text) AS tipo_escola_codigo,
    COALESCE(BTRIM(aps.tipo_pessoa), '') AS tipo_pessoa,
    COALESCE(aps.empresa_order, '') AS empresa_order,
    COALESCE(aps.nome_condutor_order, '') AS nome_condutor_order,
    COALESCE(aps.dre_descricao_order, '') AS dre_descricao_order,
    COALESCE(aps.termo_adesao_order, '') AS termo_adesao_order,
    COALESCE(aps.num_os_order, '') AS num_os_order,
    COALESCE(aps.tipo_escola_display_order, 999) AS tipo_escola_display_order,
    COALESCE(aps.tipo_escola_descricao_order, '') AS tipo_escola_descricao_order
  FROM apuracao_servicos aps
  INNER JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  WHERE aps.data_referencia = DATE '2026-04-01'
    AND aps.mes_ano = '04/2026'
    AND COALESCE(os.vigencia_os, os.data_emissao, os.data_inclusao::date) <= DATE '2026-04-01'
    AND COALESCE(
      os.data_encerramento,
      os.data_eol,
      CASE
        WHEN UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO' THEN 'infinity'::date
        ELSE COALESCE(os.data_modificacao::date, os.data_inclusao::date, os.data_emissao, os.vigencia_os)
      END
    ) >= DATE '2026-04-01'
  ORDER BY COALESCE(aps.empresa_order, '') ASC,
           COALESCE(aps.nome_condutor_order, '') ASC,
           COALESCE(aps.dre_descricao_order, '') ASC,
           COALESCE(aps.termo_adesao_order, '') ASC,
           COALESCE(aps.num_os_order, '') ASC,
           aps.revisao ASC,
           COALESCE(aps.tipo_escola_display_order, 999) ASC,
           COALESCE(aps.tipo_escola_descricao_order, '') ASC,
           aps.ordem_servico_codigo ASC,
           aps.tipo_escola_codigo ASC,
           aps.dre_codigo ASC,
           COALESCE(BTRIM(aps.tipo_pessoa), '') ASC
  LIMIT 50
  OFFSET 0
)
SELECT
  BTRIM(apontamento_dia.mes_ano) AS mes_ano,
  CAST(apontamento_dia.dre_codigo AS text) AS dre_codigo,
  COALESCE(BTRIM(dre.sigla), '') AS dre_sigla,
  BTRIM(CAST(dre.descricao AS text)) AS dre_descricao,
  apontamento_dia.ordem_servico_codigo::text AS ordem_servico_codigo,
  COALESCE(BTRIM(os.os_concat), '') AS ordem_servico_os_concat,
  COALESCE(BTRIM(os.termo_adesao), '') AS ordem_servico_termo_adesao,
  COALESCE(BTRIM(os.num_os), '') AS ordem_servico_num_os,
  apontamento_dia.revisao,
  CAST(apontamento_dia.tipo_escola_codigo AS text) AS tipo_escola_codigo,
  COALESCE(BTRIM(tipo_escola.sigla), '') AS tipo_escola_sigla,
  BTRIM(CAST(tipo_escola.descricao AS text)) AS tipo_escola_descricao,
  COALESCE(BTRIM(apontamento_dia.tipo_pessoa), '') AS tipo_pessoa,
  TO_CHAR(GREATEST(COALESCE(os.vigencia_os, os.data_emissao, os.data_inclusao::date), DATE '2026-04-01'), 'YYYY-MM-DD') AS periodo_inicio,
  TO_CHAR(LEAST(COALESCE(
    os.data_encerramento,
    os.data_eol,
    CASE
      WHEN UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO' THEN 'infinity'::date
      ELSE COALESCE(os.data_modificacao::date, os.data_inclusao::date, os.data_emissao, os.vigencia_os)
    END
  ), DATE '2026-04-30'), 'YYYY-MM-DD') AS periodo_fim,
  COALESCE(BTRIM(condutor_lookup.crmc), '') AS crmc_condutor,
  COALESCE(BTRIM(os.termo_adesao), '') AS contrato,
  COALESCE(BTRIM(os.veiculo_placas), '') AS placa,
  COALESCE(BTRIM(credenciada_lookup.empresa), '') AS empresa,
  COALESCE(BTRIM(os.condutor), '') AS nome_condutor,
  COALESCE(BTRIM(apontamento_dia.tipo_veiculo), '') AS tipo_veiculo,
  COALESCE(BTRIM(apuracao_financeira.situacao), '') AS apuracao_financeira_situacao,
  TRUE AS ativo_na_data,
  DATE '2026-04-01'::text AS data_referencia,
  COALESCE(apontamento_dia.nc_pres, 0) AS nc_pres,
  COALESCE(apontamento_dia.cad, 0) AS cad,
  COALESCE(apontamento_dia.ac_nc, 0) AS ac_nc,
  COALESCE(apontamento_dia.ac_cad, 0) AS ac_cad,
  COALESCE(apontamento_dia.cont_nc, 0) AS cont_nc,
  COALESCE(apontamento_dia.cont_cad, 0) AS cont_cad,
  COALESCE(apontamento_dia.nc_pres_acm, 0) AS nc_pres_acm,
  COALESCE(apontamento_dia.cad_acm, 0) AS cad_acm,
  COALESCE(apontamento_dia.ac_nc_acm, 0) AS ac_nc_acm,
  COALESCE(apontamento_dia.ac_cad_acm, 0) AS ac_cad_acm,
  COALESCE(apontamento_dia.cont_nc_acm, 0) AS cont_nc_acm,
  COALESCE(apontamento_dia.cont_cad_acm, 0) AS cont_cad_acm,
  TO_CHAR(COALESCE(apontamento_dia.km, 0), 'FM9999999990.0000') AS km,
  COALESCE(apontamento_dia.empresa_order, '') AS empresa_order,
  COALESCE(apontamento_dia.nome_condutor_order, '') AS nome_condutor_order,
  COALESCE(apontamento_dia.dre_descricao_order, '') AS dre_descricao_order,
  COALESCE(apontamento_dia.termo_adesao_order, '') AS termo_adesao_order,
  COALESCE(apontamento_dia.num_os_order, '') AS num_os_order,
  COALESCE(apontamento_dia.tipo_escola_display_order, 999) AS tipo_escola_display_order,
  COALESCE(apontamento_dia.tipo_escola_descricao_order, '') AS tipo_escola_descricao_order
FROM apuracao_servicos apontamento_dia
INNER JOIN paged_apontamentos
  ON paged_apontamentos.mes_ano = BTRIM(apontamento_dia.mes_ano)
 AND paged_apontamentos.data_referencia = apontamento_dia.data_referencia
 AND paged_apontamentos.dre_codigo = CAST(apontamento_dia.dre_codigo AS text)
 AND paged_apontamentos.ordem_servico_codigo = apontamento_dia.ordem_servico_codigo::text
 AND paged_apontamentos.revisao = apontamento_dia.revisao
 AND paged_apontamentos.tipo_escola_codigo = CAST(apontamento_dia.tipo_escola_codigo AS text)
 AND paged_apontamentos.tipo_pessoa = COALESCE(BTRIM(apontamento_dia.tipo_pessoa), '')
INNER JOIN dre ON dre.codigo = apontamento_dia.dre_codigo
INNER JOIN tipo_escola ON tipo_escola.codigo = apontamento_dia.tipo_escola_codigo
INNER JOIN ordem_servico os ON os.codigo = apontamento_dia.ordem_servico_codigo
LEFT JOIN termo termo_lookup ON termo_lookup.codigo = os.termo_codigo
LEFT JOIN credenciada credenciada_lookup ON credenciada_lookup.codigo = termo_lookup.credenciada_codigo
LEFT JOIN condutor condutor_lookup
  ON regexp_replace(COALESCE(condutor_lookup.cpf_condutor, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(os.cpf_condutor, ''), '[^0-9]', '', 'g')
LEFT JOIN apuracao_financeira
  ON apuracao_financeira.mes_ano = apontamento_dia.mes_ano
 AND apuracao_financeira.dre_codigo = apontamento_dia.dre_codigo
 AND apuracao_financeira.revisao = apontamento_dia.revisao
 AND BTRIM(apuracao_financeira.tipo_pessoa) = BTRIM(apontamento_dia.tipo_pessoa)
WHERE apontamento_dia.data_referencia = DATE '2026-04-01'
  AND apontamento_dia.mes_ano = '04/2026'
ORDER BY empresa_order ASC,
         nome_condutor_order ASC,
         dre_descricao_order ASC,
         termo_adesao_order ASC,
         num_os_order ASC,
         apontamento_dia.revisao ASC,
         tipo_escola_display_order ASC,
         tipo_escola_descricao_order ASC,
         apontamento_dia.ordem_servico_codigo ASC,
         apontamento_dia.tipo_escola_codigo ASC,
         apontamento_dia.dre_codigo ASC,
         COALESCE(BTRIM(apontamento_dia.tipo_pessoa), '') ASC;
