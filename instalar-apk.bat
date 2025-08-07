@echo off
echo ========================================
echo    INSTALADOR APK SHIP CRASH
echo ========================================
echo.

echo Verificando dispositivos conectados...
adb devices

echo.
echo Escolha o APK para instalar:
echo 1. ShipCrash-Debug.apk (Recomendado - mais fácil de instalar)
echo 2. ShipCrash-Novo.apk (Versão release)
echo 3. ShipCrash.apk (Versão anterior)
echo.

set /p escolha="Digite o número (1, 2 ou 3): "

if "%escolha%"=="1" (
    echo.
    echo Instalando ShipCrash-Debug.apk...
    adb install -r ShipCrash-Debug.apk
    goto :fim
)

if "%escolha%"=="2" (
    echo.
    echo Instalando ShipCrash-Novo.apk...
    adb install -r ShipCrash-Novo.apk
    goto :fim
)

if "%escolha%"=="3" (
    echo.
    echo Instalando ShipCrash.apk...
    adb install -r ShipCrash.apk
    goto :fim
)

echo Opção inválida!

:fim
echo.
echo ========================================
echo Instalação concluída!
echo ========================================
pause 