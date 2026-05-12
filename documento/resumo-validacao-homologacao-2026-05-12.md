# Resumo formal da validacao de homologacao

Data: 2026-05-12
Ambiente web: http://10.36.144.147:4173/
Ambiente API: http://127.0.0.1:3002

## Objetivo

Validar a atualizacao da homologacao e corrigir as falhas observadas nas rotinas de smoke de Condutor e Veiculo.

## Comandos executados

### Publicacao e inicializacao

```powershell
npm run homol:stop
npm run homol:publish
npm run homol:start
```

Resultado:
- Publicacao concluida com sucesso.
- Runtime atualizado em `.homolog/runtime`.
- Web e API iniciadas com sucesso.

### Validacao de build e sintaxe

```powershell
node --check server.js
npm run build
```

Resultado:
- Validacoes concluidas com sucesso.

### Diagnostico de homologacao

```powershell
node tmp/inspect-homol-veiculo-state.cjs
node tmp/compare-special-conventional-formula-state.cjs
node tmp/compare-financial-config-counts.cjs
node tmp/compare-special-conventional-payment-rows.cjs
node tmp/inspect-tipo-pgto-rows.cjs
```

Diagnostico encontrado:
- `tipo_bancada` em homologacao estava poluida com descricoes invalidas (`Convencionalll`, `Crecheeee`).
- As tabelas de configuracao financeira da homologacao estavam incompletas em relacao ao banco principal.
- `tipo_pgto` em homologacao estava com as descricoes invertidas entre os codigos `1` e `2`.
- A falha inicial de `Veiculo` mudou de `Tipo de bancada invalido.` para falta de parametros de recalculo, confirmando que havia mais de uma causa de ambiente.
- A falha de `Condutor` nao se reproduziu apos ressincronizacao e validacao dirigida.

### Correcao aplicada

Codigo:

```powershell
node --check server.js
```

Ajuste realizado no backend:
- `server.js` passou a semear os tipos canonicos de `tipo_bancada`: `Acessivel`, `Convencional`, `Creche` durante o bootstrap de schema.

Ajustes de dados em homologacao:

```powershell
node tmp/repair-homol-financial-config.cjs
node tmp/repair-homol-tipo-pgto.cjs
node -e "const base='http://127.0.0.1:3002'; const headers={'content-type':'application/json'}; (async()=>{ const veiculo=await fetch(base+'/api/veiculo/import-xml',{method:'POST',headers,body:JSON.stringify({fileName:'Veiculo.xml'})}); console.log('veiculo', veiculo.status, JSON.stringify(await veiculo.json())); const condutor=await fetch(base+'/api/condutor/import-xml',{method:'POST',headers,body:JSON.stringify({fileName:'Condutor.xml'})}); console.log('condutor', condutor.status, JSON.stringify(await condutor.json())); })()"
```

Resultado da correcao:
- Catalogo `tipo_bancada` normalizado para os valores canonicos.
- Parametrizacao financeira da homologacao alinhada ao banco principal.
- Catalogo `tipo_pgto` corrigido para:
  - `1 = Fixo`
  - `2 = Per capita`
- Reimportacao de `Veiculo.xml` concluida com sucesso.
- Reimportacao de `Condutor.xml` concluida com sucesso.

## Validacao final

### Disponibilidade

```powershell
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:3002/api/ordem-servico?page=1&pageSize=1" | Select-Object -ExpandProperty StatusCode
Invoke-WebRequest -UseBasicParsing "http://10.36.144.147:4173/" | Select-Object -ExpandProperty StatusCode
```

Resultado:
- API: `200`
- Web: `200`

### Smoke Veiculo

```powershell
$env:API_BASE_URL='http://127.0.0.1:3002'
node scripts/smoke-api.mjs veiculo
```

Resultado:
- Smoke concluido com sucesso.
- Evidencias principais:
  - edicao do registro importado `4141` ok
  - exclusao do registro importado `4141` ok
  - importacao valida do veiculo: `5502` processados, `5501` alterados, `1` incluido, `206` recusados
  - reimportacao valida e restauracao do registro `4141` ok
  - importacao invalida e painel de recusas ok

Observacao:
- As `206` recusas pertencem ao conteudo do XML de origem e nao impediram a passagem do smoke.

### Smoke Condutor

```powershell
$env:API_BASE_URL='http://127.0.0.1:3002'
node scripts/smoke-api.mjs condutor
```

Resultado:
- Smoke concluido com sucesso.
- Evidencias principais:
  - edicao do registro importado `10000` ok
  - exclusao do registro importado `10000` ok
  - importacao valida do condutor: `8005` processados, `8004` alterados, `1` incluido, `4` recusados
  - reimportacao valida e restauracao do registro `10000` ok
  - importacao invalida e painel de recusas ok

Observacao:
- As `4` recusas pertencem ao conteudo do XML de origem e ja eram esperadas no fluxo.

## Conclusao

Status final da homologacao: aprovado.

Itens corrigidos:
- Falha de `Veiculo` em homologacao corrigida.
- Falha de `Condutor` em homologacao nao reproduzida apos ressincronizacao e smoke final aprovado.
- Ambiente web e API validados com sucesso apos a publicacao.
