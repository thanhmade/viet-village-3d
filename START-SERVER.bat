@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 goto usepython
start "" http://localhost:8000/SOURCE-CODE/index.html
py -m http.server 8000 --bind 127.0.0.1
goto end
:usepython
where python >nul 2>nul
if errorlevel 1 goto missing
start "" http://localhost:8000/SOURCE-CODE/index.html
python -m http.server 8000 --bind 127.0.0.1
goto end
:missing
echo Python is not installed. Open START-GAME.bat instead.
pause
:end
