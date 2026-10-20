$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_NO_CLOUD = '1'
try { Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2 | Out-Null }
catch {
  $buddhaOllama = Join-Path $PSScriptRoot '.runtime/ollama/ollama.exe'
  if (-not (Test-Path -LiteralPath $buddhaOllama)) {
    $buddhaOllama = (Get-Command ollama -ErrorAction Stop).Source
  }
  New-Item -ItemType Directory -Force .runtime | Out-Null
  Start-Process -FilePath $buddhaOllama -ArgumentList 'serve' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot '.runtime/ollama-out.log') -RedirectStandardError (Join-Path $PSScriptRoot '.runtime/ollama-error.log')
}
for ($attempt=0; $attempt -lt 30; $attempt++) {
  try { Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2 | Out-Null; break }
  catch { Start-Sleep -Milliseconds 500 }
}
if (-not (Test-Path 'data/library.sqlite')) { throw 'Run npm ci and npm run import:bundle first. See docs/BUILD.md.' }
node server.mjs
