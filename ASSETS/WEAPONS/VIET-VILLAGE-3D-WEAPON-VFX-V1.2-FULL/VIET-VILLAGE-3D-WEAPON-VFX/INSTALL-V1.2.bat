@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "TARGET=H:\CHAT GPT\3D-GAME\VIET-VILLAGE-3D\VIET-VILLAGE-3D-CAP-NHAT\ASSETS\WEAPONS\VFX-DEMO"
if not "%~1"=="" set "TARGET=%~1"
echo.
echo [VIET VILLAGE 3D] CAI BAN SUA CHUYEN VU KHI V1.2
echo Dich: "%TARGET%"
echo.
if not exist "%TARGET%\index.html" (
  echo [LOI] Khong tim thay index.html trong thu muc VFX-DEMO.
  echo Hay keo thu muc VFX-DEMO tha vao INSTALL-V1.2.bat neu duong dan khac.
  pause
  exit /b 1
)
if not exist "%TARGET%\src\models.js" (
  echo [LOI] Khong tim thay src\models.js. Dung lai de tranh chep sai thu muc.
  pause
  exit /b 1
)
if not exist "%~dp0src\main.js" (
  echo [LOI] Ban va chua duoc giai nen day du.
  pause
  exit /b 1
)
set "BACKUP=%TARGET%\BACKUP-BEFORE-V1.2"
if not exist "%BACKUP%" mkdir "%BACKUP%"
copy /y "%TARGET%\index.html" "%BACKUP%\index.html" >nul
copy /y "%TARGET%\src\main.js" "%BACKUP%\main.js" >nul
copy /y "%TARGET%\src\models.js" "%BACKUP%\models.js" >nul
copy /y "%TARGET%\src\style.css" "%BACKUP%\style.css" >nul
copy /y "%~dp0index.html" "%TARGET%\index.html" >nul || goto :failure
copy /y "%~dp0src\main.js" "%TARGET%\src\main.js" >nul || goto :failure
copy /y "%~dp0src\models.js" "%TARGET%\src\models.js" >nul || goto :failure
copy /y "%~dp0src\style.css" "%TARGET%\src\style.css" >nul || goto :failure
echo.
echo [THANH CONG] Da chep ban V1.2 vao VFX-DEMO.
echo Ban sao luu o: "%BACKUP%"
echo Dong tab localhost:8765 cu, mo lai bang duong dan:
echo http://localhost:8765/?build=1.2.0
start "" "http://localhost:8765/?build=1.2.0"
echo Sau khi mo: xem nhan V1.2 o goc phai va chon TU KIEM TRA 5 VU KHI.
pause
exit /b 0
:failure
echo [LOI] Khong the chep tep. Kiem tra quyen truy cap.
pause
exit /b 1
