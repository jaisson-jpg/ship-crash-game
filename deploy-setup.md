# 🚀 Guia Completo de Deploy - Ship Crash Game

## 📋 **Pré-requisitos**

1. ✅ Conta no GitHub
2. ✅ Conta no Railway
3. ✅ Projeto Firebase configurado
4. ✅ Git instalado

## 🔧 **Passo 1: Preparar o GitHub**

### **1.1 Criar Repositório no GitHub**
1. Acesse: https://github.com
2. Clique em **"New repository"**
3. Nome: `ship-crash-game`
4. Descrição: `Jogo Ship Crash com sistema completo`
5. **Público** ou **Privado** (recomendo privado)
6. ✅ Marque **"Add a README file"**
7. Clique em **"Create repository"**

### **1.2 Clonar e Enviar Código**
```bash
# No terminal, na pasta do projeto:
git init
git add .
git commit -m "🚀 Initial commit - Ship Crash Game"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/ship-crash-game.git
git push -u origin main
```

## 🚂 **Passo 2: Deploy no Railway**

### **2.1 Conectar GitHub ao Railway**
1. Acesse: https://railway.app
2. Clique em **"Start a New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Encontre `ship-crash-game`
5. Clique em **"Deploy Now"**

### **2.2 Configurar Variáveis de Ambiente**
No painel do Railway, vá para **"Variables"** e adicione:

```
PORT=3000
NODE_ENV=production
```

### **2.3 Verificar Deploy**
1. Aguarde o build finalizar
2. Clique na URL gerada
3. Teste o funcionamento

## ⚙️ **Passo 3: Configurações Finais**

### **3.1 Atualizar Firebase (Se Necessário)**
Se estiver usando localhost no Firebase:

1. Acesse: https://console.firebase.google.com
2. Vá para **"Authentication" → "Settings" → "Authorized domains"**
3. Adicione o domínio do Railway: `SEU_APP.railway.app`

### **3.2 Testar Funcionalidades**
✅ Cadastro
✅ Login  
✅ Lobby
✅ Jogo
✅ Dados persistindo

## 🔍 **Solução de Problemas**

### **Erro de Build:**
```bash
# Verificar logs no Railway
# Geralmente são problemas de dependências
```

### **Erro 500:**
```bash
# Verificar se todas as variáveis estão configuradas
# Verificar se o Firebase está configurado corretamente
```

### **Erro de CORS:**
```bash
# Verificar se o domínio foi adicionado no Firebase
```

## 📱 **URLs Importantes**

- **GitHub**: https://github.com/SEU_USUARIO/ship-crash-game
- **Railway**: https://railway.app/project/SEU_PROJETO
- **App Live**: https://SEU_APP.railway.app
- **Firebase**: https://console.firebase.google.com

## 🎯 **Checklist Final**

- [ ] Código no GitHub
- [ ] Deploy no Railway funcionando
- [ ] Firebase configurado com domínio do Railway
- [ ] Cadastro funcionando
- [ ] Login funcionando
- [ ] Jogo carregando
- [ ] Dados salvando no Firestore

## 🚀 **Comandos Úteis**

### **Atualizar o Deploy:**
```bash
git add .
git commit -m "🔄 Update: descrição da mudança"
git push
```

### **Ver Logs do Railway:**
No painel do Railway → **"Deployments"** → **"View Logs"**

### **Rollback (se necessário):**
No painel do Railway → **"Deployments"** → selecionar versão anterior

---

**🎉 Pronto! Seu Ship Crash Game está online!**