# Run the App on Your Phone

Quick steps to install and run the Translator or Listener app on your Android phone.

## Before You Start

1. **Backend running** – Your backend API must be running on port 5000 on your PC.
2. **Same Wi‑Fi** – Phone and PC should be on the same Wi‑Fi network.
3. **USB cable** – Use a data-capable USB cable to connect the phone to your PC.

---

## Step 1: Enable USB Debugging (Android)

1. On your phone: **Settings → About phone**
2. Tap **Build number** 7 times until it says "You are now a developer!"
3. Go back to **Settings → Developer options**
4. Turn on **USB debugging**
5. Connect the phone to your PC with the USB cable
6. On the phone, when asked "Allow USB debugging?", tap **Allow** (optional: check "Always allow from this computer")

---

## Step 2: Check Your PC’s IP Address

In PowerShell on your PC:

```powershell
ipconfig | findstr IPv4
```

Use the address that looks like `192.168.x.x` (your main Wi‑Fi adapter).  
Example: `192.168.178.82`

---

## Step 3: Run the App

**Option A – Use the script (easiest)**

From the project root in PowerShell:

**If you get an execution policy error**, use one of these methods:

**Method 1: Bypass for this script only (Recommended)**
```powershell
cd c:\Users\pcons\audio-translation-system
powershell -ExecutionPolicy Bypass -File .\run-on-phone.ps1
```

**Method 2: Change policy for current session**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\run-on-phone.ps1
```

**Method 3: Run normally (if policy allows)**
```powershell
cd c:\Users\pcons\audio-translation-system

# Run Translator app (default)
.\run-on-phone.ps1

# Run Listener app
.\run-on-phone.ps1 listener

# Or specify your IP if auto-detect is wrong
.\run-on-phone.ps1 translator 192.168.178.82
```

The script will detect your IP, run `flutter devices`, then build and install the app on your phone.

**Option B – Manual commands**

```powershell
cd c:\Users\pcons\audio-translation-system\mobile\translator_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://YOUR_IP:5000
```

Replace `YOUR_IP` with your PC’s IP (e.g. `192.168.178.82`).

For the Listener app:

```powershell
cd c:\Users\pcons\audio-translation-system\mobile\listener_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://YOUR_IP:5000
```

---

## If Your Phone Isn’t Listed

Run:

```powershell
flutter devices
```

- **No devices** – Reconnect the cable, unlock the phone, accept USB debugging, try another USB port/cable.
- **"unauthorized"** – On the phone, accept the USB debugging dialog.
- **"offline"** – Unplug and plug again; if it stays offline, try another cable or port.

---

## Login (Translator / Listener)

- **Username:** `admin`  
- **Password:** `ChangeMe123!`

---

## Troubleshooting

| Problem | What to do |
|--------|------------|
| App can’t connect | Ensure backend is running on the PC and phone uses `http://YOUR_PC_IP:5000`. |
| "Connection refused" | Check Windows Firewall allows port 5000; ensure phone and PC are on the same Wi‑Fi. |
| Build errors | Run `flutter clean` then `flutter pub get` in the app folder and try again. |

For more detail, see **MOBILE_SETUP.md**.
