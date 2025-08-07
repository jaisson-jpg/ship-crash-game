# 🚢 Cadastro com Firestore - Ship Crash

## 📋 **Fluxo de Cadastro Completo**

### 🔄 **Processo Detalhado:**
```
1. Validação → 2. Firebase Auth → 3. Firestore → 4. Login Automático → 5. Lobby
```

## 🎯 **Etapas do Cadastro**

### **1. Validação dos Dados**
- ✅ Verifica se todos os campos estão preenchidos
- ✅ Valida CPF (11 dígitos)
- ✅ Valida senha (mínimo 6 caracteres)
- ✅ Confirma se as senhas coincidem

### **2. Criação no Firebase Auth**
- ✅ Cria conta de autenticação no Firebase
- ✅ Gera UID único para o usuário
- ✅ Estabelece credenciais de login

### **3. Configuração do Sistema**
- ✅ Busca saldo inicial das configurações do sistema
- ✅ Obtém próximo ID sequencial do contador
- ✅ Incrementa contador para próximo usuário

### **4. Salvamento no Firestore**
- ✅ Cria documento na coleção `users`
- ✅ Salva todos os dados do usuário
- ✅ Inclui referência ao Firebase Auth UID

### **5. Login Automático**
- ✅ Faz login com as credenciais criadas
- ✅ Busca dados do Firestore
- ✅ Salva dados no AuthManager
- ✅ Redireciona para o lobby

## 📊 **Estrutura dos Dados no Firestore**

### **Coleção: `users`**
```javascript
{
  "numericId": 100001,           // ID sequencial
  "fullName": "João Silva",      // Nome completo
  "email": "joao@email.com",     // Email
  "cpf": "12345678901",          // CPF
  "balance": 0.00,               // Saldo inicial
  "role": "player",              // Role (player/promoter/admin)
  "status": "active",            // Status da conta
  "registrationDate": "2024-01-01T00:00:00.000Z", // Data de registro
  "firebaseUid": "abc123..."     // Referência ao Firebase Auth
}
```

### **Coleção: `systemSettings`**
```javascript
// Documento: userCounter
{
  "nextUserId": 100002,          // Próximo ID sequencial
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}

// Documento: main
{
  "initialBalance": 0.00,        // Saldo inicial para novos usuários
  "otherSettings": "..."
}
```

## 🔧 **Lógica Implementada**

### **1. Contador Sequencial**
```javascript
// Verificar se existe contador
const counterDoc = await db.collection('systemSettings').doc('userCounter').get();

if (counterDoc.exists) {
    nextUserId = counterDoc.data().nextUserId || 100001;
} else {
    // Criar contador inicial
    await db.collection('systemSettings').doc('userCounter').set({
        nextUserId: 100001,
        createdAt: new Date().toISOString()
    });
}

// Incrementar contador
await db.collection('systemSettings').doc('userCounter').update({
    nextUserId: nextUserId + 1,
    updatedAt: new Date().toISOString()
});
```

### **2. Saldo Inicial Dinâmico**
```javascript
// Buscar saldo inicial das configurações
const settingsDoc = await db.collection('systemSettings').doc('main').get();
if (settingsDoc.exists) {
    initialBalance = settingsDoc.data().initialBalance || 0.00;
}
```

### **3. Dados Completos do Usuário**
```javascript
const userData = {
    numericId: nextUserId,        // ID sequencial
    fullName: name,               // Nome completo
    email: email,                 // Email
    cpf: cpf,                    // CPF
    balance: initialBalance,      // Saldo inicial
    role: 'player',              // Role padrão
    status: 'active',            // Status ativo
    registrationDate: new Date().toISOString(),
    firebaseUid: cred.user.uid   // Referência ao Firebase Auth
};
```

## 🛡️ **Proteções e Validações**

### **1. Validações de Entrada**
- ✅ Campos obrigatórios preenchidos
- ✅ CPF com 11 dígitos
- ✅ Senha com mínimo 6 caracteres
- ✅ Confirmação de senha

### **2. Tratamento de Erros**
- ✅ Erro de email já existente
- ✅ Erro de conexão com Firestore
- ✅ Erro de permissões
- ✅ Fallback para login manual

### **3. Segurança**
- ✅ Dados validados antes do salvamento
- ✅ Referência cruzada entre Firebase Auth e Firestore
- ✅ Contador protegido contra duplicação

## 🎮 **Comportamento Esperado**

### **Cenário 1: Cadastro Bem-sucedido**
1. Usuário preenche formulário
2. Sistema valida dados
3. Cria conta no Firebase Auth
4. Salva dados no Firestore
5. Faz login automático
6. Redireciona para lobby
7. Pode jogar imediatamente

### **Cenário 2: Erro no Cadastro**
1. Sistema mostra erro específico
2. Usuário pode tentar novamente
3. Dados não são salvos
4. Não há redirecionamento

### **Cenário 3: Admin**
1. Admin faz cadastro
2. Sistema detecta role 'admin'
3. Redireciona para painel admin

## 📝 **Vantagens do Sistema**

1. **Dados Centralizados** - Tudo no Firestore
2. **IDs Sequenciais** - Fácil identificação
3. **Configuração Dinâmica** - Saldo inicial configurável
4. **Login Automático** - Experiência fluida
5. **Segurança** - Validações e proteções
6. **Rastreabilidade** - Histórico completo

## 🧪 **Como Testar**

### **Teste Cadastro Completo:**
1. Acesse `index.html`
2. Clique em "Criar Conta"
3. Preencha todos os campos
4. Clique em "CRIAR UMA CONTA"
5. Verifique no console os logs
6. Confirme redirecionamento para lobby

### **Verificar no Firestore:**
1. Abra Firebase Console
2. Vá para Firestore Database
3. Verifique coleção `users`
4. Confirme dados salvos corretamente
5. Verifique contador em `systemSettings/userCounter`

O sistema agora está completamente integrado com Firestore! 🚢✨ 