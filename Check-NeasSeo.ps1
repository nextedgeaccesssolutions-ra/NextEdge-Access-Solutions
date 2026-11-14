<#
.SYNOPSIS
    SEO health check for nextedge-access-solutions.com

.DESCRIPTION
    There is no PowerShell command that makes a site rank in Google.
    Rankings are decided by Google's index, not by anything you can run locally.

    What a script CAN do is tell you, in seconds, whether your pages are
    technically fit to be ranked: do they return 200, do they have a title,
    a description, a canonical, an H1, and are they listed in your sitemap.
    That is what this does.

.EXAMPLE
    .\Check-NeasSeo.ps1
    .\Check-NeasSeo.ps1 -OutCsv .\seo-report.csv -IncludeProducts
#>

[CmdletBinding()]
param(
    [string] $BaseUrl = "https://www.nextedge-access-solutions.com",
    [string] $OutCsv  = ".\neas-seo-report.csv",
    [switch] $IncludeProducts
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Get-Match {
    param([string]$Html, [string]$Pattern)
    $m = [regex]::Match($Html, $Pattern, 'IgnoreCase, Singleline')
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
    return $null
}

function Test-Page {
    param([string]$Url)

    $row = [ordered]@{
        Url = $Url; Status = $null; Title = $null; TitleLen = 0
        MetaDescription = $null; DescLen = 0; H1 = $null
        Canonical = $null; RobotsMeta = $null; Issues = $null
    }
    $issues = New-Object System.Collections.Generic.List[string]

    try {
        $r = Invoke-WebRequest -Uri $Url -MaximumRedirection 5 -TimeoutSec 30 -UseBasicParsing
        $row.Status = [int]$r.StatusCode
        $html = $r.Content
    }
    catch [System.Net.WebException] {
        if ($_.Exception.Response) { $row.Status = [int]$_.Exception.Response.StatusCode }
        else { $row.Status = 'NO RESPONSE' }
        $issues.Add("Request failed")
        $row.Issues = $issues -join '; '
        return [pscustomobject]$row
    }

    $row.Title           = Get-Match $html '<title[^>]*>(.*?)</title>'
    $row.MetaDescription = Get-Match $html '<meta[^>]+name=["'']description["''][^>]+content=["'']([^"'']*)'
    $row.Canonical       = Get-Match $html '<link[^>]+rel=["'']canonical["''][^>]+href=["'']([^"'']*)'
    $row.RobotsMeta      = Get-Match $html '<meta[^>]+name=["'']robots["''][^>]+content=["'']([^"'']*)'
    $h1raw               = Get-Match $html '<h1[^>]*>(.*?)</h1>'
    if ($h1raw) { $row.H1 = ([regex]::Replace($h1raw, '<[^>]+>', '')).Trim() }

    if ($row.Title) { $row.TitleLen = $row.Title.Length }
    if ($row.MetaDescription) { $row.DescLen = $row.MetaDescription.Length }

    if ($row.Status -ne 200)                    { $issues.Add("HTTP $($row.Status)") }
    if (-not $row.Title)                        { $issues.Add("No title") }
    elseif ($row.TitleLen -gt 60)               { $issues.Add("Title over 60 chars") }
    if (-not $row.MetaDescription)              { $issues.Add("No meta description") }
    elseif ($row.DescLen -gt 160)               { $issues.Add("Description over 160 chars") }
    if (-not $row.H1)                           { $issues.Add("No H1") }
    elseif ($row.H1 -match '^\s*404')           { $issues.Add("SOFT 404 - page says 404 but returned $($row.Status)") }
    if (-not $row.Canonical)                    { $issues.Add("No canonical tag") }
    if ($row.RobotsMeta -match 'noindex')       { $issues.Add("BLOCKED BY NOINDEX") }

    $row.Issues = if ($issues.Count) { $issues -join '; ' } else { 'OK' }
    [pscustomobject]$row
}

Write-Host ""
Write-Host "NEAS SEO health check" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl" -ForegroundColor Cyan
Write-Host ""

# --- robots.txt ---------------------------------------------------------
try {
    $robots = (Invoke-WebRequest "$BaseUrl/robots.txt" -TimeoutSec 20 -UseBasicParsing).Content
    Write-Host "robots.txt found" -ForegroundColor Green
    if ($robots -match 'Sitemap:\s*(\S+)') {
        $sitemapUrl = $Matches[1]
        Write-Host "  declares sitemap: $sitemapUrl"
    } else {
        $sitemapUrl = "$BaseUrl/sitemap.xml"
        Write-Host "  no Sitemap line in robots.txt" -ForegroundColor Yellow
    }
} catch {
    Write-Host "robots.txt NOT reachable" -ForegroundColor Red
    $sitemapUrl = "$BaseUrl/sitemap.xml"
}

# --- sitemap ------------------------------------------------------------
$sitemapUrls = @()
try {
    [xml]$sm = (Invoke-WebRequest $sitemapUrl -TimeoutSec 30 -UseBasicParsing).Content
    $sitemapUrls = @($sm.urlset.url.loc)
    Write-Host "sitemap.xml found - $($sitemapUrls.Count) URLs" -ForegroundColor Green
    $products = @($sitemapUrls | Where-Object { $_ -match '/store/p/' })
    Write-Host "  product pages : $($products.Count)"
    Write-Host "  other pages   : $($sitemapUrls.Count - $products.Count)"
    if (($sitemapUrls.Count - $products.Count) -lt 5) {
        Write-Host "  WARNING: almost no non-product pages in the sitemap." -ForegroundColor Yellow
    }
} catch {
    Write-Host "sitemap.xml NOT reachable or not valid XML" -ForegroundColor Red
}

# --- pages that SHOULD exist for a rope-access company ------------------
$expected = @(
    "/", "/store", "/privacy-policy",
    "/about", "/contact",
    "/services/", "/services/rope-access/", "/services/facade-cleaning/",
    "/services/lifeline-systems/", "/services/fall-protection-systems/",
    "/services/training-consultancy/", "/services/ppe-supply/",
    "/industries/", "/resources/"
)

$targets = $expected | ForEach-Object { "$BaseUrl$_" }
if ($IncludeProducts -and $sitemapUrls.Count) { $targets += $sitemapUrls }
$targets = $targets | Select-Object -Unique

Write-Host ""
Write-Host "Checking $($targets.Count) URLs..." -ForegroundColor Cyan
Write-Host ""

$results = foreach ($u in $targets) {
    Write-Progress -Activity "Checking pages" -Status $u `
        -PercentComplete ((([array]::IndexOf($targets,$u)) / $targets.Count) * 100)
    Test-Page -Url $u
}
Write-Progress -Activity "Checking pages" -Completed

$results | Format-Table Url, Status, Issues -AutoSize -Wrap
$results | Export-Csv -Path $OutCsv -NoTypeInformation -Encoding UTF8

$broken  = @($results | Where-Object { $_.Status -ne 200 })
$noindex = @($results | Where-Object { $_.Issues -match 'NOINDEX' })
$soft    = @($results | Where-Object { $_.Issues -match 'SOFT 404' })
$nocanon = @($results | Where-Object { $_.Issues -match 'No canonical' })

Write-Host ""
Write-Host "──────── SUMMARY ────────" -ForegroundColor Cyan
Write-Host ("Checked            : {0}" -f $results.Count)
Write-Host ("Healthy (200, OK)  : {0}" -f @($results | Where-Object { $_.Issues -eq 'OK' }).Count) -ForegroundColor Green
Write-Host ("Not reachable/404  : {0}" -f $broken.Count)  -ForegroundColor $(if($broken.Count){'Red'}else{'Green'})
Write-Host ("Blocked by noindex : {0}" -f $noindex.Count) -ForegroundColor $(if($noindex.Count){'Red'}else{'Green'})
Write-Host ("Soft 404s          : {0}" -f $soft.Count)    -ForegroundColor $(if($soft.Count){'Red'}else{'Green'})
Write-Host ("Missing canonical  : {0}" -f $nocanon.Count) -ForegroundColor $(if($nocanon.Count){'Yellow'}else{'Green'})
Write-Host ""
Write-Host "Full report: $OutCsv" -ForegroundColor Cyan

if ($broken.Count) {
    Write-Host ""
    Write-Host "Pages returning an error - these cannot rank at all:" -ForegroundColor Red
    $broken | ForEach-Object { Write-Host ("  {0}  [{1}]" -f $_.Url, $_.Status) }
}
Write-Host ""
