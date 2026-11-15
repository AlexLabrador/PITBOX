param([string]$SlugList, [string]$Extract = "1")
$Slugs = $SlugList -split ','
$ErrorActionPreference = "Continue"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
foreach ($s in $Slugs) {
  $url = "https://www.autodoc.co.uk/info/$s"
  Write-Output "===== $url"
  try {
    $r = Invoke-WebRequest -Uri $url -Headers @{ "User-Agent" = $ua; "Accept-Language" = "en-GB,en;q=0.9" } -TimeoutSec 45 -UseBasicParsing
    $h = $r.Content
    Write-Output ("STATUS " + $r.StatusCode + " LEN " + $h.Length)
  } catch {
    Write-Output ("ERROR " + $_.Exception.Message)
    continue
  }
  if ($Extract -ne "1") { continue }
  $seg = $h -replace '(?s)<script.*?</script>', ' '
  $blocks = [regex]::Matches($seg, '(?is)<(h2|h3|p|li)[^>]*>(.*?)</\1>')
  foreach ($b in $blocks) {
    $t = $b.Groups[2].Value -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&#8217;', "'" -replace '&rsquo;', "'" -replace '&quot;', '"' -replace '&nbsp;', ' ' -replace '\s+', ' '
    $t = $t.Trim()
    if ($t.Length -gt 40) { Write-Output ($b.Groups[1].Value.ToUpper() + ': ' + $t) }
  }
  Start-Sleep -Milliseconds 600
}
