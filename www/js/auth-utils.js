// auth-utils.js - Utilitários para gerenciamento de autenticação

const AUTH_KEYS = {
  TOKEN: 'crashGameAuthToken',
  USER_ID: 'crashGameUserId',
  BALANCE: 'crashGamePlayerBalance',
  LOGGED_IN_USER: 'crashGameLoggedInUser'
};

class AuthManager {
  constructor() {
    this.isInitialized = false;
  }

  // Verificar se o usuário está logado
  isLoggedIn() {
    const token = localStorage.getItem(AUTH_KEYS.TOKEN);
    const userId = localStorage.getItem(AUTH_KEYS.USER_ID);
    return !!(token && userId);
  }

  // Obter dados do usuário logado
  getCurrentUser() {
    if (!this.isLoggedIn()) {
      return null;
    }

    const userId = localStorage.getItem(AUTH_KEYS.USER_ID);
    const balance = parseFloat(localStorage.getItem(AUTH_KEYS.BALANCE)) || 0;
    const loggedInUserStr = localStorage.getItem(AUTH_KEYS.LOGGED_IN_USER);

    let fullName = userId;
    let role = 'player';
    if (loggedInUserStr) {
      try {
        const loggedInUser = JSON.parse(loggedInUserStr);
        fullName = loggedInUser.fullName || userId;
        role = loggedInUser.role || 'player';
      } catch (e) {
        console.error('Erro ao parsear dados do usuário:', e);
      }
    }

    return {
      userId: userId,
      fullName: fullName,
      balance: balance,
      role: role
    };
  }

  // Salvar dados de autenticação
  saveAuthData(token, userId, fullName, balance = 0, role = 'player') {
    localStorage.setItem(AUTH_KEYS.TOKEN, token);
    localStorage.setItem(AUTH_KEYS.USER_ID, userId.toString());
    localStorage.setItem(AUTH_KEYS.BALANCE, balance.toString());
    localStorage.setItem(AUTH_KEYS.LOGGED_IN_USER, JSON.stringify({
      userId: userId,
      fullName: fullName,
      role: role
    }));

    console.log('Dados de autenticação salvos:', { userId, fullName, balance, role });
  }

  // Limpar dados de autenticação
  clearAuthData() {
    Object.values(AUTH_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('Dados de autenticação limpos');
  }

  // Atualizar saldo do usuário
  updateBalance(newBalance) {
    localStorage.setItem(AUTH_KEYS.BALANCE, newBalance.toString());
    console.log('Saldo atualizado:', newBalance);
  }

  // Verificar e redirecionar se necessário
  checkAuthAndRedirect() {
    const currentPath = window.location.pathname;
    const isIndexPage = currentPath.includes('index.html');
    const isLoggedIn = this.isLoggedIn();

    console.log('Verificação de auth:', { 
      currentPath, 
      isIndexPage, 
      isLoggedIn 
    });

    // Se não está logado e não está na página index, redirecionar para index
    if (!isLoggedIn && !isIndexPage) {
      console.log('Usuário não logado, redirecionando para index.html');
      window.location.replace('index.html');
      return false;
    }

    return true;
  }

  // Inicializar verificação de autenticação
  init() {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    // Não fazer redirecionamento automático aqui
    console.log('AuthManager inicializado');
  }
}

// Instância global
const authManager = new AuthManager();

// Inicializar automaticamente
document.addEventListener('DOMContentLoaded', () => {
    authManager.init();
});

// Exportar para uso global
window.authManager = authManager; 