// server.js - Servidor principal para Railway (Simplificado)
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Ship Crash Game - Iniciando servidor...');
console.log(`📍 Porta: ${PORT}`);

// Middleware básico
app.use(express.json());
app.use(express.static(path.join(__dirname, 'www')));

// Headers de CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Health check para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Ship Crash Game'
  });
});

// Servir todas as rotas
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🎮 Ship Crash Game disponível!`);
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Erro:', error);
});