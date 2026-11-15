param([string]$Brand, [string]$ModelList)
$Models = $ModelList -split ','
$ErrorActionPreference = "Continue"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
foreach ($m in $Models) {
  $url = "https://compareautoparts.co.uk/cars/$Brand/$m/common-problems"
  Write-Output "===== $url"
  try {
    $h = (Invoke-WebRequest -Uri $url -Headers @{ "User-Agent" = $ua } -TimeoutSec 45 -UseBasicParsing).Content
  } catch {
    Write-Output ("ERROR " + $_.Exception.Message)
    continue
  }
  $i = $h.IndexOf('At a glance')
  $j = $h.IndexOf('Buying a Used')
  if ($j -lt $i) { $j = $h.IndexOf('DVSA Safety Recalls') }
  if ($i -lt 0) { Write-Output "(sin seccion de fallos)"; continue }
  if ($j -le $i) { $j = [Math]::Min($i + 30000, $h.Length) }
  $seg = $h.Substring($i, $j - $i) -replace '(?s)<script.*?</script>', ' '
  $blocks = [regex]::Matches($seg, '(?is)<(h2|h3|p|li)[^>]*>(.*?)</\1>')
  foreach ($b in $blocks) {
    $t = $b.Groups[2].Value -replace '<[^>]+>', ' ' -replace '&amp;', '&' -replace '&#8217;', "'" -replace '&rsquo;', "'" -replace '&quot;', '"' -replace '\s+', ' '
    $t = $t.Trim()
    if ($t.Length -gt 0) { Write-Output ($b.Groups[1].Value.ToUpper() + ': ' + $t) }
  }
  Start-Sleep -Milliseconds 600
}
