$dbPath = 'C:\Users\m089383\Aplicativos\teg_financ\importXML\Credenciamento 2022.accdb'
$outPath = 'C:\Users\m089383\Aplicativos\teg_financ\importXML\Seguradoras.xml'

$conn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$dbPath;")
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = 'SELECT [Código], [Controle], [Lista] FROM [Seguradoras] ORDER BY [Controle], [Código]'
$reader = $cmd.ExecuteReader()

$timestamp = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
$sb = New-Object System.Text.StringBuilder

[void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
[void]$sb.AppendLine('<dataroot xmlns:od="urn:schemas-microsoft-com:officedata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xsi:noNamespaceSchemaLocation="Seguradoras.xsd" generated="' + $timestamp + '">')

while ($reader.Read()) {
  $codigo = if ($reader.IsDBNull(0)) { '' } else { [string]$reader.GetValue(0) }
  $controle = if ($reader.IsDBNull(1)) { '' } else { [string]$reader.GetValue(1) }
  $lista = if ($reader.IsDBNull(2)) { '' } else { [string]$reader.GetValue(2) }

  $codigo = [System.Security.SecurityElement]::Escape($codigo)
  $controle = [System.Security.SecurityElement]::Escape($controle)
  $lista = [System.Security.SecurityElement]::Escape($lista)

  [void]$sb.AppendLine('<Seguradoras>')
  [void]$sb.AppendLine('<Código>' + $codigo + '</Código>')
  [void]$sb.AppendLine('<Controle>' + $controle + '</Controle>')
  [void]$sb.AppendLine('<Lista>' + $lista + '</Lista>')
  [void]$sb.AppendLine('</Seguradoras>')
}

[void]$sb.AppendLine('</dataroot>')

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outPath, $sb.ToString(), $utf8NoBom)

$reader.Close()
$conn.Close()

Write-Host "Arquivo gerado: $outPath"
