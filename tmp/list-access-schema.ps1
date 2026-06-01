$db = 'C:\Users\m089383\Aplicativos\teg_financ\importXML\Credenciamento 2022.accdb'
$cn = New-Object System.Data.Odbc.OdbcConnection("Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$db;")
$cn.Open()
$schema = $cn.GetSchema('Tables') | Where-Object { $_.TABLE_TYPE -eq 'TABLE' } | Select-Object -ExpandProperty TABLE_NAME | Sort-Object
$schema | ForEach-Object { Write-Output $_ }
$cn.Close()
