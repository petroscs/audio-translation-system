@echo off
REM Simple batch file to run the app on your phone
REM Usage: run-on-phone-simple.bat [translator|listener] [IP]

set APP=translator
set API_HOST=

if "%1"=="listener" set APP=listener
if "%2" neq "" set API_HOST=%2

echo ========================================
echo Running %APP% app on your phone
echo ========================================
echo.

REM Get IP if not provided
if "%API_HOST%"=="" (
    echo Detecting your computer's IP address...
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
        set IP=%%a
        set IP=!IP: =!
        if not "!IP!"=="" (
            echo !IP! | findstr /r "^192\.168\." >nul
            if !errorlevel! equ 0 (
                set API_HOST=!IP!
                goto :found
            )
        )
    )
    echo Could not auto-detect IP. Please enter your computer's IP:
    set /p API_HOST="IP (e.g. 192.168.178.82): "
    :found
)

set API_URL=http://%API_HOST%:5000
echo Using API: %API_URL%
echo.

REM Check devices
echo Checking connected devices...
flutter devices
echo.

REM Run the app
if "%APP%"=="translator" (
    cd mobile\translator_app
) else (
    cd mobile\listener_app
)

echo Running %APP% app on your phone...
flutter run --dart-define=API_BASE_URL=%API_URL%
