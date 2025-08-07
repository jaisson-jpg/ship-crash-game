# 🔥 Configuração Firebase para Railway

## 📋 **Domínio do Railway**
URL: `https://web-production-20fe.up.railway.app`

## 🔧 **Passos para Configurar:**

### **1. Firebase Authentication - Domínios Autorizados**
1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto Ship Crash
3. Vá para **Authentication** → **Settings** → **Authorized domains**
4. Clique em **"Add domain"**
5. Adicione: `web-production-20fe.up.railway.app`
6. Salve as alterações

### **2. Verificar Regras do Firestore**
1. Vá para **Firestore Database** → **Rules**
2. Certifique-se que as regras permitem acesso:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### **3. Testar Configurações**
Após configurar, teste:
- ✅ Cadastro de novo usuário
- ✅ Login existente
- ✅ Carregamento do lobby
- ✅ Acesso ao jogo
- ✅ Dados salvando no Firestore

## 🎯 **URLs Importantes:**
- **App**: https://web-production-20fe.up.railway.app
- **GitHub**: https://github.com/jaisson-jpg/ship-crash-game
- **Firebase Console**: https://console.firebase.google.com

## 🔍 **Se Algo Não Funcionar:**
1. Verifique se o domínio foi adicionado corretamente
2. Aguarde 2-3 minutos para propagar
3. Limpe cache do navegador (Ctrl+Shift+R)
4. Teste em modo anônimo

## ✅ **Checklist Final:**
- [ ] Domínio adicionado no Firebase Auth
- [ ] Regras do Firestore configuradas
- [ ] App acessível via Railway
- [ ] Cadastro funcionando
- [ ] Login funcionando
- [ ] Jogo carregando dados