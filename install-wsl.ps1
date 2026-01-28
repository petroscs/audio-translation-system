# WSL Installation Script
# Run this script as Administrator: Right-click PowerShell -> Run as Administrator

Write-Host "=== WSL Installation Script ===" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Navigate to this directory" -ForegroundColor White
    Write-Host "4. Run: .\install-wsl.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run this command in an elevated PowerShell:" -ForegroundColor Yellow
    Write-Host "wsl --install" -ForegroundColor Cyan
    exit 1
}

Write-Host "[OK] Running with administrator privileges" -ForegroundColor Green
Write-Host ""

# Enable WSL feature
Write-Host "Enabling Windows Subsystem for Linux..." -ForegroundColor Yellow
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] WSL feature enabled" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Could not enable WSL feature. Error code: $LASTEXITCODE" -ForegroundColor Yellow
}

# Enable Virtual Machine Platform
Write-Host "Enabling Virtual Machine Platform..." -ForegroundColor Yellow
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Virtual Machine Platform enabled" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Could not enable Virtual Machine Platform. Error code: $LASTEXITCODE" -ForegroundColor Yellow
}

# Install WSL
Write-Host ""
Write-Host "Installing WSL..." -ForegroundColor Yellow
wsl.exe --install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] WSL installation initiated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: A system restart is required to complete the installation." -ForegroundColor Yellow
    Write-Host ""
    $restart = Read-Host "Do you want to restart now? (Y/N)"
    if ($restart -eq "Y" -or $restart -eq "y") {
        Write-Host "Restarting system in 10 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        Restart-Computer
    } else {
        Write-Host "Please restart your computer manually to complete WSL installation." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[INFO] WSL installation command executed." -ForegroundColor Cyan
    Write-Host "Please check the output above for any errors." -ForegroundColor Yellow
    Write-Host "A system restart may be required." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Installation Script Complete ===" -ForegroundColor Green
