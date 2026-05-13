export const APURACAO_TIPO_PESSOA_OPTIONS = [
  { value: 'PF', label: 'Pessoa Fisica' },
  { value: 'PJ', label: 'Pessoa Juridica e Cooperativa' },
] as const

export type ApuracaoTipoPessoa = (typeof APURACAO_TIPO_PESSOA_OPTIONS)[number]['value']

export const formatApuracaoTipoPessoaLabel = (value: string) => {
  return APURACAO_TIPO_PESSOA_OPTIONS.find((item) => item.value === value)?.label || value
}
