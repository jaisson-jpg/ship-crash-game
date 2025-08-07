@echo off
echo ========================================
echo    SHIP CRASH - SERVIDOR
echo ========================================
echo.
echo Obtendo IP local...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do set LOCAL_IP=%%a
set LOCAL_IP=%LOCAL_IP: =%
echo.
echo IP Local: %LOCAL_IP%
echo.
echo Iniciando servidor...
echo.
echo Para acessar no PC: http://localhost:3000
echo Para acessar no celular: http://%LOCAL_IP%:3000
echo.
echo ========================================
echo.
node server.js
pause 