# Roteiro de Homologacao - OrdemServico Rascunho

## Objetivo

Validar o comportamento da OrdemServico nos fluxos de `Corrigir`, `Rascunho`, `Ativar` e `Substituir`, incluindo a restauracao das validacoes obrigatorias ao retornar para `Ativo`.

## Ambiente

- URL web: `http://10.36.144.147:4173`
- URL API: `http://127.0.0.1:3002`
- Data da evidência: `2026-05-06`

## Cenarios validados

### 1. Corrigir OS ativa para Rascunho

**Objetivo**

Confirmar que a transicao para `Rascunho` so ocorre a partir de uma OS `Ativo`, via acao `Corrigir`.

**Resultado esperado**

- A opcao `Rascunho` fica disponivel ao corrigir uma OS ativa.
- A gravacao em `Rascunho` permite alteracoes sem validacoes de vinculo bloqueantes.

**Resultado obtido**

- Validado com sucesso em homologacao.

### 2. Gravacao em Rascunho com CPF e CRM ja utilizados em OS ativa

**Objetivo**

Confirmar que, mantendo a OS em `Rascunho`, e permitido gravar CPF de condutor, CPF de monitor e CRM ja vinculados a outra OS ativa, sem mensagem de erro impeditiva.

**Resultado esperado**

- A OS em `Rascunho` aceita a gravacao.
- Nao ha bloqueio por conflito de CPF ou CRM enquanto permanecer em `Rascunho`.

**Resultado obtido**

- Validado com sucesso em homologacao.

### 3. Retorno de Rascunho para Ativo

**Objetivo**

Confirmar que, ao voltar de `Rascunho` para `Ativo`, todas as validacoes de consistencia voltam a ser executadas.

**Resultado esperado**

- A gravacao e bloqueada quando existirem conflitos com outra OS ativa.
- O sistema apresenta mensagem de erro clara.

**Resultado obtido**

- Validado com sucesso em homologacao.
- Exemplo observado: `CPF do condutor ja esta vinculado a OrdemServico ativa 11111118 como condutor.`

### 4. Substituir OS em Rascunho

**Objetivo**

Confirmar que, ao acionar `Substituir` em uma OS em `Rascunho`, a nova revisao e preparada normalmente, a tela apresenta a situacao como `Ativo`, os campos ficam bloqueados para edicao e o salvar executa validacao completa de OS ativa.

**Resultado esperado**

- A revisao e incrementada normalmente.
- A situacao exibida em tela fica `Ativo`.
- Os atributos da OS ficam bloqueados para alteracao.
- O botao de salvar permanece disponivel.
- Qualquer inconsistencia impede a gravacao e exibe mensagem de erro.

**Resultado obtido**

- Validado com sucesso em homologacao.
- O formulario abriu com situacao `Ativo` e campos bloqueados.
- O salvar permaneceu habilitado.
- A gravacao foi recusada com `409` devido ao conflito de CPF de condutor em OS ativa.

### 5. Restricao visual para Rascunho fora de OS ativa

**Objetivo**

Confirmar que uma OS nao ativa nao pode ser enviada para `Rascunho` fora do contexto permitido.

**Resultado esperado**

- A opcao `Rascunho` fica indisponivel em cenarios nao suportados.

**Resultado obtido**

- Validado com sucesso em homologacao.

### 6. Correcao do erro `executor.query is not a function`

**Objetivo**

Confirmar a eliminacao do erro interno causado pelo uso indevido de parametro de negocio como executor de banco durante a validacao de OrdemServico.

**Resultado esperado**

- A operacao `PUT` nao retorna mais erro interno `500` com a mensagem `executor.query is not a function`.

**Resultado obtido**

- Validado com sucesso em homologacao.
- A mesma classe de requisicao passou a responder normalmente pela regra funcional da API.

## Estado final dos registros de teste

- OS `11111169` confirmada como `Ativo` ao final da validacao.
- Viculos principais restaurados para os valores originais.

## Conclusao

Os fluxos de `Corrigir`, `Rascunho`, `Ativar` e `Substituir` foram validados em homologacao conforme a regra solicitada, incluindo o restabelecimento das validacoes ao retornar para `Ativo` e a correcao do erro interno relacionado a `executor.query`.