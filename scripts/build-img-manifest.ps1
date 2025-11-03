Param(
  [string]$ImageDir = "img",
  [string]$Output = "img/manifest.json"
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $ImageDir)) { throw "Folder not found: $ImageDir" }

$base = (Resolve-Path .).Path
$files = Get-ChildItem -Path $ImageDir -Recurse -File |
  Where-Object { $_.Extension -match '^(?i)\.(jpe?g|png|webp|avif)$' } |
  Where-Object { $_.Name -notmatch 'og-default' } |
  ForEach-Object {
    $rel = $_.FullName.Substring($base.Length).TrimStart('\\')
    [pscustomobject]@{
      Path = ($rel -replace '\\','/')
      ExtRank = (($_.Extension -match '^(?i)\.(jpe?g|png|webp|avif)$') ? 0 : 1)
      Num = ([regex]::Matches($_.Name, '\d+') | ForEach-Object { $_.Value } | Select-Object -Last 1)
      Name = $_.Name.ToLowerInvariant()
    }
  } |
  ForEach-Object {
    if(-not $_.Num){ $_.Num = [int]::MaxValue } else { $_.Num = [int]$_.Num }
    $_
  } |
  Sort-Object ExtRank, Num, Name |
  ForEach-Object { $_.Path }

$json = @{ images = $files } | ConvertTo-Json -Depth 3
New-Item -ItemType Directory -Path (Split-Path -Parent $Output) -Force | Out-Null
Set-Content -Path $Output -Value $json -Encoding UTF8
Write-Host "Wrote $($files.Count) paths to $Output"
