@echo off
setlocal
rem The server verifies this checkout before opening an HTTP localhost URL.
call "%~dp0START-SERVER.bat" %*
exit /b %errorlevel%
