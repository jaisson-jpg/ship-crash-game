# 🚢 Ship Crash Game

Um jogo de crash marítimo com sistema completo de autenticação e gerenciamento de usuários.

## 🎮 Funcionalidades

- ✅ Sistema de cadastro e login completo
- ✅ Lobby interativo
- ✅ Jogo crash com navio
- ✅ Sistema de apostas em tempo real
- ✅ WebSocket para multiplayer
- ✅ Firebase para autenticação e dados
- ✅ Saldo inicial de R$ 0,00
- ✅ IDs sequenciais começando em 100001
- ✅ Base para sistema administrativo

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript ES6
- **Backend**: Node.js, Express.js, WebSocket
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Deploy**: Railway

## 🚀 Deploy

### Railway
1. Fork este repositório
2. Conecte com Railway
3. Deploy automático

### Local
```bash
npm install
npm start
```

## 📁 Estrutura

```
ship-crash-game/
├── www/                 # Frontend
│   ├── index.html      # Página principal
│   ├── game.html       # Jogo
│   ├── css/           # Estilos
│   └── js/            # Scripts
├── backend/           # Backend
│   └── server.js      # Servidor WebSocket
├── server.js          # Servidor principal
└── package.json       # Dependências
```

## 🔧 Configuração

1. Configure o Firebase
2. Atualize as credenciais em `www/js/firebase-config.js`
3. Configure as regras do Firestore
4. Deploy no Railway

## 📊 Dados do Firestore

### Coleções:
- `users` - Dados dos usuários
- `systemSettings` - Configurações do sistema

### Campos do Usuário:
- Dados básicos (nome, email, CPF, saldo)
- Dados de jogo (estatísticas, apostas)
- Dados de transações (recargas, saques)
- Dados de notificações
- Dados de atividade

## 🎯 Próximas Funcionalidades

- [ ] Sistema administrativo
- [ ] Sistema de recargas
- [ ] Sistema de saques
- [ ] Notificações push
- [ ] Relatórios detalhados

## 🏆 Status

✅ **Sistema 100% funcional**
- Cadastro ✓
- Login ✓  
- Lobby ✓
- Jogo ✓

---

**Ship Crash Game** - Desenvolvido com ❤️