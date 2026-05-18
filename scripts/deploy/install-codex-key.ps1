$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [Console]::OutputEncoding
chcp 65001 > $null

$server = "root@62.113.111.4"
$publicKeyPath = Join-Path $env:USERPROFILE ".ssh\codex_vps_deploy_ed25519.pub"

if (-not (Test-Path $publicKeyPath)) {
  throw "Public key not found: $publicKeyPath"
}

$remoteCommand = @"
mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
grep -qxF '$(Get-Content $publicKeyPath -Raw).Trim()' /root/.ssh/authorized_keys || echo '$(Get-Content $publicKeyPath -Raw).Trim()' >> /root/.ssh/authorized_keys
"@

Write-Host "Opening SSH connection to $server"
Write-Host "If the server asks for the root password, enter it"

Get-Content $publicKeyPath | ssh `
  -o StrictHostKeyChecking=no `
  -o UserKnownHostsFile=/dev/null `
  $server `
  $remoteCommand

if ($LASTEXITCODE -ne 0) {
  throw "SSH key upload failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "SSH key upload finished. You can now reply: ready"
