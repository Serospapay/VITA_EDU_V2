#!/usr/bin/env pwsh
# Резервна копія PostgreSQL (DATABASE_URL із backend/.env)
param(
    [string] $EnvFile = "",
    [ValidateSet('custom', 'plain')]
    [string] $Format = 'custom',
    [string] $PgBin = "",
    [string] $OutFile = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TransferRoot = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $TransferRoot '..')).Path
$parser = Join-Path $TransferRoot 'lib\parse-database-url.mjs'

$resolvedEnv = if ($EnvFile) { (Resolve-Path $EnvFile).Path } else { Join-Path $RepoRoot 'backend\.env' }

if (-not (Test-Path $parser)) {
    Write-Error "Не знайдено $parser"
}

$outputJson = node $parser $resolvedEnv
$db = $outputJson | ConvertFrom-Json

if ($db.error) {
    Write-Error $db.error
}

function Get-PgTool {
    param([string]$Name)
    if ($PgBin) {
        $candidate = Join-Path $PgBin $Name
        if (-not ($Name.EndsWith('.exe'))) {
            $candidate = "$candidate.exe"
        }
        if (Test-Path $candidate) { return $candidate }
    }
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) {
        Write-Error "Не знайдено $Name у PATH. Встановіть PostgreSQL Client Tools або вкажіть -PgBin `"C:\\Program Files\\PostgreSQL\\16\\bin`""
    }
    return $cmd.Source
}

$pgDump = Get-PgTool 'pg_dump'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $TransferRoot 'backups'
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }

if (-not $OutFile) {
    if ($Format -eq 'custom') {
        $OutFile = Join-Path $backupDir "vita-edu-$stamp.dump"
    } else {
        $OutFile = Join-Path $backupDir "vita-edu-$stamp.sql"
    }
} else {
    $OutFile = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutFile)
}

$env:PGPASSWORD = $db.password
try {
    if ($Format -eq 'custom') {
        & $pgDump -h $db.host -p $db.port -U $db.user -d $db.database -F c -b -v -f $OutFile
    } else {
        & $pgDump -h $db.host -p $db.port -U $db.user -d $db.database --no-owner --no-privileges -f $OutFile
    }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "✅ Створено: $OutFile" -ForegroundColor Green
