$db='C:\Users\m089383\Aplicativos\teg_financ\access\Credenciamento 2022.accdb'
$cn=New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$db;")
$cn.Open()
$cmd=$cn.CreateCommand()
$cmd.CommandText='SELECT [Marca_modelo] FROM [Veiculo]'
$r=$cmd.ExecuteReader()
$total=0
$invalidos=0
while($r.Read()){
  $total++
  $val = if($r.IsDBNull(0)){''} else {[string]$r.GetValue(0)}
  if([string]::IsNullOrWhiteSpace($val)){ $invalidos++ }
}
$r.Close(); $cn.Close()
Write-Output ('total=' + $total + ' invalidos=' + $invalidos)
