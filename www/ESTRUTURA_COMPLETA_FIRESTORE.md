# 🏗️ Estrutura Completa do Firestore - Ship Crash

## 📋 **Visão Geral**

Este documento descreve a estrutura completa do Firestore para o sistema Ship Crash, com todos os campos necessários para cadastro, lobby, jogo e sistema admin.

## 🗂️ **Estrutura das Coleções**

### **1. Coleção: `systemSettings`**

#### **Documento: `main`**
```javascript
{
  "initialBalance": 0.00,           // Saldo inicial para novos usuários
  "systemStatus": "online",         // Status do sistema (online/offline/maintenance)
  "maintenanceMode": false,         // Modo de manutenção
  "registrationEnabled": true,      // Se cadastros estão habilitados
  "maxUsers": 10000,               // Máximo de usuários permitidos
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "system-setup"
}
```

#### **Documento: `userCounter`**
```javascript
{
  "nextUserId": 100001,            // Próximo ID sequencial
  "totalUsers": 0,                 // Total de usuários registrados
  "activeUsers": 0,                // Usuários ativos no momento
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "system-setup"
}
```

#### **Documento: `notifications`**
```javascript
{
  "rechargeNotifications": true,    // Notificações de recarga
  "withdrawalNotifications": true,  // Notificações de saque
  "gameNotifications": true,        // Notificações de jogo
  "adminNotifications": true,       // Notificações para admin
  "emailNotifications": false,      // Notificações por email
  "pushNotifications": false,       // Notificações push
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "system-setup"
}
```

#### **Documento: `admin`**
```javascript
{
  "adminUsers": [],                // Lista de UIDs de administradores
  "adminPermissions": {
    "userManagement": true,         // Gerenciar usuários
    "balanceManagement": true,      // Gerenciar saldos
    "systemSettings": true,         // Alterar configurações
    "notifications": true,          // Gerenciar notificações
    "reports": true                // Ver relatórios
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "system-setup"
}
```

### **2. Coleção: `users`**

#### **Documento: `[firebase_uid]`**
```javascript
{
  // === DADOS BÁSICOS ===
  "numericId": 100001,             // ID sequencial único
  "fullName": "João Silva",        // Nome completo
  "email": "joao@email.com",       // Email
  "cpf": "12345678901",            // CPF
  "balance": 0.00,                 // Saldo atual
  "role": "player",                // Role (player/promoter/admin)
  "status": "active",              // Status (active/inactive/banned)
  
  // === DADOS DE REGISTRO ===
  "registrationDate": "2024-01-01T00:00:00.000Z",
  "lastLoginDate": "2024-01-01T00:00:00.000Z",
  "firebaseUid": "abc123...",      // Referência ao Firebase Auth
  
  // === DADOS DE JOGO ===
  "totalGamesPlayed": 0,           // Total de jogos jogados
  "totalBetsPlaced": 0,            // Total de apostas feitas
  "totalWinnings": 0.00,           // Total de ganhos
  "totalLosses": 0.00,             // Total de perdas
  "highestWin": 0.00,              // Maior ganho
  "highestMultiplier": 0.00,       // Maior multiplicador
  
  // === DADOS DE TRANSAÇÕES ===
  "totalRecharges": 0,             // Total de recargas
  "totalWithdrawals": 0,           // Total de saques
  "totalRechargeAmount": 0.00,     // Valor total recarregado
  "totalWithdrawalAmount": 0.00,   // Valor total sacado
  
  // === DADOS DE NOTIFICAÇÕES ===
  "notifications": {
    "rechargeNotifications": true,  // Notificações de recarga
    "withdrawalNotifications": true, // Notificações de saque
    "gameNotifications": true,      // Notificações de jogo
    "emailNotifications": false,    // Notificações por email
    "pushNotifications": false      // Notificações push
  },
  
  // === DADOS DE SEGURANÇA ===
  "accountVerified": false,        // Conta verificada
  "emailVerified": false,          // Email verificado
  "lastPasswordChange": "2024-01-01T00:00:00.000Z",
  
  // === DADOS DE ATIVIDADE ===
  "isOnline": true,                // Se está online
  "lastActivity": "2024-01-01T00:00:00.000Z",
  "loginCount": 1,                 // Número de logins
  
  // === DADOS DE PREFERÊNCIAS ===
  "language": "pt-BR",             // Idioma
  "timezone": "America/Sao_Paulo", // Fuso horário
  "theme": "dark",                 // Tema (dark/light)
  
  // === DADOS DE SISTEMA ===
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "user-registration"
}
```

## 🚀 **Como Implementar**

### **1. Limpar e Recriar**
Acesse: `http://localhost:3000/clean-firestore.html`
1. Clique em **"🔍 Verificar Dados Atuais"**
2. Clique em **"🗑️ APAGAR TUDO"**
3. Clique em **"🏗️ Criar Nova Estrutura"**
4. Clique em **"✅ Verificar Nova Estrutura"**

### **2. Usar Novo Sistema**
Substitua no `index.html`:
```html
<!-- Antes -->
<script src="js/auth-firebase-complete.js"></script>

<!-- Depois -->
<script src="js/auth-complete-new.js"></script>
```

## 📊 **Campos por Funcionalidade**

### **Cadastro:**
- ✅ Nome completo
- ✅ Email
- ✅ CPF
- ✅ Senha
- ✅ Saldo inicial (0,00)
- ✅ ID sequencial (100001+)
- ✅ Data de registro
- ✅ Status ativo

### **Lobby:**
- ✅ Exibir ID do usuário
- ✅ Exibir saldo atual
- ✅ Exibir nome do usuário
- ✅ Status online/offline
- ✅ Última atividade

### **Jogo:**
- ✅ Dados do usuário
- ✅ Saldo em tempo real
- ✅ Histórico de apostas
- ✅ Estatísticas de jogo
- ✅ Notificações

### **Sistema Admin (Futuro):**
- ✅ Gerenciamento de usuários
- ✅ Controle de saldos
- ✅ Relatórios de transações
- ✅ Configurações do sistema
- ✅ Notificações administrativas

## 🎯 **Benefícios da Nova Estrutura**

### **1. Organização:**
- ✅ Campos organizados por categoria
- ✅ Fácil manutenção
- ✅ Escalabilidade

### **2. Funcionalidades:**
- ✅ Sistema de notificações
- ✅ Estatísticas completas
- ✅ Controle de segurança
- ✅ Preferências do usuário

### **3. Admin:**
- ✅ Base sólida para sistema admin
- ✅ Relatórios detalhados
- ✅ Controle total do sistema

## 🔧 **Próximos Passos**

1. **Limpar Firestore**: Use a página de limpeza
2. **Testar Cadastro**: Crie uma nova conta
3. **Verificar Dados**: Confirme se todos os campos foram criados
4. **Testar Jogo**: Verifique se os dados aparecem corretamente
5. **Desenvolver Admin**: Use a estrutura como base

## 📝 **Logs Esperados**

### **Cadastro Bem-sucedido:**
```
1. Criando usuário no Firebase Auth...
✅ Usuário criado: [uid]
2. Obtendo próximo ID numérico...
3. Atualizando contador...
4. Obtendo saldo inicial...
5. Salvando dados completos no Firestore...
✅ Dados salvos no Firestore
6. Login automático...
7. Salvando dados no localStorage...
✅ Dados salvos no localStorage: {...}
```

### **Login Bem-sucedido:**
```
1. Login no Firebase Auth...
✅ Login realizado: [uid]
2. Obtendo token...
✅ Token obtido
3. Buscando dados no Firestore...
✅ Dados do Firestore: {...}
4. Dados salvos no localStorage: {...}
5. Redirecionando para o jogo...
```

**Agora você tem uma estrutura completa e organizada para o sistema!** 🚀 