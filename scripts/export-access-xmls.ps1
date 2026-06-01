param(
  [string]$DbPath = "C:\Users\m089383\Aplicativos\teg_financ\importXML\Credenciamento 2022.accdb",
  [string]$OutputDir = "C:\Users\m089383\Aplicativos\teg_financ\importXML"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -Path $DbPath)) {
  throw "Arquivo Access nao encontrado: $DbPath"
}

if (-not (Test-Path -Path $OutputDir)) {
  throw "Diretorio de saida nao encontrado: $OutputDir"
}

$exports = @(
  @{ Table = 'Condutor'; XmlFile = 'Condutor.xml' },
  @{ Table = 'Credenciados'; XmlFile = 'Credenciados.xml' },
  @{ Table = 'Credenciamento_OS'; XmlFile = 'Credenciamento_OS.xml' },
  @{ Table = 'Credenciamento_OS'; XmlFile = 'OrdemServico.xml'; DefaultRowElement = 'Credenciamento_OS' },
  @{ Table = 'Credenciamento_Termo'; XmlFile = 'Credenciamento_Termo.xml' },
  @{ Table = 'Listagem de Trocas'; XmlFile = 'Listagem de Trocas.xml' },
  @{ Table = 'Veiculo'; XmlFile = 'marca-modelo.xml'; DefaultRowElement = 'marca-modelo'; Query = 'SELECT DISTINCT [Marca_modelo] FROM [Veiculo] WHERE [Marca_modelo] IS NOT NULL ORDER BY [Marca_modelo]'; ColumnMap = @{ 'Marca_modelo' = 'marca_modelo' } },
  @{ Table = 'Monitor'; XmlFile = 'Monitor.xml' },
  @{ Table = 'Seguradoras'; XmlFile = 'Seguradoras.xml' },
  @{ Table = 'Veiculo'; XmlFile = 'Veiculo.xml' },
  @{ Table = 'Vinculos_condutor'; XmlFile = 'Vinculos_condutor.xml' },
  @{ Table = 'Vinculos_monitor'; XmlFile = 'Vinculos_monitor.xml' }
)

function Escape-XmlText {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return $null
  }

  return [System.Security.SecurityElement]::Escape($Value)
}

function Convert-ToXmlValue {
  param([object]$Value)

  if ($null -eq $Value -or $Value -is [System.DBNull]) {
    return $null
  }

  if ($Value -is [DateTime]) {
    return $Value.ToString('yyyy-MM-ddTHH:mm:ss', [System.Globalization.CultureInfo]::InvariantCulture)
  }

  if ($Value -is [System.IFormattable]) {
    return $Value.ToString($null, [System.Globalization.CultureInfo]::InvariantCulture)
  }

  return [string]$Value
}

function Get-RowElementName {
  param(
    [string]$XmlPath,
    [string]$DefaultName
  )

  try {
    [xml]$existingXml = Get-Content -Path $XmlPath -Encoding UTF8
    $firstNode = $existingXml.dataroot.ChildNodes | Select-Object -First 1
    if ($null -ne $firstNode -and -not [string]::IsNullOrWhiteSpace($firstNode.Name)) {
      return $firstNode.Name
    }
  } catch {
    # If current XML is malformed or empty, fallback to table name-based element.
  }

  return $DefaultName.Replace(' ', '_x0020_')
}

function Export-TitularSpreadsheetXml {
  param(
    [System.Data.Odbc.OdbcConnection]$Connection,
    [string]$OutputFilePath
  )

  $cmd = $Connection.CreateCommand()
  $cmd.CommandText = 'SELECT * FROM [Credenciados] ORDER BY 1'
  $reader = $cmd.ExecuteReader()

  $rows = New-Object System.Collections.Generic.List[object]
  while ($reader.Read()) {
    $codigoIndex = 0
    $titularIndex = 1
    $cnpjCpfIndex = 2

    $rows.Add([PSCustomObject]@{
      Codigo = Convert-ToXmlValue -Value $reader.GetValue($codigoIndex)
      CnpjCpf = Convert-ToXmlValue -Value $reader.GetValue($cnpjCpfIndex)
      Titular = Convert-ToXmlValue -Value $reader.GetValue($titularIndex)
    })
  }
  $reader.Close()

  $createdAtUtc = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ', [System.Globalization.CultureInfo]::InvariantCulture)
  $rowCountWithHeader = $rows.Count + 1

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine('<?xml version="1.0"?>')
  [void]$sb.AppendLine('<?mso-application progid="Excel.Sheet"?>')
  [void]$sb.AppendLine('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">')
  [void]$sb.AppendLine(' <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">')
  [void]$sb.AppendLine('  <Author>export-access-xmls</Author>')
  [void]$sb.AppendLine('  <LastAuthor>export-access-xmls</LastAuthor>')
  [void]$sb.AppendLine('  <Created>' + $createdAtUtc + '</Created>')
  [void]$sb.AppendLine('  <LastSaved>' + $createdAtUtc + '</LastSaved>')
  [void]$sb.AppendLine('  <Version>16.00</Version>')
  [void]$sb.AppendLine(' </DocumentProperties>')
  [void]$sb.AppendLine(' <Worksheet ss:Name="Planilha1">')
  [void]$sb.AppendLine('  <Table ss:ExpandedColumnCount="3" ss:ExpandedRowCount="' + $rowCountWithHeader + '" x:FullColumns="1" x:FullRows="1">')
  [void]$sb.AppendLine('   <Row>')
  [void]$sb.AppendLine('    <Cell><Data ss:Type="String">CODIGO</Data></Cell>')
  [void]$sb.AppendLine('    <Cell><Data ss:Type="String">CNPJ_CPF</Data></Cell>')
  [void]$sb.AppendLine('    <Cell><Data ss:Type="String">Titular</Data></Cell>')
  [void]$sb.AppendLine('   </Row>')

  foreach ($row in $rows) {
    $codigo = Escape-XmlText -Value $row.Codigo
    $cnpjCpf = Escape-XmlText -Value $row.CnpjCpf
    $titular = Escape-XmlText -Value $row.Titular

    if ([string]::IsNullOrWhiteSpace($codigo)) {
      $codigo = ''
    }
    if ([string]::IsNullOrWhiteSpace($cnpjCpf)) {
      $cnpjCpf = ''
    }
    if ([string]::IsNullOrWhiteSpace($titular)) {
      $titular = ''
    }

    [void]$sb.AppendLine('   <Row>')
    [void]$sb.AppendLine('    <Cell><Data ss:Type="String">' + $codigo + '</Data></Cell>')
    [void]$sb.AppendLine('    <Cell><Data ss:Type="String">' + $cnpjCpf + '</Data></Cell>')
    [void]$sb.AppendLine('    <Cell><Data ss:Type="String">' + $titular + '</Data></Cell>')
    [void]$sb.AppendLine('   </Row>')
  }

  [void]$sb.AppendLine('  </Table>')
  [void]$sb.AppendLine(' </Worksheet>')
  [void]$sb.AppendLine('</Workbook>')

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($OutputFilePath, $sb.ToString(), $utf8NoBom)

  return $rows.Count
}

$conn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$DbPath;")
$conn.Open()

$exportSummary = @()

try {
  foreach ($item in $exports) {
    $tableName = $item.Table
    $xmlFileName = $item.XmlFile
    $xmlPath = Join-Path -Path $OutputDir -ChildPath $xmlFileName
    $xsdFileName = [System.IO.Path]::GetFileNameWithoutExtension($xmlFileName) + '.xsd'
    $defaultRowName = if ($item.ContainsKey('DefaultRowElement')) { [string]$item.DefaultRowElement } else { [string]$tableName }
    $rowElementName = Get-RowElementName -XmlPath $xmlPath -DefaultName $defaultRowName

    $command = $conn.CreateCommand()
    if ($item.ContainsKey('Query')) {
      $command.CommandText = [string]$item.Query
    } else {
      $command.CommandText = "SELECT * FROM [$tableName]"
    }
    $reader = $command.ExecuteReader()

    $timestamp = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
    $sb = New-Object System.Text.StringBuilder

    [void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
    [void]$sb.AppendLine('<dataroot xmlns:od="urn:schemas-microsoft-com:officedata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xsi:noNamespaceSchemaLocation="' + $xsdFileName + '" generated="' + $timestamp + '">')

    $rowCount = 0
    while ($reader.Read()) {
      [void]$sb.AppendLine('<' + $rowElementName + '>')

      for ($i = 0; $i -lt $reader.FieldCount; $i++) {
        $columnName = $reader.GetName($i)
        if ($item.ContainsKey('ColumnMap') -and $item.ColumnMap.ContainsKey($columnName)) {
          $columnName = [string]$item.ColumnMap[$columnName]
        }
        $rawValue = $reader.GetValue($i)
        $xmlValue = Convert-ToXmlValue -Value $rawValue

        if ($null -eq $xmlValue) {
          continue
        }

        $escapedColumnName = Escape-XmlText -Value $columnName
        $escapedValue = Escape-XmlText -Value $xmlValue
        [void]$sb.AppendLine('<' + $escapedColumnName + '>' + $escapedValue + '</' + $escapedColumnName + '>')
      }

      [void]$sb.AppendLine('</' + $rowElementName + '>')
      $rowCount++
    }

    [void]$sb.AppendLine('</dataroot>')

    $reader.Close()

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($xmlPath, $sb.ToString(), $utf8NoBom)

    $exportSummary += [PSCustomObject]@{
      Table = $tableName
      Xml = $xmlFileName
      Rows = $rowCount
    }
  }

  $titularPath = Join-Path -Path $OutputDir -ChildPath 'titular.xml'
  $titularRows = Export-TitularSpreadsheetXml -Connection $conn -OutputFilePath $titularPath
  $exportSummary += [PSCustomObject]@{
    Table = 'Credenciados'
    Xml = 'titular.xml'
    Rows = $titularRows
  }
}
finally {
  if ($conn.State -eq [System.Data.ConnectionState]::Open) {
    $conn.Close()
  }
}

$exportSummary |
  Sort-Object Table |
  Format-Table -AutoSize
