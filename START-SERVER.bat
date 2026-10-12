@echo off
setlocal
cd /d "%~dp0" || exit /b 1
where py >nul 2>nul
if errorlevel 1 goto usepython
py -3 -B "%~dp0scripts\serve-game.py" %*
exit /b %errorlevel%
:usepython
where python >nul 2>nul
if errorlevel 1 goto missing
python -B "%~dp0scripts\serve-game.py" %*
exit /b %errorlevel%
:missing
echo Python 3 is required. No software has been installed.
pause
exit /b 1
