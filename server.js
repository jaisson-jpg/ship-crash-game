// server.js - Servidor integrado para Railway (Frontend + Backend + WebSocket)
const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Ship Crash Game - Servidor Integrado');
console.log(`📍 Porta: ${PORT}`);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'www')));

// Headers CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Ship Crash Game',
    websocket: 'Active'
  });
});

// Servir frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// Criar servidor HTTP
const server = http.createServer(app);

// --- CONFIGURAÇÃO DO WEBSOCKET ---
const wss = new WebSocket.Server({ server });

// Estado do jogo
let gameState = 'WAITING_TO_START';
let currentMultiplier = 1.00;
let crashPoint = 0;
let gameHistory = [];
let currentRound = 1;
let activeBets = {};

const WAIT_TIME = 9000; // 9 segundos
const CRASH_TIME = 5000; // 5 segundos após crash
const GAME_INTERVAL = 75; // 75ms

console.log('🎮 WebSocket configurado');

// Função para gerar ponto de crash
function generateCrashPoint() {
  const random = Math.random();
  if (random < 0.33) return 1.00 + Math.random() * 0.99; // 1.00-1.99
  if (random < 0.66) return 2.00 + Math.random() * 2.00; // 2.00-4.00
  return 5.00 + Math.random() * 15.00; // 5.00-20.00
}

// Função para calcular multiplicador (mais agressiva)
function calculateMultiplier(elapsedTime) {
  const seconds = elapsedTime / 1000;
  return 1.00 + Math.pow(seconds * 0.1, 1.1);
}

// Broadcast para todos os clientes
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Iniciar novo jogo
function startNewGame() {
  console.log(`🎮 Iniciando jogo ${currentRound}`);
  
  gameState = 'RUNNING';
  currentMultiplier = 1.00;
  crashPoint = generateCrashPoint();
  activeBets = {};
  
  const startTime = Date.now();
  
  broadcast({
    type: 'game_started',
    round: currentRound,
    timestamp: startTime
  });
  
  const gameInterval = setInterval(() => {
    try {
      const elapsedTime = Date.now() - startTime;
      currentMultiplier = calculateMultiplier(elapsedTime);
      
      // Verificar se deve crashar
      if (currentMultiplier >= crashPoint) {
        clearInterval(gameInterval);
        
        // Crash!
        gameState = 'CRASHED';
        const crashData = {
          round: currentRound,
          crashPoint: crashPoint,
          timestamp: Date.now()
        };
        
        gameHistory.unshift(crashData);
        
        // Manter apenas últimos 10 jogos
        if (gameHistory.length > 10) {
          gameHistory = gameHistory.slice(0, 10);
        }
        
        broadcast({
          type: 'game_crashed',
          crashPoint: crashPoint,
          round: currentRound,
          history: gameHistory
        });
        
        console.log(`💥 Jogo ${currentRound} crashou em ${crashPoint.toFixed(2)}x`);
        
        // Aguardar antes do próximo jogo
        setTimeout(() => {
          currentRound++;
          startWaitingPeriod();
        }, CRASH_TIME);
        
      } else {
        // Enviar atualização de multiplicador
        broadcast({
          type: 'multiplier_update',
          multiplier: parseFloat(currentMultiplier.toFixed(4)),
          round: currentRound,
          state: 'RUNNING'
        });
      }
    } catch (error) {
      console.error('❌ Erro no loop do jogo:', error);
      clearInterval(gameInterval);
      // Reiniciar jogo em caso de erro
      setTimeout(() => {
        currentRound++;
        startWaitingPeriod();
      }, 3000);
    }
  }, GAME_INTERVAL);
}

// Período de espera
function startWaitingPeriod() {
  console.log(`⏳ Aguardando ${WAIT_TIME/1000}s para jogo ${currentRound}`);
  
  gameState = 'WAITING_TO_START';
  
  broadcast({
    type: 'waiting_period',
    duration: WAIT_TIME,
    nextRound: currentRound,
    state: 'WAITING_TO_START',
    history: gameHistory
  });
  
  // Countdown para o próximo jogo
  let countdown = WAIT_TIME / 1000;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(countdownInterval);
    } else {
      broadcast({
        type: 'countdown_update',
        countdown: countdown,
        nextRound: currentRound
      });
    }
  }, 1000);
  
  setTimeout(() => {
    clearInterval(countdownInterval);
    startNewGame();
  }, WAIT_TIME);
}

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('👤 Cliente conectado');
  
  // Enviar estado atual
  ws.send(JSON.stringify({
    type: 'game_state',
    state: gameState,
    multiplier: currentMultiplier,
    round: currentRound,
    history: gameHistory
  }));
  
  // Receber mensagens
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Mensagem recebida:', message.type);
      
      switch (message.type) {
        case 'place_bet':
          if (gameState === 'WAITING_TO_START') {
            // Processar aposta
            const betId = `${message.userId}_${currentRound}`;
            activeBets[betId] = {
              userId: message.userId,
              amount: message.amount,
              round: currentRound,
              ws: ws
            };
            
            ws.send(JSON.stringify({
              type: 'bet_placed',
              amount: message.amount,
              round: currentRound
            }));
            
            console.log(`💰 Aposta: ${message.amount} por ${message.userId}`);
          } else {
            ws.send(JSON.stringify({
              type: 'bet_rejected',
              reason: 'Fora do período de apostas'
            }));
          }
          break;
          
        case 'cash_out':
          const cashOutId = `${message.userId}_${currentRound}`;
          if (activeBets[cashOutId] && gameState === 'RUNNING') {
            const bet = activeBets[cashOutId];
            const winAmount = bet.amount * currentMultiplier;
            
            delete activeBets[cashOutId];
            
            ws.send(JSON.stringify({
              type: 'cash_out_success',
              multiplier: currentMultiplier,
              winAmount: winAmount,
              round: currentRound
            }));
            
            console.log(`💸 Cash out: ${winAmount.toFixed(2)} em ${currentMultiplier.toFixed(2)}x`);
          }
          break;
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('👋 Cliente desconectado');
  });
  
  ws.on('error', (error) => {
    console.error('❌ Erro WebSocket:', error);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌐 URL: https://web-production-20fe.up.railway.app`);
  console.log(`🎮 WebSocket ativo na mesma porta`);
  console.log(`🎯 Iniciando sistema de jogo...`);
  
  // Resetar estado inicial
  gameState = 'WAITING_TO_START';
  currentRound = 1;
  gameHistory = [];
  
  // Iniciar primeiro jogo após 3 segundos
  setTimeout(() => {
    console.log(`🚀 Iniciando primeiro ciclo do jogo`);
    startWaitingPeriod();
  }, 3000);
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
});