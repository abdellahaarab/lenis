param([ValidateSet('Start', 'Stop')][string]$Action = 'Start', [string]$DataRoot = '', [string]$PostgresBin = '', [int]$Port = 55432)
$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $DataRoot) {
  $DataRoot = if ($env:ALJEEL_PG_DATA_ROOT) { $env:ALJEEL_PG_DATA_ROOT } elseif (Test-Path 'E:\') { 'E:\Aljeel-dev\lenis-admin' } else { Join-Path $workspaceRoot '.temp/local-postgres' }
}
$DataRoot = [IO.Path]::GetFullPath($DataRoot)
if (-not $PostgresBin) {
  $PostgresBin = if ($env:LOCAL_PG_BIN) { $env:LOCAL_PG_BIN } elseif (Test-Path 'C:\Program Files\PostgreSQL\16\bin\initdb.exe') { 'C:\Program Files\PostgreSQL\16\bin' } else { 'C:\Program Files\PostgreSQL\18\bin' }
}
if (-not (Test-Path (Join-Path $PostgresBin 'initdb.exe'))) { throw 'Install PostgreSQL locally or set LOCAL_PG_BIN to its bin directory.' }
$marker = Join-Path $DataRoot 'workspace.txt'
$dataPath = Join-Path $DataRoot 'data'
if (Test-Path -LiteralPath $DataRoot) {
  if (-not (Test-Path -LiteralPath $marker) -or [IO.File]::ReadAllText($marker) -ne $workspaceRoot) { throw 'This database directory does not belong to this workspace. Select a new ALJEEL_PG_DATA_ROOT.' }
}
if ($Action -eq 'Stop') {
  if (Test-Path (Join-Path $dataPath 'PG_VERSION')) {
    & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataPath status | Out-Null
    if ($LASTEXITCODE -eq 0) {
      & (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataPath -m fast -w stop
      if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not stop.' }
    }
  }
  exit 0
}
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Invalid local database port.' }
$envPath = Join-Path $workspaceRoot '.env'
if (-not (Test-Path -LiteralPath $envPath)) { throw 'Run npm run env:init first.' }
$envText = [IO.File]::ReadAllText($envPath)
$values = @{}
foreach ($line in ($envText -split '\r?\n')) {
  if ($line -match '^([A-Z_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2] }
}
$dbUser = $values['POSTGRES_USER']; $dbName = $values['POSTGRES_DB']; $dbPassword = $values['POSTGRES_PASSWORD']
if ($dbUser -notmatch '^[a-z][a-z0-9_]*$' -or $dbName -notmatch '^[a-z][a-z0-9_]*$' -or -not $dbPassword) { throw 'Set valid POSTGRES_USER, POSTGRES_DB and POSTGRES_PASSWORD in the ignored .env.' }
if (-not (Test-Path -LiteralPath $DataRoot)) {
  New-Item -ItemType Directory -Path $DataRoot | Out-Null
  [IO.File]::WriteAllText($marker, $workspaceRoot)
}
if (-not (Test-Path (Join-Path $dataPath 'PG_VERSION'))) {
  if (Test-Path -LiteralPath $dataPath) { throw 'An incomplete database directory exists. Preserve it and choose another ALJEEL_PG_DATA_ROOT.' }
  $passwordFile = Join-Path $DataRoot ('.init-password-' + [guid]::NewGuid().ToString('N'))
  try {
    [IO.File]::WriteAllText($passwordFile, $dbPassword)
    & (Join-Path $PostgresBin 'initdb.exe') -D $dataPath -U $dbUser --auth=scram-sha-256 --pwfile=$passwordFile --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed.' }
  } finally {
    if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile -Force }
  }
}
& (Join-Path $PostgresBin 'pg_ctl.exe') -D $dataPath status | Out-Null
if ($LASTEXITCODE -ne 0) {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
  try { $listener.Start() } finally { $listener.Stop() }
  # Use a separate hidden console so a terminal Ctrl+C cannot kill PostgreSQL mid-write.
  $startArguments = @('-D', ('"' + $dataPath + '"'), '-l', ('"' + (Join-Path $DataRoot 'postgres.log') + '"'), '-o', ('"-p ' + $Port + ' -h 127.0.0.1"'), '-w', 'start')
  $postgresStart = Start-Process -FilePath (Join-Path $PostgresBin 'pg_ctl.exe') -ArgumentList $startArguments -WindowStyle Hidden -PassThru
  # Wait for pg_ctl only; Start-Process -Wait also waits for its persistent server child.
  $postgresStart.WaitForExit()
  if ($postgresStart.ExitCode -ne 0) { throw 'PostgreSQL did not start. Check the local postgres.log.' }
}
$previousPassword = $env:PGPASSWORD
try {
  $env:PGPASSWORD = $dbPassword
  $databaseExists = & (Join-Path $PostgresBin 'psql.exe') -h 127.0.0.1 -p $Port -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$dbName'"
  if ($LASTEXITCODE -ne 0) { throw 'Local database credentials or port do not match this cluster.' }
  if ($databaseExists -ne '1') {
    & (Join-Path $PostgresBin 'createdb.exe') -h 127.0.0.1 -p $Port -U $dbUser $dbName
    if ($LASTEXITCODE -ne 0) { throw 'Creating the local database failed.' }
  }
} finally { $env:PGPASSWORD = $previousPassword }
$databaseUrl = 'postgresql://' + $dbUser + ':' + [Uri]::EscapeDataString($dbPassword) + '@127.0.0.1:' + $Port + '/' + $dbName
$envText = [regex]::Replace($envText, '(?m)^DATABASE_URL=.*$', { param($match) 'DATABASE_URL=' + $databaseUrl })
[IO.File]::WriteAllText($envPath, $envText, [Text.UTF8Encoding]::new($false))
Write-Output "Local PostgreSQL ready on 127.0.0.1:$Port; data: $dataPath. No staff account was created."
