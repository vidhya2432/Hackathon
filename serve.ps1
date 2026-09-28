$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$defaultPort = 8080
$portsToTry = @($defaultPort) + @((($defaultPort + 1)..($defaultPort + 20)))
$listener = $null
$prefix = $null

foreach ($port in $portsToTry) {
  $candidate = "http://localhost:$port/"
  $candidateListener = [System.Net.HttpListener]::new()
  try {
    $candidateListener.Prefixes.Add($candidate)
    $candidateListener.Start()
    $listener = $candidateListener
    $prefix = $candidate
    break
  } catch {
    $candidateListener.Close()
    $candidateListener.Dispose()
  }
}

if (-not $listener -or -not $prefix) {
  Write-Host "Could not bind any port from $($portsToTry[0]) to $($portsToTry[-1]). Try closing a process that is already using localhost."
  exit 1
}

Write-Host "BharatFin AI running at $prefix"
Write-Host "Press Ctrl+C to stop."
Start-Process $prefix

$mimes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".json" = "application/json"
  ".png"  = "image/png"
  ".ico"  = "image/x-icon"
  ".md"   = "text/markdown; charset=utf-8"
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath).TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }
  $full = Join-Path $root ($path -replace "/", [IO.Path]::DirectorySeparatorChar)
  $res = $ctx.Response
  if (-not (Test-Path $full) -or (Get-Item $full).PSIsContainer) {
    $res.StatusCode = 404
    $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.Close()
    continue
  }
  $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
  $res.ContentType = $(if ($mimes.ContainsKey($ext)) { $mimes[$ext] } else { "application/octet-stream" })
  $bytes = [IO.File]::ReadAllBytes($full)
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.Close()
}
