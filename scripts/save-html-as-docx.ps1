param(
    [string]$htmlPath,
    [string]$outputDocx
)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not $htmlPath -or -not (Test-Path $htmlPath)) {
    Write-Output (@{ ok = $false; error = "HTML path is missing or invalid." } | ConvertTo-Json -Compress)
    exit 1
}

$htmlPath = (Resolve-Path $htmlPath).Path

$outputDir = Split-Path $outputDocx
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    $doc = $word.Documents.Open($htmlPath)
    # wdFormatDocumentDefault = 16
    $doc.SaveAs($outputDocx, 16)
    $doc.Close($false)
    $word.Quit()

    Write-Output (@{ ok = $true; outputDocx = $outputDocx } | ConvertTo-Json -Compress)
} catch {
    if ($doc) { $doc.Close($false) }
    if ($word) { $word.Quit() }
    Write-Output (@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
    exit 1
}
