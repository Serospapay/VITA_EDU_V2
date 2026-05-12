#!/usr/bin/env pwsh
# Розпакування архіву uploads у backend/uploads (поточні файли переіменуються в uploads.bak-<час>)
param(
    [Parameter(Mandatory = $true)]
    [string] $ZipFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TransferRoot = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $TransferRoot '..')).Path
$ZipFile = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ZipFile)
$targetParent = Join-Path $RepoRoot 'backend'
$UploadsDest = Join-Path $targetParent 'uploads'

if (-not (Test-Path $ZipFile)) {
    Write-Error "Не знайдено архів: $ZipFile"
}

if (-not (Test-Path $targetParent)) {
    Write-Error "Не знайдено backend: $targetParent"
}

$temp = Join-Path $env:TEMP ("vita-edu-uploads-extract-{0}" -f ([guid]::NewGuid().ToString('N')))
New-Item -ItemType Directory -Path $temp | Out-Null
try {
    Expand-Archive -Path $ZipFile -DestinationPath $temp -Force

    $uploadsCandidate = Join-Path $temp 'uploads'
    if (-not (Test-Path $uploadsCandidate)) {
        Write-Error "У архіві немає каталогу `uploads` на верхньому рівні. Створи архів через backup-uploads.ps1."
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    if (Test-Path $UploadsDest) {
        $bakName = "uploads.bak-$stamp"
        $bakFull = Join-Path $targetParent $bakName
        Write-Host "Поточну теку переіменовано на $bakName" -ForegroundColor Yellow
        Rename-Item -Path $UploadsDest -NewName $bakName
    }

    Copy-Item -Path $uploadsCandidate -Destination $UploadsDest -Recurse -Force

    Write-Host "✅ Розпаковано у $UploadsDest" -ForegroundColor Green
}
finally {
    Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
}
