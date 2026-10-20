param(
  [switch]$BundledOnly,
  [switch]$NoLaunch,
  [string]$Model = 'qwen3.5:4b'
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Get-Command node,npm.cmd,tar -ErrorAction Stop | Out-Null
node -e "const [a,b]=process.versions.node.split('.').map(Number);if(a<22||(a===22&&b<13)){console.error('Node.js 22.13 or newer is required');process.exit(1)}"
if ($LASTEXITCODE -ne 0) { throw 'Install Node.js 22.13 or newer, then rerun setup.' }
$buddhaOllama = Join-Path $PSScriptRoot '.runtime/ollama/ollama.exe'
if (-not (Test-Path -LiteralPath $buddhaOllama)) {
  $buddhaOllama = (Get-Command ollama -ErrorAction Stop).Source
}
Write-Host 'Installing locked app dependencies...'
npm.cmd ci --ignore-scripts
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. Rerun setup after resolving the error.' }
if ($BundledOnly) {
  Write-Host 'Importing the included CC0 teaching library...'
  npm.cmd run import:bundle
} else {
  Write-Host 'Downloading the expanded teaching library. This may take time; rerun setup to reuse completed files.'
  npm.cmd run import
}
if ($LASTEXITCODE -ne 0) { throw 'Corpus setup failed. Completed source files remain cached. See docs/CORPORA.md.' }
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NO_CLOUD = '1'
try { Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2 | Out-Null }
catch {
  New-Item -ItemType Directory -Force .runtime | Out-Null
  Start-Process -FilePath $buddhaOllama -ArgumentList 'serve' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot '.runtime/ollama-out.log') -RedirectStandardError (Join-Path $PSScriptRoot '.runtime/ollama-error.log')
}
$buddhaReady = $false
for ($attempt=0; $attempt -lt 60; $attempt++) {
  try { Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2 | Out-Null; $buddhaReady=$true; break }
  catch { Start-Sleep -Milliseconds 500 }
}
if (-not $buddhaReady) { throw 'Ollama did not start. Check .runtime/ollama-error.log.' }
Write-Host "Acquiring local model $Model..."
& $buddhaOllama pull $Model
if ($LASTEXITCODE -ne 0) { throw 'Model download failed. Rerun setup to resume.' }
$env:BUDDHA_MODEL = $Model
Write-Host 'Setup complete. Open http://127.0.0.1:3000 after the server starts.'
if (-not $NoLaunch) { & .\start.ps1 }
