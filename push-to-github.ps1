# Quick script to push to GitHub
# This will guide you through authentication and repository creation

Write-Host "=== Push to GitHub ===" -ForegroundColor Green
Write-Host ""

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check authentication
Write-Host "Checking GitHub authentication..." -ForegroundColor Yellow
$authCheck = gh auth status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ACTION REQUIRED] You need to authenticate with GitHub" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Choose authentication method:" -ForegroundColor Cyan
    Write-Host "1. Login with web browser (recommended)" -ForegroundColor White
    Write-Host "2. Use a Personal Access Token" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Enter choice (1 or 2)"
    
    if ($choice -eq "1") {
        Write-Host "`nStarting browser authentication..." -ForegroundColor Yellow
        gh auth login --web
    } else {
        Write-Host "`nYou'll need to create a Personal Access Token:" -ForegroundColor Yellow
        Write-Host "1. Go to: https://github.com/settings/tokens" -ForegroundColor Cyan
        Write-Host "2. Click 'Generate new token' -> 'Generate new token (classic)'" -ForegroundColor Cyan
        Write-Host "3. Select scope: 'repo' (full control of private repositories)" -ForegroundColor Cyan
        Write-Host "4. Copy the token" -ForegroundColor Cyan
        Write-Host ""
        gh auth login --with-token
    }
    
    Write-Host "`nWaiting for authentication to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Verify authentication
    gh auth status
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[ERROR] Authentication failed. Please try again." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] Already authenticated" -ForegroundColor Green
}

# Get repository details
Write-Host "`n=== Repository Setup ===" -ForegroundColor Green
$repoName = Read-Host "Enter repository name (default: audio-translation-system)"
if (-not $repoName) {
    $repoName = "audio-translation-system"
}

$repoDescription = Read-Host "Enter repository description (or press Enter for default)"
if (-not $repoDescription) {
    $repoDescription = "Private, on-premise, real-time audio translation/broadcast system"
}

$isPrivate = Read-Host "Make repository private? (y/N)"
$visibility = if ($isPrivate -eq "y" -or $isPrivate -eq "Y") { "--private" } else { "--public" }

# Create repository
Write-Host "`nCreating GitHub repository..." -ForegroundColor Yellow
gh repo create $repoName --source=. --remote=origin --branch=main $visibility --description="$repoDescription"

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Repository created successfully!" -ForegroundColor Green
    
    # Push to GitHub
    Write-Host "`nPushing code to GitHub..." -ForegroundColor Yellow
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[SUCCESS] Code pushed to GitHub!" -ForegroundColor Green
        $repoUrl = gh repo view --web $repoName 2>&1 | Select-String -Pattern "https://github.com" | ForEach-Object { $_.Line }
        Write-Host "`nRepository URL: https://github.com/$(gh api user --jq .login)/$repoName" -ForegroundColor Cyan
        Write-Host "`nYou can view it at: https://github.com/$(gh api user --jq .login)/$repoName" -ForegroundColor Cyan
    } else {
        Write-Host "`n[ERROR] Failed to push code. Please check the error above." -ForegroundColor Red
    }
} else {
    Write-Host "`n[ERROR] Failed to create repository. It may already exist." -ForegroundColor Red
    Write-Host "If the repository already exists, you can push manually:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/YOUR_USERNAME/$repoName.git" -ForegroundColor Cyan
    Write-Host "  git push -u origin main" -ForegroundColor Cyan
}
