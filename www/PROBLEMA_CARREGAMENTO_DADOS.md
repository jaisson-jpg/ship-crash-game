# 🔍 Problema: Carregamento de Dados do Usuário

## 📋 Problema Identificado

O login está funcionando, mas as informações do usuário (ID, nome, saldo) não estão sendo carregadas no lobby. Isso pode ocorrer por:

1. **Dados não salvos no Firestore**: O usuário foi criado no Firebase Auth, mas os dados não foram salvos no Firestore
2. **Problema na consulta**: A consulta ao Firestore está falhando
3. **Estrutura de dados incorreta**: Os dados estão salvos com estrutura diferente
4. **Timing de carregamento**: Os dados são carregados antes do Firebase estar pronto

## 🔧 Solução Implementada

### 1. Logs Detalhados

Adicionamos logs detalhados na função `loadLobbyDataAndUI()` para identificar onde está o problema:

```javascript
function loadLobbyDataAndUI() {
    console.log("INDEX: Carregando dados do lobby...");
    
    // Verificar se o usuário está logado no Firebase
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        console.error("INDEX: Nenhum usuário logado encontrado");
        return;
    }
    
    console.log("INDEX: Usuário logado:", currentUser.uid);
    console.log("INDEX: Email do usuário:", currentUser.email);
    
    // Buscar dados do usuário no Firestore
    console.log("INDEX: Buscando dados no Firestore...");
    firebase.firestore().collection('users').doc(currentUser.uid).get()
        .then((doc) => {
            console.log("INDEX: Documento encontrado:", doc.exists);
            
            if (doc.exists) {
                const userData = doc.data();
                console.log("INDEX: Dados do usuário carregados:", userData);
                
                // ... resto da função
            } else {
                console.error("INDEX: Dados do usuário não encontrados no Firestore!");
                // Fallback para localStorage
            }
        })
        .catch((error) => {
            console.error("INDEX: Erro ao buscar dados do usuário:", error);
            // Fallback para localStorage
        });
}
```

### 2. Fallback para localStorage

Se os dados não forem encontrados no Firestore, tentamos usar os dados do localStorage:

```javascript
// Fallback: usar dados do localStorage
const loggedInUserStr = localStorage.getItem('crashGameLoggedInUser');
if (loggedInUserStr) {
    try {
        const userData = JSON.parse(loggedInUserStr);
        console.log("INDEX: Dados do localStorage:", userData);
        
        currentUserId = userData.userId || currentUser.uid;
        currentPlayerBalance = userData.balance || 0;
        
        if (userIdDisplayLobby) {
            userIdDisplayLobby.textContent = `USER ID: ${currentUserId}`;
        }
        if (saldoDisplayLobby) {
            saldoDisplayLobby.textContent = currentPlayerBalance.toFixed(2);
        }
    } catch (error) {
        console.error("INDEX: Erro ao parsear dados do localStorage:", error);
    }
}
```

## 🧪 Como Testar

### 1. Página de Teste Principal

Acesse: `http://localhost:3000/test-firestore.html`

Esta página permite:
- Verificar se o usuário está logado
- Buscar dados no Firestore
- Verificar localStorage
- Testar login

### 2. Console do Navegador

Abra o console (F12) e verifique os logs:

```
INDEX: Carregando dados do lobby...
INDEX: Usuário logado: [uid]
INDEX: Email do usuário: [email]
INDEX: Buscando dados no Firestore...
INDEX: Documento encontrado: true/false
```

### 3. Verificações Específicas

#### Se o documento não for encontrado:
- O usuário pode não ter sido registrado corretamente
- Verifique se o registro foi concluído com sucesso
- Teste criar um novo usuário

#### Se o documento for encontrado mas os campos estiverem vazios:
- Verifique a estrutura dos dados no Firestore
- Confirme se os campos estão sendo salvos corretamente

#### Se houver erro na consulta:
- Verifique a conexão com a internet
- Confirme se o Firebase está configurado corretamente

## 📁 Arquivos Modificados

1. **`www/index.html`**:
   - Adicionados logs detalhados em `loadLobbyDataAndUI()`
   - Implementado fallback para localStorage
   - Melhorado tratamento de erros

2. **`www/test-firestore.html`** (novo):
   - Página de teste completa para verificar dados
   - Verificação de usuário atual
   - Busca de dados no Firestore
   - Verificação de localStorage

## 🔍 Possíveis Causas

### 1. Registro Incompleto
Se o usuário foi criado no Firebase Auth mas os dados não foram salvos no Firestore, pode ser um problema no processo de registro.

### 2. Estrutura de Dados
Os dados podem estar sendo salvos com estrutura diferente da esperada.

### 3. Permissões do Firestore
Pode haver problemas de permissão para ler os dados.

### 4. Timing
O Firebase pode não estar completamente carregado quando a consulta é feita.

## ✅ Próximos Passos

1. **Teste a página**: `http://localhost:3000/test-firestore.html`
2. **Verifique os logs**: Abra o console e recarregue a página
3. **Identifique o problema**: Com base nos logs, identifique onde está falhando
4. **Corrija o problema**: Implemente a correção específica

## 📝 Logs Esperados

### Cenário de Sucesso:
```
INDEX: Carregando dados do lobby...
INDEX: Usuário logado: [uid]
INDEX: Email do usuário: [email]
INDEX: Buscando dados no Firestore...
INDEX: Documento encontrado: true
INDEX: Dados do usuário carregados: {numericId: 1, fullName: "Nome", balance: 1000, ...}
INDEX: ID do usuário: 1
INDEX: Saldo do usuário: 1000
INDEX: UI atualizada - USER ID
INDEX: UI atualizada - SALDO
```

### Cenário de Falha:
```
INDEX: Carregando dados do lobby...
INDEX: Usuário logado: [uid]
INDEX: Email do usuário: [email]
INDEX: Buscando dados no Firestore...
INDEX: Documento encontrado: false
INDEX: Dados do usuário não encontrados no Firestore!
INDEX: Tentando buscar com dados do localStorage...
```

Use a página de teste para identificar exatamente onde está o problema! 🔍 