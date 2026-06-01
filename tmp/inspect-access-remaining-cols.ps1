$db = 'C:\Users\m089383\Aplicativos\teg_financ\importXML\Credenciamento 2022.accdb'
$tables = @('Condutor','Credenciamento_Termo','Veiculo','Vinculos_condutor','Vinculos_monitor','Listagem de Trocas')
$cn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$db;")
$cn.Open()
foreach ($t in $tables) {
  Write-Output "=== $t ==="
  $cmd = $cn.CreateCommand(); $cmd.CommandText = "SELECT * FROM [$t] WHERE 1=0"
  $r = $cmd.ExecuteReader()
  for ($i = 0; $i -lt $r.FieldCount; $i++) { Write-Output $r.GetName($i) }
  $r.Close()
}
$cn.Close()
