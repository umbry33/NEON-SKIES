param([int]$Port = 5500)

# Always serve the game folder, even when this script is started from a shortcut.
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Host ("Plane game server: http://localhost:{0}/" -f $Port)
Write-Host ("Also available at: http://127.0.0.1:{0}/" -f $Port)
Write-Host ("Logic tests: http://localhost:{0}/tests/index.html" -f $Port)
Write-Host "Press Ctrl+C to stop the server."

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".svg" = "image/svg+xml"
  ".mp3" = "audio/mpeg"
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $relative = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = "index.html" }
    $file = Join-Path -Path $root -ChildPath ($relative -replace '/', '\\')
    $resolvedRoot = [System.IO.Path]::GetFullPath((Join-Path -Path $root -ChildPath '.'))
    $resolvedRoot = $resolvedRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    $resolvedFile = [System.IO.Path]::GetFullPath($file)
    if (-not $resolvedFile.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $resolvedFile -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
    } else {
      $bytes = [System.IO.File]::ReadAllBytes($resolvedFile)
      $extension = [System.IO.Path]::GetExtension($resolvedFile).ToLowerInvariant()
      $contentType = $mime[$extension]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $context.Response.ContentType = $contentType
      $context.Response.StatusCode = 200
    }
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
