param([switch]$FolderOnly)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$publishDir = Join-Path $root "publish-package"
$zipPath = Join-Path $root "neon-skies-publish.zip"

if (-not (Test-Path -LiteralPath (Join-Path $root 'index.html'))) {
  throw 'index.html was not found. Run this script from the game project folder.'
}

if (Test-Path -LiteralPath $publishDir) {
  Remove-Item -LiteralPath $publishDir -Recurse -Force
}
New-Item -ItemType Directory -Path $publishDir -Force | Out-Null

$bgmFile = Get-ChildItem -LiteralPath $root -Filter '*.mp3' -File | Select-Object -First 1
if (-not $bgmFile) {
  throw 'No MP3 BGM file was found in the project folder.'
}

$rootFiles = @(
  (Join-Path $root 'index.html')
  (Join-Path $root 'styles.css')
  (Join-Path $root 'README.md')
  (Join-Path $root 'DEVELOPMENT.md')
  (Join-Path $root 'start-server.ps1')
  $bgmFile.FullName
)
Copy-Item -LiteralPath $rootFiles -Destination $publishDir -Force
Copy-Item -LiteralPath (Join-Path $root 'src'), (Join-Path $root 'assets') -Destination $publishDir -Recurse -Force

Write-Host 'Publish package created.' -ForegroundColor Cyan
Write-Host "Folder: $publishDir"
if (-not $FolderOnly) {
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
  Compress-Archive -Path (Join-Path $publishDir "*") -DestinationPath $zipPath
  Write-Host "Zip: $zipPath"
} else {
  Write-Host 'Folder-only mode: ZIP was not generated.'
}
