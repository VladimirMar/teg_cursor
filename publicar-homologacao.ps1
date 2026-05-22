$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$homologApiHealthUrl = 'http://127.0.0.1:3002/api/veiculo?page=1&pageSize=1'
$homologApiMaxAttempts = 30

function Wait-HomologApi {
  for ($attempt = 1; $attempt -le $homologApiMaxAttempts; $attempt++) {
    try {
      Invoke-WebRequest -UseBasicParsing $homologApiHealthUrl | Out-Null
      return
    } catch {
      if ($attempt -eq $homologApiMaxAttempts) {
        throw 'A API de homologacao nao respondeu dentro do prazo apos a publicacao.'
      }

      Start-Sleep -Seconds 1
    }
  }
}

Push-Location $projectRoot
try {
  npm run homol:stop
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao parar a homologacao atual.'
  }

  npm run homol:build
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao publicar a homologacao.'
  }

  npm run homol:start
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao iniciar a homologacao publicada.'
  }

  Wait-HomologApi

  npm run homol:prepare-smoke
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao preparar a massa operacional da homologacao.'
  }
} finally {
  Pop-Location
}

Write-Host 'Publicacao de homologacao concluida com preparo operacional.'