@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
    set "PY=py"
) else (
    where python >nul 2>nul
    if errorlevel 1 (
        echo Can cai dat Python 3 de chay web server.
        echo https://www.python.org/downloads/
        pause
        exit /b 1
    )
    set "PY=python"
)
start "WEAPON-VFX-SERVER" cmd /k "%PY% -m http.server 8765 --bind 127.0.0.1"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8765/"
echo Neu trinh duyet khong hien thi, mo http://localhost:8765/
echo Can Internet de tai Three.js tu CDN.
endlocal
