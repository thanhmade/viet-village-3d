@echo off
setlocal
set "VILLAGE_NO_PAUSE="
for %%A in (%*) do if /I "%%~A"=="--no-browser" set "VILLAGE_NO_PAUSE=1"
cd /d "%~dp0" || goto foldererror
where py >nul 2>nul
if errorlevel 1 goto usepython
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if errorlevel 1 goto usepython
py -3 -B "%~dp0scripts\serve-game.py" %*
goto result
:usepython
where python >nul 2>nul
if errorlevel 1 goto missing
python -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
if errorlevel 1 goto missing
python -B "%~dp0scripts\serve-game.py" %*
goto result
:missing
echo Python 3.10 or newer was not found or could not run.
echo Install Python 3 for Windows from https://www.python.org/downloads/windows/
echo Enable the Python launcher or Add Python to PATH, then reopen START-GAME.bat.
echo No software has been installed by this launcher. Do not open index.html directly.
if not defined VILLAGE_NO_PAUSE pause
exit /b 1
:foldererror
echo Cannot access the project folder: "%~dp0"
if not defined VILLAGE_NO_PAUSE pause
exit /b 1
:result
set "VILLAGE_EXIT=%errorlevel%"
if not "%VILLAGE_EXIT%"=="0" if not defined VILLAGE_NO_PAUSE pause
exit /b %VILLAGE_EXIT%
