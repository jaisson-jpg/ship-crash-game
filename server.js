// server.js - Servidor principal para Railway
const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000; // Railway usa variável de ambiente PORT
const HOST = '0.0.0.0'; // Aceitar conexões de qualquer IP

console.log('🚀 Ship Crash Game - Iniciando servidor...');
console.log(`📍 Porta: ${PORT}`);
console.log(`🌐 Host: ${HOST}`);

// Middleware para parsing de JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Headers de segurança e CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-Content-Type-Options', 'nosniff');
  next();
});

// Servir arquivos estáticos da pasta www
app.use(express.static(path.join(__dirname, 'www'), {
  maxAge: '1d', // Cache por 1 dia
  etag: true
}));

// Redirecionar todas as rotas da API para o backend
app.use('/api', (req, res) => {
  console.log(`📡 API Request: ${req.method} ${req.url}`);
  
  // Redirecionar para o servidor backend
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('❌ Erro ao fazer proxy para backend:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      timestamp: new Date().toISOString()
    });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
});

// Health check para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Ship Crash Game',
    version: '1.0.0'
  });
});

// Rota padrão - servir index.html
app.get('*', (req, res) => {
  console.log(`📄 Serving: ${req.url}`);
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// Iniciar servidor backend em processo separado
let backendProcess;
try {
  backendProcess = spawn('node', ['backend/server.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  backendProcess.on('error', (err) => {
    console.error('❌ Erro ao iniciar servidor backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`🔄 Servidor backend encerrado com código: ${code}`);
  });

  console.log('✅ Servidor backend iniciado');
} catch (error) {
  console.error('❌ Falha ao iniciar backend:', error);
}

// Iniciar servidor principal
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Servidor principal rodando em http://${HOST}:${PORT}`);
  console.log(`🎮 Ship Crash Game disponível!`);
  console.log(`🔗 Acesse: http://localhost:${PORT}`);
  
  if (process.env.RAILWAY_STATIC_URL) {
    console.log(`🌐 URL do Railway: ${process.env.RAILWAY_STATIC_URL}`);
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Recebido sinal ${signal}, encerrando servidores...`);
  
  server.close(() => {
    console.log('✅ Servidor HTTP encerrado');
    
    if (backendProcess) {
      backendProcess.kill();
      console.log('✅ Processo backend encerrado');
    }
    
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  process.exit(1);
});