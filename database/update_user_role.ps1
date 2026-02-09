# PowerShell script to update a user's role in the SQLite database
# This script helps you update your user role to 'Listener'

param(
    [Parameter(Mandatory=$true)]
    [string]$UsernameOrEmail,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('Admin', 'Translator', 'Listener')]
    [string]$Role = 'Listener',
    
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
Write-Host "Looking for user: $UsernameOrEmail" -ForegroundColor Cyan
Write-Host ""

# First, show current user info
Write-Host "Current user information:" -ForegroundColor Yellow
sqlite3 $dbPath "SELECT Id, Username, Email, Role FROM users WHERE Username = '$UsernameOrEmail' OR Email = '$UsernameOrEmail';"

$userExists = sqlite3 $dbPath "SELECT COUNT(*) FROM users WHERE Username = '$UsernameOrEmail' OR Email = '$UsernameOrEmail';"
if ($userExists -eq "0") {
    Write-Host ""
    Write-Host "Error: User not found with username or email: $UsernameOrEmail" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available users:" -ForegroundColor Yellow
    sqlite3 $dbPath "SELECT Username, Email, Role FROM users;"
    exit 1
}

Write-Host ""
$confirm = Read-Host "Update role to '$Role'? (y/N)"
if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Update the role
Write-Host ""
Write-Host "Updating role..." -ForegroundColor Cyan
sqlite3 $dbPath "UPDATE users SET Role = '$Role', UpdatedAt = CURRENT_TIMESTAMP WHERE Username = '$UsernameOrEmail' OR Email = '$UsernameOrEmail';"

# Verify the update
Write-Host ""
Write-Host "Updated user information:" -ForegroundColor Green
sqlite3 $dbPath "SELECT Id, Username, Email, Role FROM users WHERE Username = '$UsernameOrEmail' OR Email = '$UsernameOrEmail';"

Write-Host ""
Write-Host "✓ Role updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: You must log out and log back in to get a new JWT token with the updated role." -ForegroundColor Yellow
