# ============================================================
# push-online.ps1  --  ASCII-only (no Arabic) so PS 5.1 parses it
# Pushes ./online contents to a GitHub repo using REST API (no git).
# ============================================================
$ErrorActionPreference = 'Stop'

param(
  [Parameter(Mandatory=$true)][string]$GITHUB_USER,
  [Parameter(Mandatory=$true)][string]$REPO_NAME,
  [Parameter(Mandatory=$true)][string]$TOKEN
)

$api = 'https://api.github.com'
$headers = @{
  'Authorization' = 'token ' + $TOKEN
  'Accept'        = 'application/vnd.github+json'
  'User-Agent'    = 'fawateeri-push'
}

$src = $PSScriptRoot
if (-not (Test-Path (Join-Path $src 'server.js'))) {
  $src = Join-Path $src 'online'
}
if (-not (Test-Path (Join-Path $src 'server.js'))) {
  throw 'server.js not found in either the script folder or online/'
}

# 1) confirm repo exists / die loudly
try {
  $repoInfo = Invoke-RestMethod -Method Get -Uri "$api/repos/$GITHUB_USER/$REPO_NAME" -Headers $headers -ErrorAction Stop
  Write-Host ('[1/3] repo=' + $repoInfo.full_name + ' branch=' + $repoInfo.default_branch)
} catch {
  # try to create it
  $body = @{ name = $REPO_NAME; description = 'fawateeri online app'; private = $false } | ConvertTo-Json
  try {
    Invoke-RestMethod -Method Post -Uri "$api/user/repos" -Headers $headers -Body $body -ContentType 'application/json' -ErrorAction Stop | Out-Null
    Write-Host ('[1/3] created repo ' + $REPO_NAME)
  } catch {
    throw ('repo-not-created: ' + $_.Exception.Message)
  }
}

# 2) walk files
$files = Get-ChildItem -LiteralPath $src -Recurse -File | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\.git\\' }
$total = $files.Count
Write-Host ('[2/3] pushing ' + $total + ' files ...')
$i = 0
foreach ($f in $files) {
  $rel = $f.FullName.Substring($src.Length + 1).Replace('\', '/')
  $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
  $b64 = [System.Convert]::ToBase64String($bytes)

  # does a version exist? keep its sha so we can update
  $sha = ''
  try {
    $existing = Invoke-RestMethod -Method Get -Uri "$api/repos/$GITHUB_USER/$REPO_NAME/contents/$rel" -Headers $headers -ErrorAction Stop
    $sha = $existing.sha
  } catch { }

  $payload = @{ message = "add $rel"; content = $b64 }
  if ($sha) { $payload['sha'] = $sha }
  $json = $payload | ConvertTo-Json
  Invoke-RestMethod -Method Put -Uri "$api/repos/$GITHUB_USER/$REPO_NAME/contents/$rel" -Headers $headers -Body $json -ContentType 'application/json' | Out-Null
  $i++
  if ($i % 5 -eq 0) { Write-Host ("    ... $i/$total") }
}

# 3) done
Write-Host ('[3/3] uploaded ' + $i + ' files OK')
$repo = Invoke-RestMethod -Method Get -Uri "$api/repos/$GITHUB_USER/$REPO_NAME" -Headers $headers
Write-Host ('LIVE_URL=' + $repo.html_url)
