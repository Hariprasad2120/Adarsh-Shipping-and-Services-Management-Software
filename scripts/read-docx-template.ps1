param(
    [string]$docxPath
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

if (-not $docxPath -or -not (Test-Path $docxPath)) {
    Write-Output (@{ ok = $false; error = "DOCX path is missing or invalid." } | ConvertTo-Json -Compress)
    exit 1
}

$docxPath = (Resolve-Path $docxPath).Path
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("hr-letter-import-" + [guid]::NewGuid().ToString())
$extractRoot = Join-Path $tempRoot "extracted"
$assetsDir = Join-Path $tempRoot "assets"
New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

function Escape-Html([string]$value) {
    if ($null -eq $value) { return "" }
    return $value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;")
}

try {
    [System.IO.Compression.ZipFile]::ExtractToDirectory($docxPath, $extractRoot)

    $documentXmlPath = Join-Path $extractRoot "word\document.xml"
    if (-not (Test-Path $documentXmlPath)) {
        throw "document.xml not found in DOCX package."
    }

    $relsPath = Join-Path $extractRoot "word\_rels\document.xml.rels"
    $relMap = @{}
    if (Test-Path $relsPath) {
        [xml]$relsXml = Get-Content -Raw -Path $relsPath
        foreach ($rel in $relsXml.Relationships.Relationship) {
            $relMap[$rel.Id] = $rel.Target
        }
    }

    [xml]$docXml = Get-Content -Raw -Path $documentXmlPath
    $ns = New-Object System.Xml.XmlNamespaceManager($docXml.NameTable)
    $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
    $ns.AddNamespace("a", "http://schemas.openxmlformats.org/drawingml/2006/main")
    $ns.AddNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

    $textLines = New-Object System.Collections.Generic.List[string]
    $htmlParts = New-Object System.Collections.Generic.List[string]

    foreach ($paragraph in $docXml.SelectNodes("//w:body/w:p", $ns)) {
        $styleNode = $paragraph.SelectSingleNode("./w:pPr/w:pStyle", $ns)
        $style = if ($styleNode) { $styleNode.GetAttribute("val", "http://schemas.openxmlformats.org/wordprocessingml/2006/main") } else { "" }
        $tag = if ($style -match "^Heading[1-3]$") { "h2" } else { "p" }

        $paragraphText = ""
        $paragraphHtml = ""

        foreach ($run in $paragraph.SelectNodes("./w:r", $ns)) {
          $textNodes = $run.SelectNodes("./w:t", $ns)
          foreach ($textNode in $textNodes) {
              $paragraphText += $textNode.InnerText
              $paragraphHtml += Escape-Html $textNode.InnerText
          }

          if ($run.SelectSingleNode("./w:br", $ns)) {
              $paragraphText += "`n"
              $paragraphHtml += "<br />"
          }

          $blipNode = $run.SelectSingleNode(".//a:blip", $ns)
          if ($blipNode) {
              $embedId = $blipNode.GetAttribute("embed", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
              if ($embedId -and $relMap.ContainsKey($embedId)) {
                  $target = $relMap[$embedId] -replace "/", "\"
                  $sourceAsset = Join-Path $extractRoot ("word\" + $target)
                  if (Test-Path $sourceAsset) {
                      $assetName = [System.IO.Path]::GetFileName($sourceAsset)
                      $copiedAsset = Join-Path $assetsDir $assetName
                      Copy-Item $sourceAsset -Destination $copiedAsset -Force
                      $paragraphHtml += "<img src=""$assetName"" alt=""Template image"" />"
                  }
              }
          }
        }

        $trimmedText = $paragraphText.Trim()
        if ($trimmedText -or $paragraphHtml) {
            $textLines.Add($trimmedText)
            $htmlParts.Add("<$tag>$paragraphHtml</$tag>")
        }
    }

    $result = @{
        ok = $true
        text = ($textLines -join "`n`n")
        html = ($htmlParts -join "`n")
        assetsDir = $assetsDir
        tempRoot = $tempRoot
    }

    Write-Output ($result | ConvertTo-Json -Depth 6 -Compress)
} catch {
    Write-Output (@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
    exit 1
}
