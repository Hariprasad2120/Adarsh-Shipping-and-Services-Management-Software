# start-ngrok.ps1
# Expose Next.js server on port 3000 to public HTTPS for Google Chat local development.
# Contains no secrets or tokens.

$port = 3000
$ngrokApiUrl = "http://127.0.0.1:4040/api/tunnels"

# Update PATH for current powershell session in case ngrok was recently installed
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "Checking if ngrok is already running..." -ForegroundColor Cyan

try {
    $tunnels = Invoke-RestMethod -Uri $ngrokApiUrl -UseBasicParsing -ErrorAction Stop
    Write-Host "ngrok is already running." -ForegroundColor Green
} catch {
    Write-Host "Starting ngrok on port $port..." -ForegroundColor Yellow
    # Start ngrok in background
    Start-Process ngrok -ArgumentList "http $port" -NoNewWindow
    # Wait for initialization
    Start-Sleep -Seconds 3
}

# Fetch the public URL from ngrok local API
$publicUrl = $null
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-RestMethod -Uri $ngrokApiUrl -UseBasicParsing -ErrorAction Stop
        $publicUrl = $response.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url
        if ($publicUrl) {
            break;
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($publicUrl) {
    $endpoint = "$publicUrl/api/google-chat"
    Write-Host "`n==================================================" -ForegroundColor Green
    Write-Host "ngrok Tunnel Active!" -ForegroundColor Green
    Write-Host "Local Host:            http://localhost:$port" -ForegroundColor Green
    Write-Host "Public HTTPS URL:      $publicUrl" -ForegroundColor Cyan
    Write-Host "Google Chat Endpoint:  $endpoint" -ForegroundColor Yellow
    Write-Host "==================================================`n" -ForegroundColor Green
} else {
    Write-Error "Failed to retrieve public URL from ngrok local API. Make sure ngrok is authenticated."
}
