# Deploy send-invoice (JWT OFF — aligné dashboard + config.toml)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/deploy-send-invoice.ps1

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$projectRef = "tawnusmfyvugqczaydat"
$deployArgs = @(
  "functions", "deploy", "send-invoice",
  "--project-ref", $projectRef,
  "--no-verify-jwt",
  "--use-api",
  "--workdir", "."
)

function Invoke-SupabaseCli {
  param([string]$ExePath)
  if (-not (Test-Path $ExePath)) { return $false }
  Write-Host "→ $ExePath" -ForegroundColor Cyan
  try { Unblock-File -Path $ExePath -ErrorAction SilentlyContinue } catch {}
  & $ExePath @deployArgs
  return $LASTEXITCODE -eq 0
}

Write-Host "Deploy send-invoice ($projectRef)" -ForegroundColor Yellow

# 1) Scoop (recommandé Windows — évite EPERM npm-cache)
$scoopExe = $null
if (Get-Command scoop -ErrorAction SilentlyContinue) {
  $scoopPath = scoop which supabase 2>$null
  if ($scoopPath) { $scoopExe = $scoopPath.Trim() }
}
if ($scoopExe -and (Invoke-SupabaseCli $scoopExe)) {
  Write-Host "✓ Déployé via Scoop." -ForegroundColor Green
  exit 0
}

# 2) Binaire local node_modules (npm install supabase --save-dev)
$localExe = Join-Path $root "node_modules\supabase\bin\supabase.exe"
if (-not (Test-Path $localExe)) {
  Write-Host "Installation supabase (devDependency)..." -ForegroundColor Gray
  npm install supabase --save-dev --no-fund --no-audit
}
if (Invoke-SupabaseCli $localExe) {
  Write-Host "✓ Déployé via node_modules." -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "✗ CLI inaccessible (EPERM Windows / antivirus)." -ForegroundColor Red
Write-Host ""
Write-Host "Option A — Scoop (une fois):" -ForegroundColor Yellow
Write-Host "  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser"
Write-Host "  irm get.scoop.sh | iex"
Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
Write-Host "  scoop install supabase"
Write-Host "  supabase login --token <TOKEN depuis dashboard/account/tokens>"
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/deploy-send-invoice.ps1"
Write-Host ""
Write-Host "Option B — Dashboard (sans CLI):" -ForegroundColor Yellow
Write-Host "  https://supabase.com/dashboard/project/$projectRef/functions/send-invoice"
Write-Host "  Coller le code de supabase/functions/send-invoice/index.ts → Deploy"
Write-Host ""
exit 1
