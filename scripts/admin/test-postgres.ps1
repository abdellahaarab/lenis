$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$testRoot = Join-Path $workspaceRoot ('.temp/pg-test-' + [guid]::NewGuid().ToString('N'))
$postgresBin = if ($env:TEST_PG_BIN) { $env:TEST_PG_BIN } elseif (Test-Path 'C:/Program Files/PostgreSQL/16/bin/initdb.exe') { 'C:/Program Files/PostgreSQL/16/bin' } else { 'C:/Program Files/PostgreSQL/18/bin' }
if (-not (Test-Path (Join-Path $postgresBin 'initdb.exe'))) { throw 'Set TEST_PG_BIN to a local PostgreSQL bin directory, or use docker-compose.test.yml.' }
$testPassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start(); $testPort = $listener.LocalEndpoint.Port; $listener.Stop()
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
$passwordFile = Join-Path $testRoot 'password.txt'
[System.IO.File]::WriteAllText($passwordFile, $testPassword)
$dataPath = Join-Path $testRoot 'data'
$started = $false
$exitStatus = 1
try {
  & (Join-Path $postgresBin 'postgres.exe') --version
  & (Join-Path $postgresBin 'initdb.exe') -D $dataPath -U aljeel_test --auth=scram-sha-256 --pwfile=$passwordFile --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
  & (Join-Path $postgresBin 'pg_ctl.exe') -D $dataPath -l (Join-Path $testRoot 'postgres.log') -o "-p $testPort -h 127.0.0.1" -w start
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not start' }
  $started = $true
  $env:TEST_DATABASE_URL = "postgresql://aljeel_test:${testPassword}@127.0.0.1:${testPort}/postgres"
  $previousDatabaseUrl = $env:DATABASE_URL
  $env:DATABASE_URL = $env:TEST_DATABASE_URL
  Push-Location $workspaceRoot
  try {
    npm.cmd run db:migrate
    if ($LASTEXITCODE -ne 0) { throw 'Migration deploy failed on the disposable cluster' }
    npm.cmd run test:integration; $exitStatus = $LASTEXITCODE
  } finally { $env:DATABASE_URL = $previousDatabaseUrl; Pop-Location }
} finally {
  if ($started) { & (Join-Path $postgresBin 'pg_ctl.exe') -D $dataPath -m fast -w stop }
  Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
  # Delete only the generated cluster inside this workspace's .temp directory.
  $resolvedTestRoot = [System.IO.Path]::GetFullPath($testRoot)
  $allowedRoot = [System.IO.Path]::GetFullPath((Join-Path $workspaceRoot '.temp')) + [System.IO.Path]::DirectorySeparatorChar
  if (-not $resolvedTestRoot.StartsWith($allowedRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test cleanup path' }
  for ($cleanupAttempt = 0; $cleanupAttempt -lt 5; $cleanupAttempt++) {
    try { Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force; break }
    catch {
      if ($cleanupAttempt -eq 4) { throw }
      Start-Sleep -Milliseconds (250 * [math]::Pow(2, $cleanupAttempt))
    }
  }
}
exit $exitStatus
