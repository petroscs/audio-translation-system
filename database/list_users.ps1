# PowerShell script to list all users in the database

param(
    [Parameter(Mandatory=$false)]
    [string]$DatabasePath = ".\database\audio_translation.db"
)

# Check if sqlite3 is available
$sqlite3Path = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite3Path) {
    Write-Host "Error: sqlite3 command not found. Please install SQLite or use a database tool." -ForegroundColor Red
    Write-Host "You can download SQLite from: https://www.sqlite.org/download.html" -ForegroundColor Yellow
    exit 1
}

# Resolve database path
$dbPath = Resolve-Path $DatabasePath -ErrorAction SilentlyContinue
if (-not $dbPath) {
    Write-Host "Error: Database file not found at: $DatabasePath" -ForegroundColor Red
    Write-Host "Please check the path and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Database: $dbPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "All users in the database:" -ForegroundColor Yellow
Write-Host ""

# List all users with formatted output
sqlite3 -header -column $dbPath "SELECT Id, Username, Email, Role, CreatedAt FROM users ORDER BY CreatedAt;"

Write-Host ""
Write-Host "To update a user's role, run:" -ForegroundColor Cyan
Write-Host "  .\database\update_user_role.ps1 -UsernameOrEmail 'username_or_email' -Role 'Listener'" -ForegroundColor White
