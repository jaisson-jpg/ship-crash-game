@echo off
echo Criando keystore para assinar o APK...
echo.

keytool -genkey -v -keystore shipcrash.keystore -alias shipcrash -keyalg RSA -keysize 2048 -validity 10000 -storepass shipcrash123 -keypass shipcrash123 -dname "CN=Ship Crash, OU=Development, O=Game Studio, L=City, S=State, C=BR"

echo.
echo Keystore criada com sucesso!
echo Agora vamos fazer o build assinado...
echo.

cordova build android --release

echo.
echo Build concluido! Verifique o APK em:
echo platforms\android\app\build\outputs\apk\release\app-release.apk
pause 