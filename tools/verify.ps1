param([string]$FileList)
$ErrorActionPreference = "Continue"
$ua = "PITBOX-Catalogue/1.0 (https://example.invalid; contact: local-dev) PowerShell"
$lines = Get-Content -Path $FileList -Encoding UTF8 | Where-Object { $_.Trim().Length -gt 0 }
$batch = @()
function Flush($items) {
  if ($items.Count -eq 0) { return }
  $titles = ($items | ForEach-Object { "File:" + $_.file }) -join "|"
  $uri = "https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=" + [uri]::EscapeDataString($titles) + "&prop=imageinfo&iiprop=extmetadata|size&origin=*"
  try {
    $r = Invoke-RestMethod -Uri $uri -Headers @{ "User-Agent" = $ua } -TimeoutSec 40
    $pages = $r.query.pages.PSObject.Properties.Value
    foreach ($it in $items) {
      $p = $pages | Where-Object { $_.title -eq ("File:" + $it.file) } | Select-Object -First 1
      if (-not $p -or -not $p.imageinfo) {
        $p = $pages | Where-Object { $_.title -eq ([System.Net.WebUtility]::UrlDecode("File:" + $it.file)) } | Select-Object -First 1
      }
      if ($p -and $p.imageinfo) {
        $ii = $p.imageinfo[0]
        $lic = $ii.extmetadata.LicenseShortName.value
        $art = $ii.extmetadata.Artist.value
        if ($art) { $art = ($art -replace '<[^>]+>', ' ' -replace '\s+', ' ').Trim() }
        Write-Output ("{0} | OK | {1} | {2} | {3}" -f $it.key, $lic, $art, $it.file)
      } else {
        Write-Output ("{0} | MISSING | - | - | {1}" -f $it.key, $it.file)
      }
    }
  } catch {
    Write-Output ("BATCH ERROR " + $_.Exception.Message)
  }
  Start-Sleep -Milliseconds 900
}
foreach ($l in $lines) {
  $parts = $l -split '\|'
  $key = ($parts[0..2] -join '|').Trim()
  $file = ($parts[3..($parts.Count - 1)] -join '|').Trim()
  $batch += [pscustomobject]@{ key = $key; file = $file }
  if ($batch.Count -ge 10) { Flush $batch; $batch = @() }
}
Flush $batch
