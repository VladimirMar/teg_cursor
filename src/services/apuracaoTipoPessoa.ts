export const APURACAO_TIPO_PESSOA_OPTIONS = [
  { value: 'PF', label: 'Pessoa Física' },
  { value: 'PJ', label: 'Pessoa Jurídica' },
] as const

export type ApuracaoTipoPessoa = (typeof APURACAO_TIPO_PESSOA_OPTIONS)[number]['value']

export const APURACAO_TIPO_PESSOA_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  ...APURACAO_TIPO_PESSOA_OPTIONS,
] as const

export type ApuracaoTipoPessoaFilter = (typeof APURACAO_TIPO_PESSOA_FILTER_OPTIONS)[number]['value']

export const formatApuracaoTipoPessoaLabel = (value: string) => {
  return APURACAO_TIPO_PESSOA_OPTIONS.find((item) => item.value === value)?.label || value
}
