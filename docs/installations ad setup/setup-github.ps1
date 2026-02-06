# GitHub Repository Setup Script
# Run this script after installing Git and GitHub CLI (optional)

Write-Host "=== GitHub Repository Setup ===" -ForegroundColor Green
Write-Host ""

# Check if Git is installed
try {
    $gitVersion = git --version
    Write-Host "[OK] Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Navigate to project directory
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

Write-Host "`nProject directory: $projectPath" -ForegroundColor Cyan

# Initialize Git repository (if not already initialized)
if (-not (Test-Path ".git")) {
    Write-Host "`nInitializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "[OK] Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "`n[OK] Git repository already initialized" -ForegroundColor Green
}

# Configure Git user (if not configured globally)
$userName = git config user.name
$userEmail = git config user.email

if (-not $userName) {
    Write-Host "`nConfiguring Git user..." -ForegroundColor Yellow
    $inputName = Read-Host "Enter your Git username (or press Enter to skip)"
    if ($inputName) {
        git config user.name $inputName
    }
}

if (-not $userEmail) {
    $inputEmail = Read-Host "Enter your Git email (or press Enter to skip)"
    if ($inputEmail) {
        git config user.email $inputEmail
    }
}

# Add all files
Write-Host "`nAdding files to Git..." -ForegroundColor Yellow
git add .
Write-Host "[OK] Files added" -ForegroundColor Green

# Create initial commit
Write-Host "`nCreating initial commit..." -ForegroundColor Yellow
git commit -m "Initial commit: Project structure and development plan"
Write-Host "[OK] Initial commit created" -ForegroundColor Green

# Set main branch
Write-Host "`nSetting main branch..." -ForegroundColor Yellow
git branch -M main
Write-Host "[OK] Branch set to main" -ForegroundColor Green

# Check for GitHub CLI
Write-Host "`nChecking for GitHub CLI..." -ForegroundColor Yellow
try {
    $ghVersion = gh --version 2>$null
    Write-Host "[OK] GitHub CLI found" -ForegroundColor Green
    
    # Check if user is authenticated
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] GitHub CLI authenticated" -ForegroundColor Green
        
        # Create repository on GitHub
        Write-Host "`nCreating GitHub repository..." -ForegroundColor Yellow
        $repoName = Read-Host "Enter repository name (default: audio-translation-system)"
        if (-not $repoName) {
            $repoName = "audio-translation-system"
        }
        
        $repoDescription = Read-Host "Enter repository description (or press Enter to skip)"
        $isPrivate = Read-Host "Make repository private? (y/N)"
        
        $ghArgs = @("repo", "create", $repoName, "--source=.", "--remote=origin", "--branch=main")
        if ($repoDescription) {
            $ghArgs += "--description=$repoDescription"
        }
        if ($isPrivate -eq "y" -or $isPrivate -eq "Y") {
            $ghArgs += "--private"
        } else {
            $ghArgs += "--public"
        }
        
        & gh $ghArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] GitHub repository created" -ForegroundColor Green
            
            # Push to GitHub
            Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
            git push -u origin main
            Write-Host "[OK] Code pushed to GitHub" -ForegroundColor Green
        }
    } else {
        Write-Host "[INFO] GitHub CLI not authenticated. Run: gh auth login" -ForegroundColor Yellow
        Write-Host "Then run this script again or follow manual instructions below." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[INFO] GitHub CLI not found. Using manual method." -ForegroundColor Yellow
}

# Manual instructions
Write-Host "`n=== Manual Setup Instructions ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If GitHub CLI is not available, follow these steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to https://github.com/new" -ForegroundColor White
Write-Host "2. Create a new repository named 'audio-translation-system'" -ForegroundColor White
Write-Host "3. DO NOT initialize with README, .gitignore, or license" -ForegroundColor White
Write-Host "4. Copy the repository URL" -ForegroundColor White
Write-Host "5. Run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/audio-translation-system.git" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
