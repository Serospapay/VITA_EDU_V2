#!/usr/bin/env pwsh
# Архів backend/uploads для перенесення на інший комп'ютер
param(
    [string] $OutFile = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$TransferRoot = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $TransferRoot '..')).Path
$UploadsRoot = Join-Path $RepoRoot 'backend\uploads'
$ArchiveDir = Join-Path $TransferRoot 'upload-archives'

if (-not (Test-Path $UploadsRoot)) {
    Write-Warning "Каталогу немає: $UploadsRoot (нічого архівувати). Створено порожній архів із приміткою."
    if (-not (Test-Path $ArchiveDir)) { New-Item -ItemType Directory -Path $ArchiveDir | Out-Null }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $OutFile = if ($OutFile) { $OutFile } else { Join-Path $ArchiveDir "uploads-empty-$stamp.zip" }
    $note = Join-Path $env:TEMP "vita-edu-uploads-readme-$stamp.txt"
    Set-Content -Path $note -Value "Завантажень не було або каталог backend/uploads ще не створено."
    Compress-Archive -Path $note -DestinationPath $OutFile -Force
    Remove-Item $note -Force
    Write-Host "✅ $OutFile" -ForegroundColor Green
    exit 0
}

if (-not (Test-Path $ArchiveDir)) { New-Item -ItemType Directory -Path $ArchiveDir | Out-Null }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if (-not $OutFile) {
    $OutFile = Join-Path $ArchiveDir "uploads-$stamp.zip"
}
else {
    $OutFile = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutFile)
}

if (Test-Path $OutFile) { Remove-Item $OutFile -Force }

Compress-Archive -Path $UploadsRoot -DestinationPath $OutFile -CompressionLevel Optimal -Force

Write-Host "✅ Архів: $OutFile" -ForegroundColor Green
