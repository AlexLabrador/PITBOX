param([string]$QueriesFile, [int]$Limit = 5, [int]$Delay = 1200)
$ErrorActionPreference = "Continue"
$queries = Get-Content -Path $QueriesFile -Encoding UTF8
$ua = "PITBOX-Catalogue/1.0 (https://example.invalid; contact: local-dev) PowerShell"
foreach ($q in $queries) {
  if ([string]::IsNullOrWhiteSpace($q)) { continue }
  $enc = [uri]::EscapeDataString($q)
  $uri = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=$enc&gsrnamespace=6&gsrlimit=$Limit&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=460&origin=*"
  Write-Output "### $q"
  $ok = $false
  for ($i = 1; $i -le 4 -and -not $ok; $i++) {
    try {
      $r = Invoke-RestMethod -Uri $uri -Headers @{ "User-Agent" = $ua; "Accept" = "application/json" } -TimeoutSec 40
      $ok = $true
      $r.query.pages | ForEach-Object { $_ } | Out-Null
      $pages = $r.query.pages
      if ($pages) {
        $pages.PSObject.Properties.Value | Sort-Object index | ForEach-Object {
          $ii = $_.imageinfo[0]
          if ($ii) {
            $lic = $ii.extmetadata.LicenseShortName.value
            $art = $ii.extmetadata.Artist.value
            if ($art) { $art = ($art -replace '<[^>]+>', ' ' -replace '\s+', ' ').Trim() }
            Write-Output ("{0} | {1} | {2} | {3}x{4} | {5}" -f $_.title, $lic, $art, $ii.width, $ii.height, $ii.descriptionurl)
          }
        }
      } else {
        Write-Output "(sin resultados)"
      }
    } catch {
      if ($i -eq 4) { Write-Output ("ERROR " + $_.Exception.Message) }
      else { Start-Sleep -Seconds (3 * $i) }
    }
  }
  Start-Sleep -Milliseconds $Delay
}
