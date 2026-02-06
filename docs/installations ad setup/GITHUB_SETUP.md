# GitHub Repository Setup Guide

This guide will help you push the project to GitHub.

## Prerequisites

1. **Install Git** (if not already installed)
   - Download from: https://git-scm.com/download/win
   - During installation, select "Git from the command line and also from 3rd-party software"

2. **Install GitHub CLI** (optional, but recommended)
   - Download from: https://cli.github.com/
   - Or install via winget: `winget install GitHub.cli`

## Quick Setup (Automated)

Run the PowerShell script:

```powershell
.\setup-github.ps1
```

The script will:
- Initialize Git repository
- Configure Git user (if needed)
- Create initial commit
- Create GitHub repository (if GitHub CLI is installed and authenticated)
- Push code to GitHub

## Manual Setup

### Step 1: Initialize Git Repository

Open PowerShell in the project directory and run:

```powershell
cd C:\Users\pcons\audio-translation-system

# Initialize Git
git init

# Configure Git user (replace with your details)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Project structure and development plan"

# Set main branch
git branch -M main
```

### Step 2: Create GitHub Repository

**Option A: Using GitHub CLI (Recommended)**

```powershell
# Authenticate with GitHub (if not already done)
gh auth login

# Create repository and push
gh repo create audio-translation-system --source=. --remote=origin --branch=main --public
git push -u origin main
```

**Option B: Using GitHub Website**

1. Go to https://github.com/new
2. Repository name: `audio-translation-system`
3. Description: "Private, on-premise, real-time audio translation/broadcast system"
4. Choose Public or Private
5. **DO NOT** check "Initialize with README", ".gitignore", or "license"
6. Click "Create repository"

### Step 3: Connect and Push

After creating the repository on GitHub, run:

```powershell
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/audio-translation-system.git

# Push to GitHub
git push -u origin main
```

## Verify Setup

Check that everything is set up correctly:

```powershell
# Check remote URL
git remote -v

# Check commit history
git log --oneline

# Check status
git status
```

## Next Steps

After pushing to GitHub:

1. **Set up branch protection** (optional):
   - Go to repository Settings → Branches
   - Add rule for `main` branch
   - Require pull request reviews before merging

2. **Add collaborators** (if working in a team):
   - Go to repository Settings → Collaborators
   - Add team members

3. **Set up GitHub Actions** (optional):
   - Create `.github/workflows/` directory
   - Add CI/CD workflows

4. **Add repository topics** (optional):
   - Go to repository → Topics
   - Add: `webrtc`, `mediasoup`, `flutter`, `csharp`, `audio-translation`, `real-time`

## Troubleshooting

### Git is not recognized
- Make sure Git is installed and added to PATH
- Restart PowerShell after installation
- Verify with: `git --version`

### Authentication failed
- For HTTPS: Use a Personal Access Token instead of password
- Create token at: https://github.com/settings/tokens
- Use token as password when prompted

### Repository already exists
- If repository exists on GitHub, use:
  ```powershell
  git remote add origin https://github.com/YOUR_USERNAME/audio-translation-system.git
  git push -u origin main --force
  ```
  (Use `--force` only if you're sure you want to overwrite)

### Large files
- If you have large files, consider using Git LFS:
  ```powershell
  git lfs install
  git lfs track "*.wav"
  git lfs track "*.mp3"
  ```

## Repository URL Format

After setup, your repository will be available at:
- HTTPS: `https://github.com/YOUR_USERNAME/audio-translation-system.git`
- SSH: `git@github.com:YOUR_USERNAME/audio-translation-system.git`
