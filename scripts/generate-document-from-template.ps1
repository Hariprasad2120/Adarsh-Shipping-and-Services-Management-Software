param(
    [string]$jsonPath
)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not $jsonPath -or -not (Test-Path $jsonPath)) {
    Write-Output (@{ ok = $false; error = "JSON path is missing or invalid." } | ConvertTo-Json -Compress)
    exit 1
}

$jsonPath = (Resolve-Path $jsonPath).Path

$json = Get-Content -Raw -Path $jsonPath | ConvertFrom-Json

$templatePath = $json.templatePath
$outputDocx = $json.outputPath
$outputPdf = $json.pdfOutputPath

if (-not (Test-Path $templatePath)) {
    Write-Output (@{ ok = $false; error = "Template DOCX not found." } | ConvertTo-Json -Compress)
    exit 1
}

$templatePath = (Resolve-Path $templatePath).Path

$docxDir = Split-Path $outputDocx
if (-not (Test-Path $docxDir)) {
    New-Item -ItemType Directory -Force -Path $docxDir | Out-Null
}

$pdfDir = Split-Path $outputPdf
if (-not (Test-Path $pdfDir)) {
    New-Item -ItemType Directory -Force -Path $pdfDir | Out-Null
}

function Replace-TextPlaceholder($wordDoc, $placeholder, $replacement) {
    foreach ($storyRange in $wordDoc.StoryRanges) {
        $range = $storyRange
        do {
            $find = $range.Find
            $find.ClearFormatting()
            $find.Replacement.ClearFormatting()
            $find.Text = "{{" + $placeholder + "}}"
            $find.Replacement.Text = [string]$replacement
            [void]$find.Execute($find.Text, $false, $false, $false, $false, $false, $true, 1, $false, $find.Replacement.Text, 2)
            $range = $range.NextStoryRange
        } while ($null -ne $range)
    }
}

function Replace-ImagePlaceholder($wordDoc, $placeholder, $imagePath) {
    if (-not $imagePath -or -not (Test-Path $imagePath)) {
        Replace-TextPlaceholder $wordDoc $placeholder ""
        return
    }

    foreach ($storyRange in $wordDoc.StoryRanges) {
        $range = $storyRange
        do {
            $find = $range.Find
            $find.ClearFormatting()
            $find.Text = "{{" + $placeholder + "}}"
            while ($find.Execute()) {
                $matchRange = $range.Duplicate
                $matchRange.Text = ""
                $picture = $matchRange.InlineShapes.AddPicture($imagePath)
                if ($placeholder -eq "company_seal") {
                    $picture.Height = 40
                    $picture.Width = 40
                } else {
                    $picture.Height = 32
                    $picture.Width = 88
                }
                $range.SetRange($matchRange.End, $matchRange.End)
            }
            $range = $range.NextStoryRange
        } while ($null -ne $range)
    }
}

try {
    Copy-Item $templatePath -Destination $outputDocx -Force

    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    $doc = $word.Documents.Open($outputDocx)

    $placeholders = $json.placeholders.PSObject.Properties
    foreach ($prop in $placeholders) {
        $key = $prop.Name
        $value = [string]$prop.Value
        if ($key -in @("authorised_signatory_signature", "company_seal", "employee_signature")) {
            continue
        }
        Replace-TextPlaceholder $doc $key $value
    }

    Replace-ImagePlaceholder $doc "authorised_signatory_signature" $json.signaturePath
    Replace-ImagePlaceholder $doc "company_seal" $json.sealPath
    Replace-ImagePlaceholder $doc "employee_signature" $json.employeeSignaturePath

    $doc.Save()
    $doc.SaveAs($outputPdf, 17)
    $doc.Close()
    $word.Quit()

    $hash = (Get-FileHash $outputPdf -Algorithm SHA256).Hash.ToLower()
    Write-Output (@{
        ok = $true
        pdfHash = $hash
        docxPath = $outputDocx
        pdfPath = $outputPdf
    } | ConvertTo-Json -Depth 6 -Compress)
} catch {
    if ($doc) { $doc.Close($false) }
    if ($word) { $word.Quit() }
    Write-Output (@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
    exit 1
}
