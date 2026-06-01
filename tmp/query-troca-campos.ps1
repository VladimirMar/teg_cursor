$db = 'C:\Users\m089383\Aplicativos\teg_financ\access\Credenciamento 2022.accdb'
$cn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$db;")
$cn.Open()
$cmd = $cn.CreateCommand()
$cmd.CommandText = 'SELECT [Código], [OS], [Campo_de_Troca] FROM [Credenciamento_OS] WHERE [Código] IN (1411,1412,2865) ORDER BY [Código]'
$r = $cmd.ExecuteReader()
while ($r.Read()) {
  $codigo = [string]$r.GetValue(0)
  $os = [string]$r.GetValue(1)
  $campo = if ($r.IsDBNull(2)) { '' } else { [string]$r.GetValue(2) }
  Write-Output ($codigo + '|' + $os + '|' + $campo)
}
$r.Close()
$cn.Close()
