// 🛑 ERRO FATAL PROPOSITAL PARA PARAR RAILWAY
console.log('🛑 FORÇANDO ERRO FATAL PARA PARAR SERVIDOR');

// Tentar importar módulo inexistente para causar crash
require('modulo-inexistente-para-quebrar-servidor');

// Se isso não funcionar, forçar erro de sintaxe
throw new Error('SERVIDOR PAUSADO INTENCIONALMENTE - NÃO É UM ERRO REAL');

// Múltiplas formas de parar
process.exit(1);
process.kill(process.pid, 'SIGTERM');