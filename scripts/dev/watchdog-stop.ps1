$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [Console]::OutputEncoding
chcp 65001 > $null

$rootPath = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$watchdogDir = Join-Path $rootPath "logs\watchdog"
$managerPidPath = Join-Path $watchdogDir "manager.pid"
$statePath = Join-Path $watchdogDir "state.json"
$postgresBinDir = Join-Path $rootPath ".tools\postgres\dist\pgsql\bin"
$postgresReadyPath = Join-Path $postgresBinDir "pg_isready.exe"
$postmasterPidPath = Join-Path $rootPath ".tools\postgres\data\postmaster.pid"

function Try-StopProcess {
  param([int]$ProcessId, [string]$Name)

  if (-not $ProcessId) {
    return
  }

  try {
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    Write-Output ("Stopped {0} (pid={1})" -f $Name, $ProcessId)
  }
  catch {
    Write-Output ("{0} already stopped or inaccessible (pid={1})" -f $Name, $ProcessId)
  }
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

if (Test-Path -LiteralPath $statePath) {
  try {
    $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    Try-StopProcess -ProcessId ([int]$state.apiPid) -Name "api"
    Try-StopProcess -ProcessId ([int]$state.botPid) -Name "bot"
  }
  catch {
    Write-Output "Could not parse watchdog state file."
  }
}

if (Test-Path -LiteralPath $managerPidPath) {
  $rawPid = Get-Content -LiteralPath $managerPidPath | Select-Object -First 1
  $managerPid = 0
  [void][int]::TryParse($rawPid, [ref]$managerPid)
  Try-StopProcess -ProcessId $managerPid -Name "watchdog"
}

if (Test-Path -LiteralPath $managerPidPath) {
  Remove-Item -LiteralPath $managerPidPath -Force
}

if (Test-Path -LiteralPath $statePath) {
  Remove-Item -LiteralPath $statePath -Force
}

if (Test-Path -LiteralPath $postgresReadyPath) {
  & $postgresReadyPath -h localhost -p 5432 *> $null
  if ($LASTEXITCODE -eq 0) {
    $postgresPid = Read-PostgresPidFromPidFile
    Try-StopProcess -ProcessId $postgresPid -Name "postgres"
  }
}

if (Test-Path -LiteralPath $postmasterPidPath) {
  Remove-Item -LiteralPath $postmasterPidPath -Force -ErrorAction SilentlyContinue
}

Write-Output "Watchdog stop completed."
