$db = 'C:\Users\m089383\Aplicativos\teg_financ\access\Credenciamento 2022.accdb'
$cn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$db;")
$cn.Open()
$cmd = $cn.CreateCommand()
$cmd.CommandText = 'SELECT [Código], [Campo_de_Troca] FROM [Credenciamento_OS] WHERE [Código] IN (1411,1412,2865) ORDER BY [Código]'
$r = $cmd.ExecuteReader()
while ($r.Read()) {
  $codigo = [string]$r.GetValue(0)
  $campo = if ($r.IsDBNull(1)) { '' } else { [string]$r.GetValue(1) }
  $codes = ($campo.ToCharArray() | ForEach-Object { [int][char]$_ }) -join ','
  Write-Output ($codigo + '|' + $campo)
  Write-Output ('CODES:' + $codes)
}
$r.Close()
$cn.Close()
