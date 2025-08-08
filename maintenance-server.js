// 🛑 SERVIDOR DESLIGADO INTENCIONALMENTE
console.log('🛑 SERVIDOR PAUSADO PARA MANUTENÇÃO');
console.log('📅 Pausado em:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
console.log('💤 Sistema em repouso até amanhã...');

// Sair imediatamente para forçar crash e parar o Railway
setTimeout(() => {
    console.log('🔌 Desligando servidor...');
    process.exit(0);
}, 2000);