#!/usr/bin/env pwsh
# Відновлення PostgreSQL з резервної копії (*.dump створені backup.ps1 -Fc)
param(
    [Parameter(Mandatory = $true)]
    [string] $DumpFile,
    [string] $EnvFile = "",
    [string] $PgBin = "",
    [switch] $CreateDatabase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TransferRoot = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $TransferRoot '..')).Path
$parser = Join-Path $TransferRoot 'lib\parse-database-url.mjs'

$resolvedEnv = if ($EnvFile) { (Resolve-Path $EnvFile).Path } else { Join-Path $RepoRoot 'backend\.env' }
$DumpFile = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($DumpFile)

if (-not (Test-Path $DumpFile)) {
    Write-Error "Файл не існує: $DumpFile"
}

$outputJson = node $parser $resolvedEnv
$db = $outputJson | ConvertFrom-Json

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

$pgRestore = Get-PgTool 'pg_restore'
$psql = Get-PgTool 'psql'

if ($CreateDatabase) {
    $env:PGPASSWORD = $db.password
    try {
        $exists = & $psql -h $db.host -p $db.port -U $db.user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$($db.database)';"
        $exists = ($exists | ForEach-Object { $_.Trim() }) -join ''
        if (-not ($exists -eq '1')) {
            Write-Host "Створення бази $($db.database)..." -ForegroundColor Cyan
            & $psql -h $db.host -p $db.port -U $db.user -d postgres -c "CREATE DATABASE `"$($db.database)`";"
        } else {
            Write-Host "База $($db.database) уже існує." -ForegroundColor Yellow
        }
    }
    finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

$env:PGPASSWORD = $db.password
try {
    Write-Host "Відновлення з $DumpFile у $($db.database)..." -ForegroundColor Cyan
    & $pgRestore -h $db.host -p $db.port -U $db.user -d $db.database `
        --verbose --clean --if-exists --no-owner --no-acl $DumpFile
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "✅ Відновлення завершено. Перезапусти бекенд і перевір `npx prisma migrate status` якщо потрібно." -ForegroundColor Green
