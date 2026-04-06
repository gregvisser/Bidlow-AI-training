# Operator: Key Vault DATABASE_URL -> create min course -> list -> enroll learner@bidlow.co.uk
# Run from repo root: powershell -ExecutionPolicy Bypass -File scripts/ops-prod-min-course-and-enroll.ps1
# Does not print DATABASE_URL. Requires: az login, access to kv-bidlow-training-prod.

$ErrorActionPreference = "Stop"
$env:NODE_OPTIONS = "--no-warnings"

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

$db = (az keyvault secret show --vault-name kv-bidlow-training-prod --name DATABASE-URL --query value -o tsv).Trim()
if (-not $db) { throw "Key Vault DATABASE-URL empty" }
$env:DATABASE_URL = $db

Write-Host "Step: ops:create-min-course"
npm run ops:create-min-course
if ($LASTEXITCODE -ne 0) { throw "create-min-course failed" }

Write-Host "Step: ops:list-courses"
$prevErr = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$listOut = npm run ops:list-courses 2>&1 | ForEach-Object { $_.ToString() } | Out-String
$ErrorActionPreference = $prevErr
Write-Host $listOut

Write-Host "Step: ops:grant-enrollment (learner@bidlow.co.uk, core-launch-pilot)"
$env:ENROLL_USER_EMAIL = "learner@bidlow.co.uk"
$env:COURSE_SLUG = "core-launch-pilot"
npm run ops:grant-enrollment
if ($LASTEXITCODE -ne 0) { throw "grant-enrollment failed" }

Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:ENROLL_USER_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:COURSE_SLUG -ErrorAction SilentlyContinue
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue
Write-Host "Done."
