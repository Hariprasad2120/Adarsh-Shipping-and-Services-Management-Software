param(
    [string]$folderPath = "C:\Users\SilverCloud\Documents\monolith-engine\import-output\letters\Letter Formats"
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

$files = Get-ChildItem -Path $folderPath -Filter "*.docx" | Sort-Object Name
$txtFolder = Join-Path $folderPath "extracted_txt"
if (-not (Test-Path $txtFolder)) {
    New-Item -ItemType Directory -Path $txtFolder | Out-Null
}

foreach ($file in $files) {
    $outName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) + ".txt"
    $outPath = Join-Path $txtFolder $outName
    Write-Host "Extracting $($file.Name) -> $outName"
    try {
        $doc = $word.Documents.Open($file.FullName)
        $text = $doc.Content.Text
        $text | Out-File -FilePath $outPath -Encoding utf8
        $doc.Close($false)
    } catch {
        Write-Host "ERROR reading $($file.Name): $_"
    }
}

$word.Quit()
Write-Host "Extraction complete!"
