@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
    set "PY=py"
) else (
    where python >nul 2>nul
    if errorlevel 1 (
        echo Can cai Python 3.
        pause
        exit /b 1
    )
    set "PY=python"
)
echo CHI DUNG TREN MANG WIFI TIN CAY. Khong mo port ra Internet.
echo Tim IPv4 Address trong ket qua ipconfig, mo http://IPv4:8765 tren dien thoai.
ipconfig | findstr /I "IPv4"
start "WEAPON-VFX-LAN" cmd /k "%PY% -m http.server 8765 --bind 0.0.0.0"
pause
endlocal
