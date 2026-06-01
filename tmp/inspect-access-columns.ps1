$db = 'C:\Users\m089383\Aplicativos\teg_financ\importXML\Credenciamento 2022.accdb'
$tables = @('Credenciamento_OS','Credenciados','Publicados','OS_emitida_SME','OS_anteriores_as_trocas')
$cn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$db;")
$cn.Open()
foreach ($t in $tables) {
  Write-Output "=== $t ==="
  $dt = $cn.GetSchema('Columns', @($null,$null,$t,$null))
  $dt | Sort-Object ORDINAL_POSITION | Select-Object -ExpandProperty COLUMN_NAME | ForEach-Object { Write-Output $_ }
}
$cn.Close()
