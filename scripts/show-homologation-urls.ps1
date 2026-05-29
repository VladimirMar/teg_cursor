param(
  [int]$Port = 4173,
  [string]$Scheme = 'http'
)

$ipv4Addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -ne '127.0.0.1' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.PrefixOrigin -ne 'WellKnown'
  } |
  Select-Object -ExpandProperty IPAddress -Unique

if (-not $ipv4Addresses) {
  Write-Host "Nenhum IPv4 de rede encontrado. Use ${Scheme}://127.0.0.1:$Port localmente."
  exit 0
}

Write-Host 'URLs de homologacao para compartilhar:'
Write-Host "- ${Scheme}://127.0.0.1:$Port (local)"

foreach ($ip in $ipv4Addresses) {
  Write-Host "- ${Scheme}://${ip}:$Port"
}

$preferredIp = $ipv4Addresses[0]
Write-Host ''
Write-Host 'Sugestao para arquivo hosts da outra maquina:'
Write-Host "$preferredIp homolog.local"