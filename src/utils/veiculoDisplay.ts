export const formatVeiculoOsEspecialDisplay = (value?: string | null) => {
  const normalizedValue = (value ?? '').trim()

  if (!normalizedValue) {
    return 'Não'
  }

  const normalizedKey = normalizedValue
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')

  if (normalizedKey === 'sim') {
    return 'Sim'
  }

  if (normalizedKey === 'nao') {
    return 'Não'
  }

  return normalizedValue
}
