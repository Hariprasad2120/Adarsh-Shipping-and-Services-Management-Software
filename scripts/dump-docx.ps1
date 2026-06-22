param(
    [string]$folderPath = "C:\Users\SilverCloud\Documents\monolith-engine\import-output\letters\Letter Formats"
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

$files = Get-ChildItem -Path $folderPath -Filter "*.docx" | Sort-Object Name

foreach ($file in $files) {
    Write-Host "========================================"
    Write-Host "FILE: $($file.Name)"
    Write-Host "========================================"
    try {
        $doc = $word.Documents.Open($file.FullName)
        $text = $doc.Content.Text
        Write-Host $text
        $doc.Close($false)
    } catch {
        Write-Host "ERROR reading $($file.Name): $_"
    }
}

$word.Quit()
