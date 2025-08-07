// config/app.config.js - Configurações centralizadas do aplicativo

const config = {
  // Configurações do servidor
  server: {
    port: 3000,
    backendPort: 3001,
    host: 'localhost'
  },

  // Configurações do jogo
  game: {
    waitTimeMs: 9000,
    timeAfterCrashMs: 5000,
    gameLoopIntervalMs: 75,
    baseRate: 0.0875,
    accelerationPerOneX: 0.68,
    maxGlobalHistoryItems: 15
  },

  // Configurações do Firebase
  firebase: {
    apiKey: "AIzaSyDv1pYOabEzKjw7xFaaB2FYUa_SO9ATcfA",
    authDomain: "ship-crash-web.firebaseapp.com",
    projectId: "ship-crash-web",
    storageBucket: "ship-crash-web.firebasestorage.app",
    messagingSenderId: "599520985723",
    appId: "1:599520985723:web:4748e98190d1cac69098de",
    measurementId: "G-Y1D4QTEJVQ"
  },

  // Configurações de validação
  validation: {
    minPasswordLength: 6,
    minWithdrawalAmount: 10,
    maxBetAmount: 10000
  },

  // Configurações de UI
  ui: {
    theme: {
      primaryColor: '#8a8aff',
      secondaryColor: '#2a2a4a',
      backgroundColor: '#1a1a2e',
      textColor: '#e0e0e0'
    }
  }
};

module.exports = config; 