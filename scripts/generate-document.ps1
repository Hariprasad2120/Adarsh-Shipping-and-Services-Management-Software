param (
    [string]$jsonPath
)

# Enforce TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not $jsonPath -or -not (Test-Path $jsonPath)) {
    Write-Error "JSON path is missing or invalid."
    exit 1
}

# Load JSON details
$json = Get-Content -Raw -Path $jsonPath | ConvertFrom-Json

$letterheadPath = "C:\Users\SilverCloud\Documents\LetterHead.docx"
if (-not (Test-Path $letterheadPath)) {
    Write-Error "Letterhead document not found at $letterheadPath"
    exit 1
}

$outputDocx = $json.outputPath
$outputPdf = $json.pdfOutputPath

# Create directories if they do not exist
$docxDir = Split-Path $outputDocx
if (-not (Test-Path $docxDir)) {
    New-Item -ItemType Directory -Force -Path $docxDir | Out-Null
}
$pdfDir = Split-Path $outputPdf
if (-not (Test-Path $pdfDir)) {
    New-Item -ItemType Directory -Force -Path $pdfDir | Out-Null
}

# Start Word COM Automation
try {
    # Create a local temp copy of the letterhead to prevent network/OneDrive COM hangs
    $tempLetterheadPath = Join-Path $docxDir "temp_letterhead_$($json.letterNumber -replace '[^a-zA-Z0-9]', '_').docx"
    Copy-Item $letterheadPath -Destination $tempLetterheadPath -Force

    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0 # wdAlertsNone

    # Open local copied Letterhead template
    $doc = $word.Documents.Open($tempLetterheadPath)

    # Clear body content if any exists, but keep geometry
    $range = $doc.Content
    $range.Text = ""

    # Move selection to start/end of empty document
    $selection = $word.Selection
    [void]$selection.EndKey(6) # wdStory = 6

    # Formatting setup
    $selection.Font.Name = "Calibri"
    $selection.Font.Size = 10.5
    $selection.Font.Bold = $false
    $selection.ParagraphFormat.LineSpacing = 14 # ~1.15 line spacing
    $selection.ParagraphFormat.SpaceAfter = 6

    # 1. Letter Ref and Date Block
    $selection.Font.Bold = $true
    $selection.TypeText("Ref: $($json.letterNumber)")
    $selection.ParagraphFormat.Alignment = 0 # Left
    
    # We will use spaces to push date to the right, or type Date on a new line
    $selection.TypeParagraph()
    $selection.TypeText("Date: $($json.issueDate)")
    $selection.TypeParagraph()
    $selection.TypeParagraph()

    # 2. Private & Confidential label
    $selection.Font.Bold = $true
    $selection.Font.Italic = $true
    $selection.TypeText("PRIVATE AND CONFIDENTIAL")
    $selection.TypeParagraph()
    $selection.TypeParagraph()
    $selection.Font.Italic = $false

    # 3. Recipient Address Block
    $selection.Font.Bold = $true
    $selection.TypeText("To,")
    $selection.TypeParagraph()
    $selection.Font.Bold = $false
    $selection.TypeText($json.recipientName)
    $selection.TypeParagraph()
    
    # Split address by newlines and print
    $addrLines = $json.recipientAddress -split "`n"
    foreach ($line in $addrLines) {
        if ($line.Trim()) {
            $selection.TypeText($line.Trim())
            $selection.TypeParagraph()
        }
    }
    $selection.TypeParagraph()

    # 4. Subject and Title
    $selection.Font.Bold = $true
    $selection.TypeText("Subject: $($json.subject)")
    $selection.TypeParagraph()
    $selection.TypeParagraph()

    # 5. Body paragraphs
    $bodyParagraphs = $json.bodyText -split "`n"
    foreach ($para in $bodyParagraphs) {
        $trimmed = $para.Trim()
        if ($trimmed -eq "{{COMPENSATION_TABLE}}") {
            # Insert dynamic compensation table
            $selection.TypeParagraph()
            
            $tableData = $json.compensationTable
            if ($tableData -and $tableData.Count -gt 0) {
                # Add table: 1 header row + data rows
                $numRows = $tableData.Count + 1
                $numCols = 4
                
                $tableRange = $selection.Range
                $table = $doc.Tables.Add($tableRange, $numRows, $numCols)
                $table.Borders.Enable = $true
                $table.Borders.InsideColor = 12632256 # Light gray
                $table.Borders.OutsideColor = 12632256
                $table.Borders.InsideLineStyle = 1 # Single line
                $table.Borders.OutsideLineStyle = 1
                
                # Style Header Row
                $table.Rows.Item(1).Range.Font.Bold = $true
                $table.Rows.Item(1).Range.Font.Size = 9.5
                $table.Rows.Item(1).Shading.BackgroundPatternColor = 15790320 # Light gray (#f0f0f0)
                
                $table.Cell(1, 1).Range.Text = "Salary Component"
                $table.Cell(1, 2).Range.Text = "Monthly (₹)"
                $table.Cell(1, 3).Range.Text = "Annual (₹)"
                $table.Cell(1, 4).Range.Text = "Statutory Status"
                
                $table.Cell(1, 1).Range.ParagraphFormat.Alignment = 0
                $table.Cell(1, 2).Range.ParagraphFormat.Alignment = 2 # Right
                $table.Cell(1, 3).Range.ParagraphFormat.Alignment = 2 # Right
                $table.Cell(1, 4).Range.ParagraphFormat.Alignment = 1 # Center

                $rowIdx = 2
                foreach ($item in $tableData) {
                    $table.Cell($rowIdx, 1).Range.Text = $item.component
                    $table.Cell($rowIdx, 2).Range.Text = $item.monthly
                    $table.Cell($rowIdx, 3).Range.Text = $item.annual
                    $table.Cell($rowIdx, 4).Range.Text = $item.status
                    
                    # Alignments
                    $table.Cell($rowIdx, 1).Range.ParagraphFormat.Alignment = 0
                    $table.Cell($rowIdx, 2).Range.ParagraphFormat.Alignment = 2 # Right
                    $table.Cell($rowIdx, 3).Range.ParagraphFormat.Alignment = 2 # Right
                    $table.Cell($rowIdx, 4).Range.ParagraphFormat.Alignment = 1 # Center
                    
                    # Highlight summary/total rows
                    $compName = $item.component.ToLower()
                    if ($compName -contains "gross" -or $compName -contains "ctc" -or $compName -contains "total" -or $compName -contains "stipend") {
                        $table.Rows.Item($rowIdx).Range.Font.Bold = $true
                        $table.Rows.Item($rowIdx).Shading.BackgroundPatternColor = 15790320
                    }
                    
                    $rowIdx++
                }
                
                # Move selection after the table
                [void]$selection.EndKey(6) # wdStory
                $selection.TypeParagraph()
            }
        } elseif ($trimmed -eq "{{SIGNATURE_BLOCK}}") {
            # Insert double signature table (Company Signatory and Employee Acceptance)
            $selection.TypeParagraph()
            $sigRange = $selection.Range
            $sigTable = $doc.Tables.Add($sigRange, 1, 2)
            $sigTable.Borders.Enable = $false
            
            # Make columns wide
            $sigTable.Columns.Item(1).Width = 240
            $sigTable.Columns.Item(2).Width = 240
            
            # Company Signatory
            $cell1 = $sigTable.Cell(1, 1).Range
            $cell1.ParagraphFormat.SpaceAfter = 4
            $cell1.ParagraphFormat.LineSpacing = 12
            $cell1.Font.Size = 10
            
            $cell1.Text = "For Adarsh Shipping and Services,`n`n"
            
            # Insert signature image if present
            if ($json.signaturePath -and (Test-Path $json.signaturePath)) {
                $sigImg = $cell1.InlineShapes.AddPicture($json.signaturePath)
                $sigImg.Height = 35
                $sigImg.Width = 90
            }
            
            $cell1.InsertAfter("`n$($json.signatoryName)`n$($json.signatoryDesignation)")
            
            # If seal path is present, insert company seal next to signature
            if ($json.sealPath -and (Test-Path $json.sealPath)) {
                $sealImg = $cell1.InlineShapes.AddPicture($json.sealPath)
                $sealImg.Height = 45
                $sealImg.Width = 45
            }
            
            # Recipient Acceptance Block
            $cell2 = $sigTable.Cell(1, 2).Range
            $cell2.ParagraphFormat.SpaceAfter = 4
            $cell2.ParagraphFormat.LineSpacing = 12
            $cell2.Font.Size = 10
            $cell2.Text = "Accepted & Agreed,`n`n`n`n"
            $cell2.InsertAfter("`nSignature: ___________________`nName: $($json.recipientName)`nDate: ___________________")
            
            [void]$selection.EndKey(6) # Move selection past table
            $selection.TypeParagraph()
        } elseif ($trimmed) {
            # Standard text paragraph
            $selection.Font.Bold = $false
            $selection.ParagraphFormat.Alignment = 3 # Justify
            $selection.TypeText($trimmed)
            $selection.TypeParagraph()
        } else {
            # Empty paragraph
            $selection.TypeParagraph()
        }
    }

    # 6. Verification and Footer Reference
    $selection.TypeParagraph()
    $selection.Font.Size = 8
    $selection.Font.Bold = $false
    $selection.ParagraphFormat.Alignment = 1 # Center
    $selection.ParagraphFormat.SpaceAfter = 3
    $selection.TypeText("----------------------------------------------------------------------------------------------------")
    $selection.TypeParagraph()
    $selection.TypeText("Verification Reference: $($json.letterNumber) | Document Hash: $($json.documentHash)")
    $selection.TypeParagraph()
    $selection.TypeText("Scan QR / Verify authenticity online at: $($json.verificationUrl)")
    $selection.TypeParagraph()

    # Save as DOCX
    $doc.SaveAs($outputDocx)

    # Export to PDF (wdFormatPDF = 17)
    $doc.SaveAs($outputPdf, 17)

    $doc.Close()
    $word.Quit()

    # Delete local temp copy
    if (Test-Path $tempLetterheadPath) {
        Remove-Item $tempLetterheadPath -Force -ErrorAction SilentlyContinue
    }
    
    # Calculate SHA-256 hash of PDF
    $hash = (Get-FileHash $outputPdf -Algorithm SHA256).Hash.ToLower()

    # Print results as JSON for Node to parse
    $result = @{
        ok = $true
        pdfHash = $hash
        docxPath = $outputDocx
        pdfPath = $outputPdf
    }
    Write-Output (ConvertTo-Json $result)
} catch {
    if ($doc) { $doc.Close() }
    if ($word) { $word.Quit() }
    
    # Delete local temp copy if it exists in case of failure
    if ($tempLetterheadPath -and (Test-Path $tempLetterheadPath)) {
        Remove-Item $tempLetterheadPath -Force -ErrorAction SilentlyContinue
    }

    $errResult = @{
        ok = $false
        error = $_.Exception.Message
    }
    Write-Output (ConvertTo-Json $errResult)
    exit 1
}
