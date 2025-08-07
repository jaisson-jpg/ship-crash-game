# 📱 Instruções para Build do APK - Ship Crash

## 🚨 Problema Atual

O build está falhando porque o Android SDK precisa ser atualizado para a versão 34. O erro indica que as dependências do Firebase requerem Android API 34 ou superior.

## 🔧 Soluções

### **Opção 1: Atualizar Android SDK (Recomendado)**

1. **Abrir Android Studio**
2. **Ir em Tools > SDK Manager**
3. **Na aba "SDK Platforms":**
   - Marcar "Android 14.0 (API 34)"
   - Marcar "Android 13.0 (API 33)" (se não estiver marcado)
4. **Na aba "SDK Tools":**
   - Marcar "Android SDK Build-Tools"
   - Marcar "Android SDK Platform-Tools"
5. **Clicar em "Apply" e aguardar o download**

### **Opção 2: Usar versão mais antiga do Firebase (Alternativa)**

Se não puder atualizar o SDK, podemos usar uma versão mais antiga do plugin Firebase:

```bash
cordova plugin remove cordova-plugin-firebasex
cordova plugin add cordova-plugin-firebasex@18.0.0
```

### **Opção 3: Build sem Firebase (Temporário)**

Para testar o app sem Firebase:

```bash
cordova plugin remove cordova-plugin-firebasex
cordova build android --release
```

## 🛠️ Comandos para Build

### **Build Debug (para testes):**
```bash
cordova build android
```

### **Build Release (para produção):**
```bash
cordova build android --release
```

### **Localizar o APK gerado:**
```bash
# Debug APK
platforms/android/app/build/outputs/apk/debug/app-debug.apk

# Release APK
platforms/android/app/build/outputs/apk/release/app-release.apk
```

## 📋 Checklist para Build Bem-sucedido

- [ ] Android SDK API 34 instalado
- [ ] Android Build Tools atualizados
- [ ] Google Services configurado
- [ ] Plugins Cordova instalados
- [ ] Ícones e splash screen configurados

## 🔄 Scripts Úteis

### **Limpar e rebuildar:**
```bash
cordova clean android
cordova build android
```

### **Verificar requisitos:**
```bash
cordova requirements android
```

### **Listar plugins:**
```bash
cordova plugin list
```

## 📱 Instalação do APK

1. **Transferir o APK para o celular**
2. **Habilitar "Fontes desconhecidas" nas configurações**
3. **Instalar o APK**
4. **Testar o aplicativo**

## 🎯 Próximos Passos

1. **Atualizar Android SDK para API 34**
2. **Executar build novamente**
3. **Testar o APK no dispositivo**
4. **Configurar Firebase corretamente**

---

**💡 Dica:** Se você não conseguir atualizar o SDK agora, pode usar o app via navegador web em `http://192.168.100.45:3000` 