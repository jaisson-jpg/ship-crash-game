# 🚢 Painel Administrativo - Ship Crash

## 📋 Visão Geral

O painel administrativo do Ship Crash é uma interface completa para gerenciar todos os aspectos do sistema, integrado totalmente com o Firebase.

## 🎯 Funcionalidades Principais

### 📊 Dashboard
- **Estatísticas em tempo real**: Total de usuários, usuários ativos, saldo total do sistema, número de promotores
- **Interface responsiva**: Funciona perfeitamente em desktop e mobile
- **Design moderno**: Interface intuitiva com tema pirata/marítimo

### 👥 Gerenciamento de Usuários
- **Lista completa**: Visualizar todos os usuários do sistema
- **Busca avançada**: Buscar por ID, nome ou email
- **Ações rápidas**: 
  - Editar usuário
  - Adicionar saldo
  - Tornar promotor
  - Ativar/Desativar usuário

### 💰 Controle Financeiro
- **Adicionar saldo**: Adicionar saldo para qualquer usuário
- **Registro de transações**: Todas as operações são registradas no Firebase
- **Histórico completo**: Rastreamento de todas as movimentações

### 🛡️ Sistema de Promotores
- **Criar promotores**: Transformar usuários em promotores
- **Controle de acesso**: Promotores têm acesso ao sistema de vendas
- **Dados específicos**: Informações específicas para promotores

### ⚙️ Configurações do Sistema
- **Saldo inicial**: Definir saldo inicial para novos usuários
- **Status do sistema**: Controlar se o sistema está online, em manutenção ou offline
- **Configurações globais**: Ajustes que afetam todo o sistema

## 🚀 Como Configurar

### 1. Criar o Primeiro Administrador

1. Acesse: `http://localhost:3000/create-admin.html`
2. Preencha os dados do administrador:
   - Nome completo
   - Email
   - CPF (somente números)
   - Senha (mínimo 6 caracteres)
3. Clique em "Criar Administrador"
4. **IMPORTANTE**: Após criar o admin, delete o arquivo `create-admin.html` por segurança

### 2. Acessar o Painel Admin

1. Faça login com as credenciais do administrador
2. No lobby, clique no botão "⚙️ Painel Admin"
3. Ou acesse diretamente: `http://localhost:3000/admin.html`

## 🔐 Segurança

### Controle de Acesso
- Apenas usuários com role `admin` podem acessar o painel
- Verificação automática de autenticação
- Redirecionamento automático para login se não autenticado

### Registro de Atividades
- Todas as ações são registradas no Firebase
- Histórico completo de transações
- Rastreamento de quem fez cada alteração

## 📱 Interface

### Design Responsivo
- Funciona em desktop, tablet e mobile
- Interface adaptativa
- Sem scrollbars (conforme diretrizes do projeto)

### Tema Visual
- Cores: Azul escuro, dourado, branco
- Tema: Pirata/Marítimo
- Animações suaves
- Feedback visual para todas as ações

## 🔧 Funcionalidades Técnicas

### Integração Firebase
- **Authentication**: Login seguro
- **Firestore**: Banco de dados em tempo real
- **Collections**: users, transactions, systemSettings

### Estrutura de Dados

#### Usuários
```javascript
{
  numericId: "123456",
  fullName: "Nome Completo",
  email: "email@exemplo.com",
  cpf: "12345678901",
  balance: 100.00,
  role: "player|promoter|admin",
  status: "active|inactive",
  registrationDate: "2024-01-01T00:00:00.000Z"
}
```

#### Transações
```javascript
{
  userId: "user_uid",
  type: "admin_add|game_bet|game_win",
  amount: 100.00,
  details: {
    reason: "Bônus",
    adminId: "admin_uid",
    previousBalance: 0.00
  },
  timestamp: "2024-01-01T00:00:00.000Z",
  adminId: "admin_uid"
}
```

#### Configurações do Sistema
```javascript
{
  initialBalance: 0.00,
  systemStatus: "online|maintenance|offline",
  updatedAt: "2024-01-01T00:00:00.000Z",
  updatedBy: "admin_uid"
}
```

## 🎮 Como Usar

### Gerenciar Usuários
1. **Visualizar**: Todos os usuários aparecem na tabela
2. **Buscar**: Use a barra de busca para encontrar usuários específicos
3. **Adicionar Saldo**: 
   - Digite o ID do usuário
   - Insira o valor
   - Adicione um motivo
   - Clique em "Adicionar Saldo"
4. **Tornar Promotor**: Clique em "Promotor" na linha do usuário
5. **Ativar/Desativar**: Clique no botão correspondente

### Configurar Sistema
1. **Saldo Inicial**: Defina quanto novos usuários recebem
2. **Status**: Controle se o sistema está online
3. **Salvar**: Clique em "Atualizar Configurações"

### Criar Promotores
1. Digite o ID do usuário
2. Insira o nome do promotor
3. Insira o email
4. Clique em "Criar Promotor"

## 🔄 Atualizações Automáticas

- **Estatísticas**: Atualizam automaticamente
- **Lista de usuários**: Recarrega após cada ação
- **Firebase**: Sincronização em tempo real

## 🛠️ Manutenção

### Backup
- Todos os dados estão no Firebase
- Backup automático do Google
- Exportação manual disponível

### Logs
- Console do navegador mostra todas as ações
- Firebase Console para logs detalhados
- Transações registradas automaticamente

## 🚨 Troubleshooting

### Problemas Comuns

1. **Não consegue acessar o painel**
   - Verifique se está logado como admin
   - Confirme se o role é 'admin'

2. **Usuário não encontrado**
   - Verifique se o ID está correto
   - Use a busca para encontrar o usuário

3. **Erro ao adicionar saldo**
   - Verifique se o valor é válido
   - Confirme se o usuário existe

4. **Firebase não conecta**
   - Verifique a configuração do Firebase
   - Confirme as regras de segurança

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o painel administrativo, consulte a documentação do Firebase ou entre em contato com o desenvolvedor.

---

**⚠️ IMPORTANTE**: Após criar o primeiro administrador, delete o arquivo `create-admin.html` por segurança! 