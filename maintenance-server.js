// Servidor de Manutenção - Ship Crash Game
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🛑 Servidor em modo de manutenção iniciado');
console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

// Servir página de manutenção para todas as rotas
app.get('*', (req, res) => {
    console.log(`📥 Acesso tentado: ${req.url} - IP: ${req.ip}`);
    res.sendFile(path.join(__dirname, 'maintenance.html'));
});

app.listen(PORT, () => {
    console.log(`🛑 Servidor de manutenção rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: https://web-production-20fe.up.railway.app`);
    console.log(`⏰ Sistema pausado até nova ordem`);
});