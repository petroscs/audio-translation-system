# Run mobile app on your phone
# Usage: .\run-on-phone.ps1 [translator|listener] [IP]
# Example: .\run-on-phone.ps1 translator
# Example: .\run-on-phone.ps1 listener 192.168.178.82

param(
    [Parameter(Position=0)]
    [ValidateSet("translator", "listener")]
    [string]$App = "translator",

    [Parameter(Position=1)]
    [string]$ApiHost = ""
)

# Find computer IP if not provided
if ([string]::IsNullOrWhiteSpace($ApiHost)) {
    $ipLine = (ipconfig | Select-String -Pattern "IPv4.*:\s*(\d+\.\d+\.\d+\.\d+)" | Where-Object { $_.Line -notmatch "172\.(1[6-9]|2[0-9]|3[0-1])\." } | Select-Object -First 1)
    if ($ipLine -match "(\d+\.\d+\.\d+\.\d+)") {
        $ApiHost = $Matches[1]
    }
}
if ([string]::IsNullOrWhiteSpace($ApiHost)) {
    Write-Host "Could not detect your IP. Run: ipconfig" -ForegroundColor Yellow
    $ApiHost = Read-Host "Enter your computer's IP (e.g. 192.168.178.82)"
}

$ApiUrl = "http://${ApiHost}:5000"
Write-Host "Using API: $ApiUrl" -ForegroundColor Cyan
Write-Host ""

# Check devices
Write-Host "Checking connected devices..." -ForegroundColor Cyan
flutter devices
Write-Host ""

$appDir = if ($App -eq "translator") { "mobile\translator_app" } else { "mobile\listener_app" }
$projectPath = Join-Path $PSScriptRoot $appDir

if (-not (Test-Path $projectPath)) {
    Write-Host "Error: Project not found at $projectPath" -ForegroundColor Red
    exit 1
}

Push-Location $projectPath
try {
    Write-Host "Running $App app on your phone (API: $ApiUrl)..." -ForegroundColor Green
    flutter run --dart-define=API_BASE_URL=$ApiUrl
} finally {
    Pop-Location
}
