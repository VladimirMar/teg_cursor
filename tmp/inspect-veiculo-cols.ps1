$db = 'C:\Users\m089383\Aplicativos\teg_financ\importXML\Credenciamento 2022.accdb'
$cn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$db;")
$cn.Open()
$cmd = $cn.CreateCommand()
$cmd.CommandText = "SELECT * FROM [Veiculo] WHERE 1=0"
$r = $cmd.ExecuteReader()
for ($i=0; $i -lt $r.FieldCount; $i++) { Write-Output $r.GetName($i) }
$r.Close()
$cmd2 = $cn.CreateCommand()
$cmd2.CommandText = "SELECT TOP 5 [Marca_modelo] FROM [Veiculo] WHERE [Marca_modelo] IS NOT NULL"
$r2 = $cmd2.ExecuteReader()
Write-Output '=== SAMPLE ==='
while ($r2.Read()) { Write-Output ([string]$r2.GetValue(0)) }
$r2.Close()
$cn.Close()
