$dbPath = 'C:\Users\m089383\Aplicativos\teg_financ\importXML\Credenciamento 2022.accdb'
$outDir = 'C:\Users\m089383\Aplicativos\teg_financ\importXML'
$conn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$dbPath;")
$conn.Open()

function Esc([string]$v){ if($null -eq $v){ return $null }; return [System.Security.SecurityElement]::Escape($v) }
function ToVal([object]$v){ if($null -eq $v -or $v -is [System.DBNull]){ return $null }; if($v -is [DateTime]){ return $v.ToString('yyyy-MM-ddTHH:mm:ss',[System.Globalization.CultureInfo]::InvariantCulture) }; if($v -is [System.IFormattable]){ return $v.ToString($null,[System.Globalization.CultureInfo]::InvariantCulture) }; return [string]$v }

function Export-DataRoot([string]$xmlFile,[string]$xsd,[string]$rowElement,[string]$sql,[hashtable]$colMap){
  $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql; $r = $cmd.ExecuteReader()
  $sb = New-Object System.Text.StringBuilder
  $ts = Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'
  [void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
  [void]$sb.AppendLine('<dataroot xmlns:od="urn:schemas-microsoft-com:officedata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xsi:noNamespaceSchemaLocation="'+$xsd+'" generated="'+$ts+'">')
  $count=0
  while($r.Read()){
    [void]$sb.AppendLine('<'+$rowElement+'>')
    for($i=0;$i -lt $r.FieldCount;$i++){
      $name=$r.GetName($i)
      if($null -ne $colMap -and $colMap.ContainsKey($name)){ $name = [string]$colMap[$name] }
      $val=ToVal $r.GetValue($i)
      if($null -eq $val){ continue }
      $name=Esc $name; $val=Esc $val
      [void]$sb.AppendLine('<'+$name+'>'+$val+'</'+$name+'>')
    }
    [void]$sb.AppendLine('</'+$rowElement+'>')
    $count++
  }
  [void]$sb.AppendLine('</dataroot>')
  $r.Close()
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path $outDir $xmlFile), $sb.ToString(), $enc)
  Write-Output ($xmlFile + ' => ' + $count)
}

Export-DataRoot -xmlFile 'OrdemServico.xml' -xsd 'OrdemServico.xsd' -rowElement 'Credenciamento_OS' -sql 'SELECT * FROM [Credenciamento_OS]' -colMap $null
Export-DataRoot -xmlFile 'marca-modelo.xml' -xsd 'marca-modelo.xsd' -rowElement 'marca-modelo' -sql 'SELECT DISTINCT [Marca_modelo] FROM [Veiculo] WHERE [Marca_modelo] IS NOT NULL ORDER BY [Marca_modelo]' -colMap @{ 'Marca_modelo'='marca_modelo' }

$cmdT = $conn.CreateCommand(); $cmdT.CommandText = 'SELECT [C?digo], [CNPJ_CPF], [Credenciado] FROM [Credenciados] ORDER BY [C?digo]'; $rt = $cmdT.ExecuteReader()
$rows = New-Object System.Collections.Generic.List[object]
while($rt.Read()){
  $rows.Add([PSCustomObject]@{ Codigo=(ToVal $rt.GetValue(0)); CnpjCpf=(ToVal $rt.GetValue(1)); Titular=(ToVal $rt.GetValue(2)) })
}
$rt.Close()
$created=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ',[System.Globalization.CultureInfo]::InvariantCulture)
$sbT=New-Object System.Text.StringBuilder
[void]$sbT.AppendLine('<?xml version="1.0"?>')
[void]$sbT.AppendLine('<?mso-application progid="Excel.Sheet"?>')
[void]$sbT.AppendLine('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">')
[void]$sbT.AppendLine(' <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>export-access-xmls</Author><LastAuthor>export-access-xmls</LastAuthor><Created>'+$created+'</Created><LastSaved>'+$created+'</LastSaved><Version>16.00</Version></DocumentProperties>')
[void]$sbT.AppendLine(' <Worksheet ss:Name="Planilha1"><Table ss:ExpandedColumnCount="3" ss:ExpandedRowCount="'+($rows.Count+1)+'" x:FullColumns="1" x:FullRows="1">')
[void]$sbT.AppendLine('  <Row><Cell><Data ss:Type="String">CODIGO</Data></Cell><Cell><Data ss:Type="String">CNPJ_CPF</Data></Cell><Cell><Data ss:Type="String">Titular</Data></Cell></Row>')
foreach($row in $rows){
  $c=Esc ([string]$row.Codigo); if($null -eq $c){$c=''}
  $d=Esc ([string]$row.CnpjCpf); if($null -eq $d){$d=''}
  $t=Esc ([string]$row.Titular); if($null -eq $t){$t=''}
  [void]$sbT.AppendLine('  <Row><Cell><Data ss:Type="String">'+$c+'</Data></Cell><Cell><Data ss:Type="String">'+$d+'</Data></Cell><Cell><Data ss:Type="String">'+$t+'</Data></Cell></Row>')
}
[void]$sbT.AppendLine(' </Table></Worksheet></Workbook>')
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $outDir 'titular.xml'), $sbT.ToString(), $enc)
Write-Output ('titular.xml => ' + $rows.Count)

$conn.Close()
