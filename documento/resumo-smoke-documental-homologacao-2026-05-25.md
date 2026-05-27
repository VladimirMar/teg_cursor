# Resumo do smoke documental de homologacao

Data: 2026-05-25
Ambiente web: http://10.36.144.147:4173/
Ambiente API: http://127.0.0.1:3002

## Objetivo

Separar os checks de emissao documental do smoke principal de CRUD/importacao e registrar, de forma resumida, a nova cobertura executada na homologacao.

## Separacao aplicada

- O smoke principal continua em `npm run smoke:api` e permanece focado em CRUD, importacao, restauracao e recusas.
- A nova suite dedicada de homologacao documental ficou disponivel em `npm run smoke:api:documental`.
- O fluxo oficial `npm run homol:smoke` passou a executar, em sequencia:
  - `npm run smoke:api`
  - `npm run smoke:api:documental`

## Comandos validados

### Suite documental isolada

```powershell
$env:API_BASE_URL='http://127.0.0.1:3002'
node scripts/smoke-api.mjs documental
```

Resultado:
- Suite documental concluida com sucesso.

### Fluxo oficial da homologacao

```powershell
npm run homol:smoke
```

Resultado:
- Preparo operacional concluido com sucesso.
- Smoke principal concluido com sucesso.
- Smoke documental concluido com sucesso.

## Novos passos cobertos pela suite documental

### Termo

- Resolucao do parametro de emissao por data de referencia.
- Validacao das fontes usadas pelo botao `Termo Aditivo`:
  - `titulo_aditivo`
  - `corpo_aditivo`
- Validacao da fonte usada pelo botao `Despacho da Publicacao`:
  - `texto_despacho`

### Contrato

- Chamada real do endpoint `POST /api/termo/emitir-contrato` em homologacao.
- Validacao de retorno com:
  - `fileName`
  - `previewMarkup`
  - termo de adesao esperado no corpo
  - credenciado esperado no corpo

### Ordem de servico

- Consulta de `next-num-os` para termo valido.
- Resolucao das fontes usadas pelo botao `Dados OS`:
  - `GET /api/termo/lookup`
  - `GET /api/condutor/lookup` quando houver CPF de condutor
  - `GET /api/monitor/lookup` quando houver CPF de monitor
  - `GET /api/veiculo/lookup` quando houver CRM
- Resolucao das fontes usadas pelo botao `Emissao Doc`:
  - `GET /api/emissao-documento-parametro/resolve`
  - validacao de `obs_01_emissao`
  - validacao de `obs_02_emissao`
  - validacao de `rodape_emissao`

## Evidencias resumidas da execucao

- `fontes de termo aditivo e despacho validadas para 2026/0026504`
- `emissao do contrato validada para o termo 2026/0026504`
- `consulta de dados OS validada para 2022/0023966/001-S/R`
- `fontes da emissao de documento da OS validadas para 2022/0023966/001-S/R`
- `next-num-os ok para 2022/0023966: proxima 002`

## Conclusao

Status final: aprovado.

O smoke de homologacao passou a ter separacao explicita entre:
- validacoes operacionais de CRUD/importacao
- validacoes documentais de emissao

Essa divisao reduz mistura de responsabilidades na leitura do resultado e facilita anexar a cobertura documental ao manual de homologacao.