$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [Console]::OutputEncoding
chcp 65001 > $null

$rootPath = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$watchdogDir = Join-Path $rootPath "logs\watchdog"
$managerPidPath = Join-Path $watchdogDir "manager.pid"
$loopScriptPath = Join-Path $PSScriptRoot "watchdog-loop.ps1"
$postgresBinDir = Join-Path $rootPath ".tools\postgres\dist\pgsql\bin"
$postgresExePath = Join-Path $postgresBinDir "postgres.exe"
$postgresReadyPath = Join-Path $postgresBinDir "pg_isready.exe"
$postgresDataPath = Join-Path $rootPath ".tools\postgres\data"
$postgresLogPath = Join-Path $rootPath ".tools\postgres\postgres.log"
$postmasterPidPath = Join-Path $postgresDataPath "postmaster.pid"

New-Item -ItemType Directory -Path $watchdogDir -Force | Out-Null

function Test-ProcessAlive {
  param([int]$ProcessId)

  if (-not $ProcessId) {
    return $false
  }

  try {
    $null = Get-Process -Id $ProcessId -ErrorAction Stop
    return $true
  }
  catch {
    return $false
  }
}

function Test-PostgresReady {
  if (-not (Test-Path -LiteralPath $postgresReadyPath)) {
    return $false
  }

  & $postgresReadyPath -h localhost -p 5432 *> $null
  return $LASTEXITCODE -eq 0
}

function Read-PostgresPidFromPidFile {
  if (-not (Test-Path -LiteralPath $postmasterPidPath)) {
    return $null
  }

  try {
    $rawPid = Get-Content -LiteralPath $postmasterPidPath -ErrorAction Stop | Select-Object -First 1
    $postgresPid = 0

    if ([int]::TryParse($rawPid, [ref]$postgresPid)) {
      return $postgresPid
    }
  }
  catch {
    return $null
  }

  return $null
}

function Remove-StalePostmasterPid {
  $postgresPid = Read-PostgresPidFromPidFile

  if (-not $postgresPid) {
    return
  }

  if (Test-ProcessAlive -ProcessId $postgresPid) {
    return
  }

  Remove-Item -LiteralPath $postmasterPidPath -Force -ErrorAction SilentlyContinue
}

function Start-PostgresProcess {
  if (-not (Test-Path -LiteralPath $postgresExePath)) {
    throw "Portable PostgreSQL executable not found: $postgresExePath"
  }

  Remove-StalePostmasterPid

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $postgresExePath
  $startInfo.Arguments = "-D `"$postgresDataPath`""
  $startInfo.WorkingDirectory = $postgresBinDir
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  [void]$process.Start()
  $process.BeginOutputReadLine()
  $process.BeginErrorReadLine()

  return $process
}

function Start-PostgresIfNeeded {
  if (Test-PostgresReady) {
    Write-Output "PostgreSQL already accepting connections"
    return
  }

  $postgresProcess = Start-PostgresProcess

  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    Start-Sleep -Seconds 1

    if (Test-PostgresReady) {
      Write-Output "PostgreSQL started"
      return
    }

    if ($postgresProcess.HasExited) {
      break
    }
  }

  $errorTail = ""
  if (Test-Path -LiteralPath $postgresLogPath) {
    $errorTail = (Get-Content -LiteralPath $postgresLogPath -Tail 20) -join [Environment]::NewLine
  }

  throw ("PostgreSQL failed to start. Recent log tail:`n{0}" -f $errorTail)
}

if (Test-Path -LiteralPath $managerPidPath) {
  $rawPid = Get-Content -LiteralPath $managerPidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  $existingPid = 0
  [void][int]::TryParse($rawPid, [ref]$existingPid)

  if (Test-ProcessAlive -ProcessId $existingPid) {
    Write-Output "Watchdog already running (pid=$existingPid)"
    exit 0
  }
}

Start-PostgresIfNeeded

$process = Start-Process `
  -FilePath "powershell.exe" `
  -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$loopScriptPath`"" `
  -WorkingDirectory $rootPath `
  -WindowStyle Hidden `
  -PassThru

Start-Sleep -Seconds 2
if (-not (Test-ProcessAlive -ProcessId $process.Id)) {
  Write-Output ("Watchdog failed to start (pid={0})" -f $process.Id)
  exit 1
}

Write-Output ("Watchdog started (pid={0})" -f $process.Id)
