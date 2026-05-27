## OrdemServico

Validar o XML offline antes do POST:

```bash
npm run validate:ordem-servico:xml
```

O script lê `importXML/OrdemServico.xml` e grava o resumo em `importXML/ordem_servico_validation_summary.json`.

Para incluir checagem opcional de integridade referencial com PostgreSQL antes do POST:

```bash
CHECK_DB_REFERENCES=true npm run validate:ordem-servico:xml
```

Nesse modo, o validador também antecipa ausências em `credenciada`, `dre`, `condutor`, `veiculo` e `monitor`.

Importar com saída em arquivo, sem depender da janela interativa:

```bash
npm run import:ordem-servico
```

O script chama `POST /api/ordem-servico/import-xml` e grava o retorno completo em `importXML/ordem_servico_import_summary.json`.

Importar em background com log incremental local:

```bash
npm run import:ordem-servico:background
```

Esse runner grava o resumo JSON em `importXML/ordem_servico_import_summary.json` e escreve batidas de andamento em `importXML/ordem_servico_import.log` enquanto aguarda a resposta do endpoint.

Pipeline unico de validacao + importacao:

```bash
npm run pipeline:ordem-servico
```

O pipeline roda a validacao primeiro e so dispara a importacao quando o XML passa. O consolidado final fica em `importXML/ordem_servico_pipeline_summary.json`.

Para aceitar pendencias referenciais parciais ate um limite configuravel, mantendo bloqueio para erro estrutural:

```bash
CHECK_DB_REFERENCES=true PIPELINE_MAX_REFERENCE_ERRORS=10 npm run pipeline:ordem-servico
```

Nesse modo, o pipeline continua quando `structuralValid=true` e `referenceErrorCount <= PIPELINE_MAX_REFERENCE_ERRORS`.

Variáveis opcionais:

```bash
API_BASE_URL=http://localhost:3001
ORDEM_SERVICO_XML_FILE=OrdemServico.xml
ORDEM_SERVICO_VALIDATION_REPORT_PATH=importXML/ordem_servico_validation_summary.json
ORDEM_SERVICO_IMPORT_REPORT_PATH=importXML/ordem_servico_import_summary.json
ORDEM_SERVICO_IMPORT_LOG_PATH=importXML/ordem_servico_import.log
ORDEM_SERVICO_IMPORT_HEARTBEAT_SECONDS=15
ORDEM_SERVICO_PIPELINE_REPORT_PATH=importXML/ordem_servico_pipeline_summary.json
CHECK_DB_REFERENCES=true
PIPELINE_MAX_REFERENCE_ERRORS=0
```
# TEG Financ

Aplicacao React + Vite com API Node para operacoes administrativas, CRUD e importacao XML.

## Comandos

- `npm run api`: sobe a API em `http://localhost:3001`.
- `npm run dev -- --host 0.0.0.0`: sobe o frontend Vite.
- `npm run homol:publish`: executa o fluxo completo da homologacao publicada: para a instancia atual, gera o pacote, sobe a publicacao e prepara a massa operacional usada pelo smoke sem reimportar `Veiculo` por padrao.
- `npm run homol:prepare-smoke`: libera a apuracao financeira operacional da homologacao e reimporta a planilha oficial de `Apontamento Servicos`; a restauracao de `Veiculo` agora e opt-in.
- `npm run homol:smoke`: executa o preparo operacional da homologacao e, na sequencia, roda `smoke:api` contra `http://127.0.0.1:3002`.
- `npm run build`: gera o build de producao.
- `npm run lint`: executa o lint.
- `npm run import:xml:all`: executa a sequencia consolidada de importacao XML para `Marca/Modelo`, `Credenciada`, `Credenciamento Termo`, `Condutor`, `Monitor`, `Vinculo Condutor`, `Vinculo Monitor`, `Veiculo` e `OrdemServico`; `CEP` entra como etapa opcional e so roda quando `importXML/Ceps.xml` existir.
- `npm run smoke:api`: executa o smoke automatizado da API para `Condutor`, `Credenciada`, `OrdemServico`, `Apontamento Servicos` e `Marca/Modelo`; a suite de `Veiculo` fica desativada por padrao para evitar alteracoes automaticas na massa de desenvolvimento.
- `npm run smoke:api:condutor`: executa apenas a suite de `Condutor`.
- `npm run smoke:api:credenciada`: executa apenas a suite de `Credenciada`.
- `npm run smoke:api:veiculo`: executa apenas a suite de `Veiculo`.
- `npm run smoke:api:marca-modelo`: executa apenas a suite de `Marca/Modelo`.

## Smoke Test

O smoke valida os fluxos principais das APIs de `Condutor`, `Credenciada`, `OrdemServico`, `Apontamento Servicos` e `Marca/Modelo` por padrao.

Para incluir `Veiculo` no smoke `all`, rode com:

```powershell
$env:SMOKE_API_INCLUDE_VEICULO='true'; npm run smoke:api
```

Quando a suite de `Veiculo` estiver habilitada, ela valida:

- listagem e ordenacao
- edicao e exclusao de registro importado
- restauracao por reimportacao do XML valido
- importacao invalida e consulta das recusas

No VS Code, as tasks disponiveis sao:

- `smoke api`
- `smoke api condutor`
- `smoke api credenciada`

Para `Veiculo` e `Marca/Modelo`, a execucao pode ser feita pelos scripts `npm run smoke:api:veiculo` e `npm run smoke:api:marca-modelo`.

## Desenvolvimento

- O servidor Vite de desenvolvimento fica fixo em `http://localhost:5173` no host local.
- Pela rede, use o mesmo host/IP da maquina que iniciou o Vite com a porta `5173`.
- As telas HTML legadas ficam acessiveis por caminhos diretos em `src`, por exemplo: `http://HOST:5173/src/termoDataAssinatura.html`.
- Se a porta `5173` estiver ocupada, o Vite agora falha na subida em vez de trocar silenciosamente para outra porta.

## Homologacao

Fluxo validado para atualizar e testar a homologacao publicada:

```bash
npm run homol:publish
npm run homol:smoke
```

Se precisar apenas regerar o pacote sem reiniciar a homologacao publicada, use `npm run homol:build`.

O preparo operacional usa por padrao:

- `API_BASE_URL=http://127.0.0.1:3002`
- `mesAno=04/2026`
- `dreCodigo=11`
- `tipoPessoa=PF`
- planilha `planilha pgto old/old/04 ATESTE BT PF ABR 26.xlsx`

Por padrao, `Veiculo.xml` nao e reimportado. Para restaurar a massa de `Veiculo`, use `--restore-veiculo` ou `HOMOLOG_SMOKE_REIMPORT_VEICULO=true`.

Opcoes uteis:

```bash
node scripts/homologation-control/prepare-homologation-smoke-data.mjs --help
node scripts/homologation-control/prepare-homologation-smoke-data.mjs --base-url http://127.0.0.1:3002
node scripts/homologation-control/prepare-homologation-smoke-data.mjs --restore-veiculo
node scripts/homologation-control/prepare-homologation-smoke-data.mjs --run-smoke
```

## Importacao XML Consolidada

Para atualizar todas as tabelas que ja possuem processo de importacao via XML, execute:

```bash
npm run import:xml:all
```

O runner chama cada endpoint em sequencia e grava o consolidado em `importXML/xml_import_all_summary.json`.

O transporte HTTP do runner nao usa mais o timeout implicito de headers do `fetch`, que encerrava imports longos como `OrdemServico.xml` por volta de 5 minutos. Se precisar impor um limite explicito, use `XML_IMPORT_ALL_REQUEST_TIMEOUT_MS`.

Opcoes uteis:

```bash
node scripts/import-all-xml.mjs --help
node scripts/import-all-xml.mjs --base-url http://127.0.0.1:3002
node scripts/import-all-xml.mjs --only credenciada --only termo
node scripts/import-all-xml.mjs --continue-on-error
XML_IMPORT_ALL_REQUEST_TIMEOUT_MS=900000 node scripts/import-all-xml.mjs
```

Sequencia padrao:

- `marca-modelo.xml`
- `Credenciados.xml`
- `Credenciamento_Termo.xml`
- `Condutor.xml`
- `Monitor.xml`
- `Vinculos_condutor.xml`
- `Vinculos_monitor.xml`
- `Veiculo.xml`
- `OrdemServico.xml`
- `Ceps.xml` como etapa opcional, ignorada quando o arquivo nao existir

## CI

O workflow de GitHub Actions executa as suites de smoke da API com Postgres em jobs separados para `Condutor` e `Credenciada`.

Ele tambem aceita execucao manual por `workflow_dispatch`, com selecao de `all`, `condutor`, `credenciada`, `veiculo` ou `marca-modelo`.

Quando uma suite falha, o workflow publica um artifact com:

- log da API
- log completo do smoke
- relatorio JSON com os logs de importacao
- resumo em Markdown da falha
