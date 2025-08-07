# 🔥 Solução: Erro "Erro ao carregar documentos" no Firestore

## 📋 Problema Identificado

O Firebase Firestore está mostrando **"Erro ao carregar documentos"** na coleção `systemSettings`, o que está impedindo o carregamento dos dados do usuário no jogo.

## 🔍 Causas do Problema

1. **Regras do Firestore muito restritivas**
2. **Problema de autenticação**
3. **Estrutura de dados incorreta**
4. **Timeout na conexão**

## ✅ Solução Imediata

### 1. Aplicar Regras Permissivas (Para Teste)

**IMPORTANTE**: Use apenas para teste e desenvolvimento!

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá para **Firestore Database**
4. Clique na aba **Rules**
5. Substitua as regras por:

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

6. Clique em **Publish**

### 2. Verificar Estrutura de Dados

Certifique-se de que existem os documentos necessários:

#### Coleção: `systemSettings`
- **Documento: `main`**
  ```javascript
  {
    "initialBalance": 1000.00,
    "systemStatus": "online",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
  ```

- **Documento: `userCounter`**
  ```javascript
  {
    "nextUserId": 100001,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
  ```

#### Coleção: `users`
- **Documento: `[firebase_uid]`**
  ```javascript
  {
    "numericId": 100001,
    "fullName": "Nome do Usuário",
    "email": "email@exemplo.com",
    "cpf": "12345678901",
    "balance": 1000.00,
    "role": "player",
    "status": "active",
    "registrationDate": "2024-01-01T00:00:00.000Z",
    "firebaseUid": "[firebase_uid]"
  }
  ```

### 3. Criar Documentos Manualmente (Se Necessário)

Se os documentos não existem, crie-os manualmente no Console do Firebase:

1. Vá para **Firestore Database**
2. Clique em **"Iniciar coleção"** (se não existir)
3. Nome da coleção: `systemSettings`
4. ID do documento: `main`
5. Adicione os campos:
   - `initialBalance` (number): 1000.00
   - `systemStatus` (string): "online"
   - `updatedAt` (timestamp): data atual

6. Repita para o documento `userCounter`:
   - `nextUserId` (number): 100001
   - `createdAt` (timestamp): data atual
   - `updatedAt` (timestamp): data atual

## 🧪 Como Testar

### 1. Teste de Permissões

Acesse: `http://localhost:3000/test-firestore-permissions.html`

1. **Clique em "Verificar Configuração"**
2. **Faça login**
3. **Clique em "Testar Leitura"**
4. **Clique em "Testar Escrita"**

### 2. Verificar no Console

No console do navegador, digite:

```javascript
// Verificar se o Firebase está carregado
typeof firebase

// Verificar se o usuário está logado
firebase.auth().currentUser

// Testar leitura do Firestore
firebase.firestore().collection('systemSettings').doc('main').get()
  .then(doc => console.log('Documento existe:', doc.exists))
  .catch(error => console.error('Erro:', error))
```

### 3. Verificar Estrutura

No Console do Firebase:
1. Vá para **Firestore Database**
2. Verifique se as coleções `users` e `systemSettings` existem
3. Verifique se os documentos têm a estrutura correta

## 📝 Logs Esperados

### Cenário de Sucesso:
```
INDEX: Carregando dados do lobby...
INDEX: Usuário logado: [uid]
INDEX: Buscando dados no Firestore...
INDEX: Documento encontrado: true
INDEX: Dados do usuário carregados: {numericId: 100001, fullName: "Nome", balance: 1000, ...}
INDEX: UI atualizada - USER ID
INDEX: UI atualizada - SALDO
```

### Cenário de Problema:
```
INDEX: Carregando dados do lobby...
INDEX: Erro ao buscar dados do usuário: [erro]
INDEX: Tentando buscar com dados do localStorage...
```

## 🔧 Passos para Resolver

### 1. Aplicar Regras Permissivas
1. Acesse o Console do Firebase
2. Vá para Firestore Database > Rules
3. Aplique as regras permissivas
4. Clique em Publish

### 2. Verificar Estrutura de Dados
1. Verifique se as coleções existem
2. Verifique se os documentos têm a estrutura correta
3. Crie documentos manualmente se necessário

### 3. Testar Aplicação
1. Faça logout e login novamente
2. Verifique se os dados aparecem no lobby
3. Teste entrar no jogo

### 4. Verificar Console
1. Abra o console do navegador (F12)
2. Procure por erros relacionados ao Firestore
3. Verifique os logs de debug

## 🚨 Problemas Comuns

### 1. Regras muito restritivas
**Solução**: Aplique as regras permissivas temporariamente

### 2. Documentos não existem
**Solução**: Crie os documentos manualmente no Console

### 3. Problema de autenticação
**Solução**: Faça logout e login novamente

### 4. Timeout na conexão
**Solução**: Verifique a conexão com a internet

## 📁 Arquivos Relacionados

1. **`www/firestore-rules-permissive.txt`**: Regras permissivas para teste
2. **`www/test-firestore-permissions.html`**: Página de teste de permissões
3. **`www/js/script-firebase.js`**: Script do jogo com logs melhorados

## ✅ Próximos Passos

1. **Aplique as regras permissivas** no Console do Firebase
2. **Verifique a estrutura de dados** no Firestore
3. **Teste a aplicação** fazendo login/logout
4. **Verifique os logs** no console do navegador
5. **Confirme se os dados aparecem** no lobby e no jogo

## 🎯 Resultado Esperado

Após aplicar as correções:
- ✅ Firestore carrega documentos sem erro
- ✅ Dados do usuário aparecem no lobby
- ✅ Dados do usuário aparecem no jogo
- ✅ Sistema funciona completamente

**Aplique as regras permissivas primeiro e teste novamente!** 🔥 