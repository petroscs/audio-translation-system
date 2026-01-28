# Non-interactive script to push to GitHub
# Uses default values and device flow authentication

Write-Host "=== Push to GitHub (Auto Mode) ===" -ForegroundColor Green
Write-Host ""

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Default values
$repoName = "audio-translation-system"
$repoDescription = "Private, on-premise, real-time audio translation/broadcast system"
$isPublic = $true

# Check authentication
Write-Host "Checking GitHub authentication..." -ForegroundColor Yellow
$authCheck = gh auth status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[INFO] Not authenticated. Starting device flow authentication..." -ForegroundColor Yellow
    Write-Host "This will open a browser window for authentication." -ForegroundColor Cyan
    Write-Host ""
    
    # Start device flow authentication (non-interactive)
    gh auth login --web --hostname github.com 2>&1 | ForEach-Object {
        if ($_ -match "First copy your one-time code: (\S+)") {
            Write-Host "`n[ACTION REQUIRED] Copy this code: $($matches[1])" -ForegroundColor Yellow
            Write-Host "A browser window will open. Enter the code when prompted." -ForegroundColor Cyan
        } elseif ($_ -match "https://github.com/login/device") {
            Write-Host "Open this URL: $_" -ForegroundColor Cyan
            Start-Process $_
        }
        Write-Host $_
    }
    
    Write-Host "`nWaiting for authentication to complete (this may take a minute)..." -ForegroundColor Yellow
    Write-Host "Please complete the authentication in your browser." -ForegroundColor Cyan
    
    # Wait and check authentication status
    $maxAttempts = 30
    $attempt = 0
    $authenticated = $false
    
    while ($attempt -lt $maxAttempts -and -not $authenticated) {
        Start-Sleep -Seconds 2
        $authStatus = gh auth status 2>&1
        if ($LASTEXITCODE -eq 0) {
            $authenticated = $true
            Write-Host "[OK] Authentication successful!" -ForegroundColor Green
        }
        $attempt++
    }
    
    if (-not $authenticated) {
        Write-Host "`n[ERROR] Authentication timeout. Please run 'gh auth login' manually." -ForegroundColor Red
        Write-Host "Then run this script again or use manual push commands." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "[OK] Already authenticated" -ForegroundColor Green
}

# Get current GitHub username
try {
    $username = gh api user --jq .login 2>$null
    Write-Host "`nLogged in as: $username" -ForegroundColor Cyan
} catch {
    Write-Host "`n[WARNING] Could not get username" -ForegroundColor Yellow
}

# Check if repository already exists
Write-Host "`nChecking if repository exists..." -ForegroundColor Yellow
$repoCheck = gh repo view $repoName 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[INFO] Repository '$repoName' already exists on GitHub" -ForegroundColor Yellow
    Write-Host "Checking if remote is already configured..." -ForegroundColor Yellow
    
    $remoteCheck = git remote get-url origin 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Adding remote..." -ForegroundColor Yellow
        git remote add origin "https://github.com/$username/$repoName.git"
    } else {
        Write-Host "[OK] Remote already configured" -ForegroundColor Green
    }
} else {
    # Create repository
    Write-Host "`nCreating GitHub repository '$repoName'..." -ForegroundColor Yellow
    
    $visibility = if ($isPublic) { "--public" } else { "--private" }
    $createResult = gh repo create $repoName --source=. --remote=origin --push $visibility --description="$repoDescription" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Repository created successfully!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to create repository:" -ForegroundColor Red
        Write-Host $createResult -ForegroundColor Red
        exit 1
    }
}

# Push to GitHub
Write-Host "`nPushing code to GitHub..." -ForegroundColor Yellow
$pushResult = git push -u origin main 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Code pushed to GitHub!" -ForegroundColor Green
    Write-Host "`nRepository URL: https://github.com/$username/$repoName" -ForegroundColor Cyan
    Write-Host "`nYou can view it at: https://github.com/$username/$repoName" -ForegroundColor Cyan
} else {
    Write-Host "`n[ERROR] Failed to push code:" -ForegroundColor Red
    Write-Host $pushResult -ForegroundColor Red
    Write-Host "`nYou may need to:" -ForegroundColor Yellow
    Write-Host "1. Check your authentication: gh auth status" -ForegroundColor White
    Write-Host "2. Try pushing manually: git push -u origin main" -ForegroundColor White
}
