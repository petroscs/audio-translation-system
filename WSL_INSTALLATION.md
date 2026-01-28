# WSL Installation Guide

## Quick Installation

WSL (Windows Subsystem for Linux) is required for Docker Desktop to work properly on Windows.

### Option 1: Using PowerShell (Recommended)

1. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Run the installation script:**
   ```powershell
   cd C:\Users\pcons\audio-translation-system
   .\install-wsl.ps1
   ```

3. **Or run directly:**
   ```powershell
   wsl --install
   ```

4. **Restart your computer** when prompted

### Option 2: Manual Installation

1. **Enable WSL feature:**
   ```powershell
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   ```

2. **Enable Virtual Machine Platform:**
   ```powershell
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```

3. **Install WSL:**
   ```powershell
   wsl --install
   ```

4. **Restart your computer**

### Option 3: Using Windows Features GUI

1. Press `Win + R`, type `optionalfeatures`, press Enter
2. Check "Windows Subsystem for Linux"
3. Check "Virtual Machine Platform"
4. Click OK and restart

## After Installation

1. **Restart your computer** (required)

2. **Set WSL 2 as default:**
   ```powershell
   wsl --set-default-version 2
   ```

3. **Verify installation:**
   ```powershell
   wsl --status
   ```

4. **Install a Linux distribution** (Ubuntu is default):
   - Open Microsoft Store
   - Search for "Ubuntu" or "WSL"
   - Install Ubuntu (or your preferred distribution)

5. **Start Docker Desktop:**
   - Docker Desktop should now work properly
   - It will use WSL 2 as its backend

## Troubleshooting

### WSL not found
- Ensure you're running Windows 10 version 2004+ or Windows 11
- Check Windows Update for latest features

### Docker Desktop still not working
- Ensure WSL 2 is set as default: `wsl --set-default-version 2`
- Restart Docker Desktop
- Check Docker Desktop settings → General → "Use the WSL 2 based engine"

### Virtual Machine Platform error
- Enable Hyper-V if available
- Check BIOS settings for virtualization support (VT-x/AMD-V)

## Verification

After installation and restart:

```powershell
# Check WSL version
wsl --version

# List installed distributions
wsl --list --verbose

# Check Docker is using WSL 2
docker info | Select-String "WSL"
```

## Next Steps

Once WSL is installed:
1. Restart your computer
2. Start Docker Desktop
3. Verify Docker is working: `docker --version`
4. Test Docker Compose: `docker-compose --version`
