// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
// const bcrypt = require('bcrypt'); // Descomente quando for implementar hashing de senhas
// const jwt = require('jsonwebtoken'); // Descomente quando for implementar JWT

// const JWT_SECRET = 'SEU_SEGREDO_JWT_SUPER_SECRETO'; // Mude isso para um segredo forte e guarde bem!
// const SALT_ROUNDS = 10; // Para o bcrypt

const app = express();
const PORT = 3001;
const HOST = '0.0.0.0'; // Aceitar conexões de qualquer IP
const dbPath = path.join(__dirname, 'database.json');
console.log(`Servidor: Tentando usar database.json em: ${dbPath}`);

// --- Variáveis de Estado do Jogo no Servidor (COMO NO SEU CÓDIGO ORIGINAL) ---
let serverGameState = 'WAITING_TO_START';
let serverCurrentMultiplier = 1.00;
let serverCrashPoint = 0;
let serverGameLoopTimeout = null;
let serverWaitTimerInterval = null;
let globalGameHistory = [];
const MAX_GLOBAL_HISTORY_ITEMS_SERVER = 15;
let currentRoundId = 1;
let activeRoundBets = {};

const SERVER_WAIT_TIME_MS = 9000;
const SERVER_TIME_AFTER_CRASH_MS = 5000;
const SERVER_GAME_LOOP_INTERVAL_MS = 75;
const SERVER_BASE_RATE = 0.0875;
const SERVER_ACCELERATION_PER_ONEX = 0.68;
let gamePhaseStartTime = Date.now();

// --- Funções de Banco de Dados (JSON) ---
function initializeDatabase() {
    const defaultData = { users: [], nextUserId: 100001, gameRounds: [], nextRoundId: 1, userTransactions: [] };
    if (!fs.existsSync(dbPath)) {
        console.log("Servidor: Arquivo database.json não encontrado, criando um novo...");
        fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
        currentRoundId = defaultData.nextRoundId;
        return defaultData;
    } else {
        try {
            let rawData = fs.readFileSync(dbPath, 'utf-8');
            if (rawData.trim() === "") {
                console.log("Servidor: Arquivo database.json está vazio. Inicializando...");
                fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
                currentRoundId = defaultData.nextRoundId;
                return defaultData;
            }
            const jsonData = JSON.parse(rawData);
            let dbChanged = false;
            if (!Array.isArray(jsonData.users)) { jsonData.users = defaultData.users; dbChanged = true; }
            if (typeof jsonData.nextUserId !== 'number') {
                const maxIdInUsers = jsonData.users.reduce((max, user) => Math.max(max, user.userId || 0), 0);
                jsonData.nextUserId = Math.max(defaultData.nextUserId, maxIdInUsers + 1);
                dbChanged = true;
            }
            if (!Array.isArray(jsonData.gameRounds)) { jsonData.gameRounds = defaultData.gameRounds; dbChanged = true; }
            const maxRoundIdInHistory = jsonData.gameRounds.reduce((max, round) => Math.max(max, round.roundId || 0), 0);
            const nextExpectedRoundId = Math.max(defaultData.nextRoundId, maxRoundIdInHistory + 1);
            if (typeof jsonData.nextRoundId !== 'number' || jsonData.nextRoundId < nextExpectedRoundId) {
                 jsonData.nextRoundId = nextExpectedRoundId;
                 dbChanged = true;
            }
            if (!Array.isArray(jsonData.userTransactions)) { jsonData.userTransactions = defaultData.userTransactions; dbChanged = true; }

            if (dbChanged) {
                console.log("Servidor: Estrutura do database.json atualizada/corrigida.");
                fs.writeFileSync(dbPath, JSON.stringify(jsonData, null, 2), 'utf-8');
            }

            if (jsonData.gameRounds && jsonData.gameRounds.length > 0) {
                globalGameHistory = jsonData.gameRounds.slice(0, MAX_GLOBAL_HISTORY_ITEMS_SERVER).map(r => ({multiplier: r.crashPoint, roundId: r.roundId}));
            }
            currentRoundId = jsonData.nextRoundId;

            return jsonData;
        } catch (error) {
            console.error("Servidor: Erro ao ler/parsear database.json. Resetando:", error);
            fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
            currentRoundId = defaultData.nextRoundId;
            return defaultData;
        }
    }
}

function readDatabase() {
    try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Servidor: Erro CRÍTICO ao ler database.json:", error);
        // Retornar uma estrutura padrão em caso de falha crítica para evitar que o servidor quebre completamente
        return { users: [], nextUserId: 100001, gameRounds: [], nextRoundId: 1, userTransactions: [] };
    }
}

function writeDatabase(data) {
    try {
        // Adicionar um pequeno delay e um mecanismo de "lock" muito simples para evitar escritas concorrentes no JSON
        // ATENÇÃO: Isso NÃO é uma solução robusta para concorrência real. Use um SGBD para isso.
        if (writeDatabase.isWriting) {
            console.warn("Servidor: Tentativa de escrita concorrente no database.json. Aguardando...");
            setTimeout(() => writeDatabase(data), 100); // Tenta novamente em 100ms
            return;
        }
        writeDatabase.isWriting = true;
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
        writeDatabase.isWriting = false;
    } catch (error) {
        console.error("Servidor: Erro ao escrever no banco de dados:", error);
        writeDatabase.isWriting = false; // Garante que o lock seja liberado em caso de erro
    }
}
writeDatabase.isWriting = false; // Inicializa a flag de "lock"

// Função de log de transações APRIMORADA
function logUserTransaction(userId, type, amount, details = {}, relatedUserId = null) {
    const db = readDatabase();
    db.userTransactions = db.userTransactions || [];

    const userPerformingAction = db.users.find(u => u.userId === userId);
    let balanceBeforeTransaction = null;
    let balanceAfterTransaction = null;

    if (userPerformingAction) {
        // O 'amount' é o valor da transação em si (positivo para crédito, negativo para débito NO SALDO do userId)
        // O balanceAfter é o saldo do userPerformingAction APÓS a transação já ter sido refletida no objeto dele
        balanceAfterTransaction = parseFloat(userPerformingAction.balance.toFixed(2));
        // O balanceBefore é o saldo ANTES desta transação específica
        balanceBeforeTransaction = parseFloat((userPerformingAction.balance - amount).toFixed(2));
    }

    const newTransaction = {
        transactionId: `${Date.now()}_${userId}_${Math.random().toString(36).substring(2, 7)}`, // ID de transação mais único
        userId: userId, // Usuário principal da transação (quem teve o saldo alterado, ou quem iniciou)
        type: type.toUpperCase(), // Padroniza para maiúsculas para consistência
        amount: parseFloat(amount.toFixed(2)), // O valor da movimentação (positivo para crédito, negativo para débito para este userId)
        balanceBefore: balanceBeforeTransaction,
        balanceAfter: balanceAfterTransaction,
        timestamp: new Date().toISOString(),
        details: details, // Ex: { roundId, crashPoint, targetUserIdForSale, collectedFromUserId, creditedByAdminId }
        relatedUserId: relatedUserId // ID do outro usuário envolvido (ex: jogador para quem o promotor vendeu/coletou)
    };

    db.userTransactions.unshift(newTransaction); // Adiciona no início para ter as mais recentes primeiro

    // Limita o número de transações para não sobrecarregar o JSON
    if (db.userTransactions.length > 2000) {
         db.userTransactions = db.userTransactions.slice(0, 1000); // Mantém as 1000 mais recentes
    }
    writeDatabase(db);
    console.log(`Servidor: Transação registrada: UserID ${userId}, Tipo ${type}, Valor ${amount.toFixed(2)}, Detalhes: ${JSON.stringify(details)}, Relacionado: ${relatedUserId}`);
}


// --- Funções de Lógica do Jogo (COMO NO SEU CÓDIGO ORIGINAL, com pequenas adaptações) ---
function getRandomCrashPointServer() {
    const r = Math.random(); let result;
    if (r < 0.55) { result = (Math.random() * 0.99) + 1.01; }
    else if (r < 0.83) { result = (Math.random() * 8) + 2; }
    else if (r < 0.97) { result = (Math.random() * 40) + 10; }
    else { result = (Math.random() * 450) + 50; }
    return parseFloat(result.toFixed(2));
}

let wss;
function broadcast(data) {
    if (!wss) return;
    const jsonData = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try { client.send(jsonData); }
            catch (e) { console.error("Servidor: Erro ao fazer broadcast para um cliente:", e); }
        }
    });
}

function processCashOut(userId, cashOutAtMultiplierParam, isAuto = false, originalClientWs = null) {
    console.log(`Servidor: processCashOut INICIADO - UserID: ${userId}, MultiplicadorSugerido: ${cashOutAtMultiplierParam}, É Auto: ${isAuto}, EstadoJogo: ${serverGameState}, MultiplicadorAtualServidor: ${serverCurrentMultiplier.toFixed(2)}`);

    const betInfo = activeRoundBets[userId];
    const clientWsForResponse = originalClientWs || (betInfo ? betInfo.ws : null);

    if (!betInfo) {
        console.log(`Servidor: Cash-out FALHOU para UserID ${userId}. Razão: sem_aposta_ativa.`);
        if(clientWsForResponse && clientWsForResponse.readyState === WebSocket.OPEN) {
            clientWsForResponse.send(JSON.stringify({ type: 'cash_out_failed', reason: 'sem_aposta_ativa', isAuto: isAuto }));
        }
        return false;
    }
    if (betInfo.hasCashedOut) {
        console.log(`Servidor: Cash-out FALHOU para UserID ${userId}. Razão: ja_sacado.`);
        if (clientWsForResponse && clientWsForResponse.readyState === WebSocket.OPEN) {
            clientWsForResponse.send(JSON.stringify({ type: 'cash_out_failed', reason: 'ja_sacado', isAuto: isAuto }));
        }
        return false;
    }
    if (serverGameState !== 'ROUND_ACTIVE') {
        console.log(`Servidor: Cash-out FALHOU para UserID ${userId}. Razão: rodada_nao_ativa. Estado Atual: ${serverGameState}`);
        if (clientWsForResponse && clientWsForResponse.readyState === WebSocket.OPEN) {
            clientWsForResponse.send(JSON.stringify({ type: 'cash_out_failed', reason: 'rodada_nao_ativa', isAuto: isAuto }));
        }
        return false;
    }

    let effectiveMultiplier = parseFloat((isAuto ? cashOutAtMultiplierParam : serverCurrentMultiplier).toFixed(2));

    if (effectiveMultiplier < 1.01) {
        console.log(`Servidor: Cash-out FALHOU para UserID ${userId}. Razão: multiplicador_baixo (${effectiveMultiplier}x).`);
        if (clientWsForResponse && clientWsForResponse.readyState === WebSocket.OPEN) {
            clientWsForResponse.send(JSON.stringify({ type: 'cash_out_failed', reason: 'multiplicador_baixo', isAuto: isAuto }));
        } return false;
    }

    if (effectiveMultiplier > serverCrashPoint) {
        console.log(`Servidor: Cash-out FALHOU para UserID ${userId} @ ${effectiveMultiplier}x. Jogo crashou @ ${serverCrashPoint}x. (Saque tardio)`);
         if (clientWsForResponse && clientWsForResponse.readyState === WebSocket.OPEN) {
            clientWsForResponse.send(JSON.stringify({ type: 'cash_out_failed', reason: 'saque_tardio_crash_ocorreu', isAuto: isAuto, crashPoint: serverCrashPoint }));
        }
        return false;
    }

    const winnings = parseFloat((betInfo.amount * effectiveMultiplier).toFixed(2));
    let db = readDatabase();
    const userIndex = db.users.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
        console.error(`Servidor: Usuário ${userId} não encontrado no DB para cash-out.`); return false;
    }

    db.users[userIndex].balance += winnings;
    db.users[userIndex].balance = parseFloat(db.users[userIndex].balance.toFixed(2));
    // Log da transação de ganho
    logUserTransaction(userId, isAuto ? 'AUTO_BET_WIN' : 'MANUAL_BET_WIN', winnings, { roundId: currentRoundId, betAmount: betInfo.amount, multiplier: effectiveMultiplier});
    writeDatabase(db);

    betInfo.hasCashedOut = true;
    betInfo.cashedOutAt = effectiveMultiplier;
    betInfo.winnings = winnings;

    console.log(`Servidor: Cash-out ${isAuto ? 'AUTO ': ''}p/ userId ${userId} @ ${effectiveMultiplier}x BEM-SUCEDIDO. Ganhos: R$${winnings.toFixed(2)}. Novo Saldo DB: ${db.users[userIndex].balance.toFixed(2)}`);

    if (clientWsForResponse && clientWsForResponse.readyState === WebSocket.OPEN) {
        clientWsForResponse.send(JSON.stringify({
            type: 'cash_out_success',
            multiplier: effectiveMultiplier, winnings: winnings,
            newBalance: db.users[userIndex].balance, isAuto: isAuto
        }));
    }

    broadcast({
        type: 'player_cashed_out',
        playerDisplay: betInfo.userName,
        betAmount: betInfo.amount, cashOutMultiplier: effectiveMultiplier, winnings: winnings,
        userId: userId,
        roundId: currentRoundId
    });
    return true;
}

function serverStartWaitingPhase() {
    console.log("Servidor: Iniciando fase de ESPERA");
    clearTimeout(serverGameLoopTimeout);
    clearInterval(serverWaitTimerInterval);

    activeRoundBets = {};
    serverGameState = 'WAITING_TO_START';
    serverCurrentMultiplier = 1.00;
    serverCrashPoint = getRandomCrashPointServer();

    const db = readDatabase();
    currentRoundId = db.nextRoundId;

    console.log(`Servidor: Rodada ${currentRoundId} vai começar. Crash point: ${serverCrashPoint}x`);
    gamePhaseStartTime = Date.now();
    let timeLeft = Math.floor(SERVER_WAIT_TIME_MS / 1000);
    broadcast({ type: 'waiting', timeLeft: timeLeft, history: globalGameHistory, roundId: currentRoundId });

    serverWaitTimerInterval = setInterval(() => {
        timeLeft--;
        broadcast({ type: 'countdown', timeLeft: timeLeft, roundId: currentRoundId });
        if (timeLeft <= 0) {
            clearInterval(serverWaitTimerInterval);
            serverStartRound();
        }
    }, 1000);
}

function serverStartRound() {
    console.log(`Servidor: Iniciando RODADA ${currentRoundId}`);
    serverGameState = 'ROUND_ACTIVE';
    serverCurrentMultiplier = 1.00;
    broadcast({ type: 'round_start', history: globalGameHistory, roundId: currentRoundId });

    let lastMultiplierUpdateTime = Date.now();
    function gameTick() {
        if (serverGameState !== 'ROUND_ACTIVE') return;

        const now = Date.now();
        const deltaTime = (now - lastMultiplierUpdateTime) / 1000;
        lastMultiplierUpdateTime = now;

        const oneXSteps = Math.max(0, Math.floor(serverCurrentMultiplier) - 1);
        const currentRatePerSecond = SERVER_BASE_RATE * (1 + SERVER_ACCELERATION_PER_ONEX * oneXSteps);
        serverCurrentMultiplier += deltaTime * currentRatePerSecond;
        serverCurrentMultiplier = parseFloat(serverCurrentMultiplier.toFixed(4));

        for (const bettingUserIdStr in activeRoundBets) {
            const bettingUserId = parseInt(bettingUserIdStr);
            const betInfo = activeRoundBets[bettingUserId];
            if (betInfo && !betInfo.hasCashedOut && betInfo.autoCashOutTarget &&
                serverCurrentMultiplier >= betInfo.autoCashOutTarget &&
                serverCurrentMultiplier < serverCrashPoint) {
                console.log(`Servidor: gameTick detectou auto-cashout para ${bettingUserId} @ ${betInfo.autoCashOutTarget}x (Atual: ${serverCurrentMultiplier.toFixed(2)}x)`);
                processCashOut(bettingUserId, betInfo.autoCashOutTarget, true, betInfo.ws);
            }
        }

        if (serverCurrentMultiplier >= serverCrashPoint) {
            serverCurrentMultiplier = serverCrashPoint;
            console.log(`Servidor: CRASH @ ${serverCurrentMultiplier.toFixed(2)}x para rodada ${currentRoundId}`);
            serverGameState = 'ROUND_CRASHED';
            const finalCrashPoint = parseFloat(serverCurrentMultiplier.toFixed(2));

            globalGameHistory.unshift({multiplier: finalCrashPoint, roundId: currentRoundId});
            if (globalGameHistory.length > MAX_GLOBAL_HISTORY_ITEMS_SERVER) globalGameHistory.pop();

            for (const bettingUserIdStr in activeRoundBets) {
                 const bettingUserId = parseInt(bettingUserIdStr);
                if (activeRoundBets[bettingUserId] && !activeRoundBets[bettingUserId].hasCashedOut) {
                    const betInfo = activeRoundBets[bettingUserId];
                    betInfo.hasCashedOut = true;
                    betInfo.cashedOutAt = finalCrashPoint;
                    betInfo.winnings = 0;
                    // Log da transação de perda
                    logUserTransaction(bettingUserId, 'BET_LOSS', -betInfo.amount, { roundId: currentRoundId, crashPoint: finalCrashPoint });

                    const clientWsToNotify = betInfo.ws;
                    if (clientWsToNotify && clientWsToNotify.readyState === WebSocket.OPEN) {
                        clientWsToNotify.send(JSON.stringify({
                            type: 'bet_lost_due_to_crash', roundId: currentRoundId,
                            betAmount: betInfo.amount, crashPoint: finalCrashPoint
                        }));
                    }
                    broadcast({
                        type: 'player_lost_bet',
                        playerDisplay: betInfo.userName,
                        betAmount: betInfo.amount, crashPoint: finalCrashPoint, userId: bettingUserId,
                        roundId: currentRoundId
                    });
                }
            }
            let db = readDatabase();
            db.gameRounds = db.gameRounds || [];
            let betsForDb = {};
            for(const uid in activeRoundBets) {
                const {ws, ...betDetails} = activeRoundBets[uid]; // Não salva o objeto WebSocket no DB
                betsForDb[uid] = betDetails;
            }
            db.gameRounds.unshift({
                roundId: currentRoundId, crashPoint: finalCrashPoint,
                timestamp: new Date().toISOString(), bets: betsForDb
            });
            if(db.gameRounds.length > 50) db.gameRounds.pop(); // Limita o histórico de rodadas no DB
            db.nextRoundId = currentRoundId + 1;
            writeDatabase(db);

            broadcast({ type: 'crash', multiplier: finalCrashPoint, history: globalGameHistory, roundId: currentRoundId });
            serverGameLoopTimeout = setTimeout(serverStartWaitingPhase, SERVER_TIME_AFTER_CRASH_MS);
            return;
        }
        broadcast({ type: 'multiplier_update', multiplier: serverCurrentMultiplier, roundId: currentRoundId });
        serverGameLoopTimeout = setTimeout(gameTick, SERVER_GAME_LOOP_INTERVAL_MS);
    }
    lastMultiplierUpdateTime = Date.now();
    serverGameLoopTimeout = setTimeout(gameTick, SERVER_GAME_LOOP_INTERVAL_MS);
}


// --- Configuração do Express ---
app.use(cors());
app.use(express.json());

// --- Middleware de Autenticação (Exemplo - PRECISA SER IMPLEMENTADO CORRETAMENTE COM JWT) ---
// function authenticateToken(req, res, next) {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
//     if (token == null) return res.sendStatus(401); // Se não há token, não autorizado

//     jwt.verify(token, JWT_SECRET, (err, user) => {
//         if (err) return res.sendStatus(403); // Token inválido ou expirado
//         req.user = user; // Adiciona o payload do token (ex: { userId, role }) ao objeto req
//         next();
//     });
// }

// --- Rotas de API para Usuários (Login/Registro - COMO NO SEU CÓDIGO ORIGINAL) ---
app.post('/api/users/register', async (req, res) => { // Adicionado async para bcrypt
    console.log("Servidor: Rota /api/users/register acessada");
    const { fullName, email, cpf, password } = req.body;
    if (!fullName || !email || !cpf || !password || password.length < 6 ) {
        return res.status(400).json({ error: "Dados de registro inválidos ou senha muito curta." });
    }
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11 || !/^\d+$/.test(cpfLimpo)) {
        return res.status(400).json({ error: "CPF inválido! Deve conter 11 números." });
    }
    if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ error: "Formato de email inválido." });
    }
    let db = readDatabase();
    if (db.users.find(user => user.email.toLowerCase() === email.toLowerCase())) {
        return res.status(409).json({ error: "Este email já está cadastrado." });
    }
    if (db.users.find(user => user.cpf === cpfLimpo)) {
        return res.status(409).json({ error: "Este CPF já está cadastrado." });
    }

    // --- HASHING DA SENHA (EXEMPLO COM BCRYPT) ---
    // try {
    //     const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUserId = db.nextUserId;
    const newUser = {
        userId: newUserId, fullName, email: email.toLowerCase(), cpf: cpfLimpo,
        password: password, // DEVE SER hashedPassword
        balance: 0.00,
        role: 'player', // Papel padrão
        status: 'active', // Status padrão
        registrationDate: new Date().toISOString()
    };
    db.users.push(newUser);
    db.nextUserId++;
    writeDatabase(db);
    console.log("Servidor: Usuário registrado:", newUser.email, "ID:", newUser.userId);
    // Não retorne a senha ou hash da senha
    res.status(201).json({
        userId: newUser.userId, fullName: newUser.fullName, email: newUser.email,
        balance: newUser.balance, role: newUser.role, message: "Usuário cadastrado com sucesso!"
    });
    // } catch (hashError) {
    //     console.error("Servidor: Erro ao hashear senha:", hashError);
    //     return res.status(500).json({ error: "Erro interno ao processar registro." });
    // }
});

app.post('/api/users/login', async (req, res) => { // Adicionado async para bcrypt
    console.log("Servidor: Rota /api/users/login acessada. Body:", req.body);
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }
    let db = readDatabase();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        console.log("Servidor: Login falhou - email não encontrado:", email);
        return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    // --- COMPARAÇÃO DE SENHA HASHEADA (EXEMPLO COM BCRYPT) ---
    // const passwordMatch = await bcrypt.compare(password, user.password); // user.password deve ser o hash
    // if (!passwordMatch) {
    if (user.password !== password) { // MANTENDO SUA LÓGICA ATUAL POR ENQUANTO
        console.log("Servidor: Login falhou - senha incorreta para:", email);
        return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    const userIndex = db.users.findIndex(u => u.userId === user.userId);
    if (userIndex !== -1) {
        db.users[userIndex].lastLogin = new Date().toISOString();
        writeDatabase(db);
    }

    // --- GERAÇÃO DE TOKEN JWT (EXEMPLO) ---
    // const tokenPayload = { userId: user.userId, role: user.role };
    // const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token expira em 1 hora

    console.log("Servidor: Login bem-sucedido para:", user.email, "ID:", user.userId, "Saldo:", user.balance, "Role:", user.role);
    res.status(200).json({
        userId: user.userId, fullName: user.fullName, email: user.email,
        balance: user.balance,
        role: user.role, // Enviar o role para o frontend
        token: "simulated_jwt_token_for_" + user.userId, // DEVE SER o token JWT real
        message: "Login bem-sucedido!"
    });
});


// --- ROTAS DA API PARA PROMOTORES ---

// Rota para o promotor vender/enviar fichas para um jogador
// app.post('/api/promoter/sell-chips', authenticateToken, async (req, res) => { // Descomente authenticateToken
app.post('/api/promoter/sell-chips', async (req, res) => {
    // const authenticatedPromoterId = req.user.userId; // Vem do token JWT
    // const authenticatedPromoterRole = req.user.role;

    const { promoterId, targetUserId, amount } = req.body;

    // Validação básica de entrada
    if (!promoterId || !targetUserId || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Dados inválidos. Verifique promoterId, targetUserId e amount." });
    }

    const numericPromoterId = parseInt(promoterId);
    const numericTargetUserId = parseInt(targetUserId);
    const numericAmount = parseFloat(amount);

    // if (authenticatedPromoterId !== numericPromoterId || authenticatedPromoterRole !== 'promoter') {
    //     return res.status(403).json({ error: "Ação não autorizada." });
    // }

    let db = readDatabase();
    const promoterIndex = db.users.findIndex(u => u.userId === numericPromoterId && u.role === 'promoter');
    const targetUserIndex = db.users.findIndex(u => u.userId === numericTargetUserId);

    if (promoterIndex === -1) {
        return res.status(404).json({ error: "Promotor não encontrado ou não tem permissão." });
    }
    if (targetUserIndex === -1) {
        return res.status(404).json({ error: "Jogador alvo não encontrado." });
    }

    const promoter = db.users[promoterIndex];
    const targetUser = db.users[targetUserIndex];

    if (promoter.balance < numericAmount) {
        return res.status(400).json({ error: "Saldo insuficiente do promotor." });
    }

    // Realizar a transação
    db.users[promoterIndex].balance = parseFloat((promoter.balance - numericAmount).toFixed(2));
    db.users[targetUserIndex].balance = parseFloat((targetUser.balance + numericAmount).toFixed(2));

    // Registrar transações
    logUserTransaction(numericPromoterId, 'PROMOTER_SELL_CHIPS_DEBIT', -numericAmount, { soldToUserId: numericTargetUserId }, numericTargetUserId);
    logUserTransaction(numericTargetUserId, 'PLAYER_CREDIT_FROM_PROMOTER', numericAmount, { receivedFromPromoterId: numericPromoterId }, numericPromoterId);

    writeDatabase(db);

    console.log(`Servidor: Promotor ${numericPromoterId} vendeu ${numericAmount} para Jogador ${numericTargetUserId}. Novo saldo promotor: ${db.users[promoterIndex].balance}`);
    res.status(200).json({
        message: `R$ ${numericAmount.toFixed(2)} enviados com sucesso para o jogador ${targetUser.fullName || numericTargetUserId}!`,
        promoterNewBalance: db.users[promoterIndex].balance
    });
});


// Rota para o promotor coletar/retirar fichas de um jogador
// app.post('/api/promoter/collect-chips-from-player', authenticateToken, async (req, res) => { // Descomente authenticateToken
app.post('/api/promoter/collect-chips-from-player', async (req, res) => {
    // const authenticatedPromoterId = req.user.userId;
    // const authenticatedPromoterRole = req.user.role;
    const { promoterId, targetUserId, amount } = req.body;

    if (!promoterId || !targetUserId || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Dados inválidos." });
    }
    const numericPromoterId = parseInt(promoterId);
    const numericTargetUserId = parseInt(targetUserId);
    const numericAmount = parseFloat(amount);

    // if (authenticatedPromoterId !== numericPromoterId || authenticatedPromoterRole !== 'promoter') {
    //     return res.status(403).json({ error: "Ação não autorizada." });
    // }

    // Adicionar validação de valor mínimo de retirada (ex: 10)
    if (numericAmount < 10) {
         return res.status(400).json({ error: "Valor mínimo para retirada é 10 DINDIN." });
    }

    let db = readDatabase();
    const promoterIndex = db.users.findIndex(u => u.userId === numericPromoterId && u.role === 'promoter');
    const targetUserIndex = db.users.findIndex(u => u.userId === numericTargetUserId);

    if (promoterIndex === -1) {
        return res.status(404).json({ error: "Promotor não encontrado." });
    }
    if (targetUserIndex === -1) {
        return res.status(404).json({ error: "Jogador alvo não encontrado." });
    }

    const targetUser = db.users[targetUserIndex];

    // TODO: Implementar lógica de VIP/Nível do jogador (precisa adicionar esses campos aos usuários)
    // Exemplo: if (!targetUser.vipLevel || targetUser.vipLevel < 1) {
    //     return res.status(403).json({ error: "Jogador alvo não atende aos requisitos para retirada." });
    // }

    if (targetUser.balance < numericAmount) {
        return res.status(400).json({ error: "Saldo insuficiente do jogador alvo." });
    }

    // Realizar a transação
    db.users[targetUserIndex].balance = parseFloat((targetUser.balance - numericAmount).toFixed(2));
    db.users[promoterIndex].balance = parseFloat((db.users[promoterIndex].balance + numericAmount).toFixed(2));

    // Registrar transações
    logUserTransaction(numericTargetUserId, 'PLAYER_DEBIT_BY_PROMOTER', -numericAmount, { collectedByPromoterId: numericPromoterId }, numericPromoterId);
    logUserTransaction(numericPromoterId, 'PROMOTER_COLLECT_CREDIT', numericAmount, { collectedFromUserId: numericTargetUserId }, numericTargetUserId);

    writeDatabase(db);
    console.log(`Servidor: Promotor ${numericPromoterId} coletou ${numericAmount} do Jogador ${numericTargetUserId}. Novo saldo promotor: ${db.users[promoterIndex].balance}`);
    res.status(200).json({
        message: `R$ ${numericAmount.toFixed(2)} coletados com sucesso do jogador ${targetUser.fullName || numericTargetUserId}!`,
        promoterNewBalance: db.users[promoterIndex].balance
    });
});


// Rota para buscar transações de um promotor
// app.get('/api/promoter/transactions/:promoterId', authenticateToken, async (req, res) => { // Descomente authenticateToken
app.get('/api/promoter/transactions/:promoterId', async (req, res) => {
    const requestedPromoterId = parseInt(req.params.promoterId);
    // const authenticatedUserId = req.user.userId;
    // const authenticatedUserRole = req.user.role;

    // if (authenticatedUserRole !== 'admin' && authenticatedUserId !== requestedPromoterId) {
    //     return res.status(403).json({ error: "Acesso não autorizado." });
    // }
    if (isNaN(requestedPromoterId)) {
        return res.status(400).json({ error: "ID do promotor inválido." });
    }

    const db = readDatabase();
    const promoter = db.users.find(u => u.userId === requestedPromoterId && u.role === 'promoter');

    if (!promoter) {
        return res.status(404).json({ error: "Promotor não encontrado." });
    }

    // Filtrar transações relevantes para o promotor
    // Isso inclui transações onde o promotor é o 'userId' principal
    // OU onde ele é o 'relatedUserId' em tipos de transações relevantes.
    const promoterTransactions = db.userTransactions.filter(tx => {
        return tx.userId === requestedPromoterId ||
               (tx.relatedUserId === requestedPromoterId &&
                (tx.type === 'PLAYER_CREDIT_FROM_PROMOTER' || tx.type === 'PLAYER_DEBIT_BY_PROMOTER')
               );
    }).map(tx => {
        // Formata a transação para o frontend, se necessário, ou apenas retorna
        // A lógica de descrição no frontend (promoter_transactions.html) já faz um bom trabalho.
        // Apenas garantimos que os campos esperados (type, amount, timestamp, details) estejam presentes.
        return {
            transactionId: tx.transactionId,
            type: tx.type,
            amount: tx.amount,
            timestamp: tx.timestamp,
            details: tx.details || {}, // Garante que details exista
            // Adicionar mais campos se o frontend precisar de forma diferente
        };
    });

    // Ordena da mais recente para a mais antiga
    promoterTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(promoterTransactions);
});

// --- ROTAS DA API PARA PROMOTORES ---

// Middleware placeholder para autenticação de promotor (SUBSTITUA PELA SUA LÓGICA DE JWT)
function authenticatePromoter(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Espera "Bearer TOKEN"
    // console.log("Servidor: Token recebido para rota de promotor:", token);

    // --- LÓGICA DE VERIFICAÇÃO DE TOKEN JWT DEVE ENTRAR AQUI ---
    // 1. Verifique se o token existe. Se não, retorne 401.
    // 2. Verifique o token usando jwt.verify(token, JWT_SECRET, (err, decodedToken) => { ... });
    // 3. Se o token for inválido ou expirado, retorne 403.
    // 4. Se o token for válido, verifique se decodedToken.role === 'promoter'.
    // 5. Se não for promotor, retorne 403 (Acesso negado).
    // 6. Se tudo estiver OK, adicione os dados do promotor decodificados ao req (ex: req.promoter = decodedToken) e chame next().
    // --- FIM DA LÓGICA DE VERIFICAÇÃO DE TOKEN ---

    // Por enquanto, como placeholder, vamos simular que o token é válido se existir
    // E que o promoterId enviado no corpo da requisição é o promotor autenticado.
    // ISSO NÃO É SEGURO PARA PRODUÇÃO!
    if (!token) { // Simulação muito básica
        // return res.status(401).json({ error: "Token de autenticação não fornecido." });
    }
    // Em um sistema real, o ID do promotor viria do token decodificado, não do corpo da requisição.
    // req.promoter = { userId: parseInt(req.body.promoterId), role: 'promoter' }; // Exemplo de como seria após decodificar o token
    console.warn("Servidor: Rota de promotor acessada SEM VERIFICAÇÃO DE TOKEN JWT REAL. Implemente a segurança!");
    next();
}

// Rota para o promotor vender/enviar fichas para um jogador
app.post('/api/promoter/sell-chips', authenticatePromoter, (req, res) => {
    const { promoterId, targetUserId, amount } = req.body;
    // Em um sistema real com JWT, promoterId viria de req.promoter.userId (do token)
    // e verificaríamos se req.promoter.role === 'promoter'

    if (!promoterId || !targetUserId || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Dados inválidos. Verifique promoterId, targetUserId e amount." });
    }

    const numericPromoterId = parseInt(promoterId);
    const numericTargetUserId = parseInt(targetUserId);
    const numericAmount = parseFloat(parseFloat(amount).toFixed(2));

    let db = readDatabase();
    const promoterIndex = db.users.findIndex(u => u.userId === numericPromoterId && u.role === 'promoter');
    const targetUserIndex = db.users.findIndex(u => u.userId === numericTargetUserId);

    if (promoterIndex === -1) {
        return res.status(404).json({ error: "Promotor não encontrado ou não tem permissão." });
    }
    if (targetUserIndex === -1) {
        return res.status(404).json({ error: "Jogador alvo não encontrado." });
    }

    if (db.users[promoterIndex].balance < numericAmount) {
        return res.status(400).json({ error: "Saldo insuficiente do promotor." });
    }

    // Realizar a transação
    db.users[promoterIndex].balance -= numericAmount;
    db.users[targetUserIndex].balance += numericAmount;

    // Arredondar saldos para duas casas decimais
    db.users[promoterIndex].balance = parseFloat(db.users[promoterIndex].balance.toFixed(2));
    db.users[targetUserIndex].balance = parseFloat(db.users[targetUserIndex].balance.toFixed(2));

    // Registrar transações
    // Para o débito do promotor: o 'amount' é negativo porque é uma saída do saldo dele
    logUserTransaction(numericPromoterId, 'PROMOTER_SALE_DEBIT', -numericAmount,
        { soldToUserId: numericTargetUserId, description: `Venda para Jogador ID ${numericTargetUserId}` },
        numericTargetUserId
    );
    // Para o crédito do jogador: o 'amount' é positivo porque é uma entrada no saldo dele
    logUserTransaction(numericTargetUserId, 'PLAYER_CREDIT_FROM_PROMOTER', numericAmount,
        { receivedFromPromoterId: numericPromoterId, description: `Crédito do Promotor ID ${numericPromoterId}` },
        numericPromoterId
    );

    writeDatabase(db);

    console.log(`Servidor: Promotor ${numericPromoterId} vendeu ${numericAmount} para Jogador ${numericTargetUserId}. Novo saldo promotor: ${db.users[promoterIndex].balance}`);
    res.status(200).json({
        message: `R$ ${numericAmount.toFixed(2)} enviados com sucesso para o jogador ${db.users[targetUserIndex].fullName || numericTargetUserId}!`,
        promoterNewBalance: db.users[promoterIndex].balance
    });
});

// Rota para o promotor coletar/retirar fichas de um jogador
app.post('/api/promoter/collect-chips-from-player', authenticatePromoter, (req, res) => {
    const { promoterId, targetUserId, amount } = req.body;
    // Em um sistema real com JWT, promoterId viria de req.promoter.userId

    if (!promoterId || !targetUserId || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Dados inválidos." });
    }
    const numericPromoterId = parseInt(promoterId);
    const numericTargetUserId = parseInt(targetUserId);
    const numericAmount = parseFloat(parseFloat(amount).toFixed(2));

    if (numericAmount < 10) { // Validação de valor mínimo, como no frontend
         return res.status(400).json({ error: "Valor mínimo para retirada é 10 DINDIN." });
    }

    let db = readDatabase();
    const promoterIndex = db.users.findIndex(u => u.userId === numericPromoterId && u.role === 'promoter');
    const targetUserIndex = db.users.findIndex(u => u.userId === numericTargetUserId);

    if (promoterIndex === -1) {
        return res.status(404).json({ error: "Promotor não encontrado ou não autorizado." });
    }
    if (targetUserIndex === -1) {
        return res.status(404).json({ error: "Jogador alvo não encontrado." });
    }

    const targetUser = db.users[targetUserIndex];

    // TODO: Adicionar campos 'playerLevel' e 'vipStatus' à sua estrutura de usuários no database.json
    // E implementar a lógica de verificação aqui, por exemplo:
    // if ((!targetUser.vipStatus || targetUser.vipStatus < 1) && (!targetUser.playerLevel || targetUser.playerLevel < 10)) {
    //     return res.status(403).json({ error: "Jogador alvo não atende aos requisitos para coleta de fichas (VIP ou Nível)." });
    // }

    if (targetUser.balance < numericAmount) {
        return res.status(400).json({ error: "Saldo insuficiente do jogador alvo." });
    }

    // Realizar a transação
    db.users[targetUserIndex].balance -= numericAmount;
    db.users[promoterIndex].balance += numericAmount;

    // Arredondar saldos
    db.users[targetUserIndex].balance = parseFloat(db.users[targetUserIndex].balance.toFixed(2));
    db.users[promoterIndex].balance = parseFloat(db.users[promoterIndex].balance.toFixed(2));

    // Registrar transações
    // Para o débito do jogador: amount é negativo
    logUserTransaction(numericTargetUserId, 'PLAYER_DEBIT_BY_PROMOTER', -numericAmount,
        { collectedByPromoterId: numericPromoterId, description: `Coleta pelo Promotor ID ${numericPromoterId}` },
        numericPromoterId
    );
    // Para o crédito do promotor: amount é positivo
    logUserTransaction(numericPromoterId, 'PROMOTER_COLLECT_CREDIT', numericAmount,
        { collectedFromUserId: numericTargetUserId, description: `Coleta do Jogador ID ${numericTargetUserId}` },
        numericTargetUserId
    );

    writeDatabase(db);
    console.log(`Servidor: Promotor ${numericPromoterId} coletou ${numericAmount} do Jogador ${numericTargetUserId}. Novo saldo promotor: ${db.users[promoterIndex].balance}`);
    res.status(200).json({
        message: `R$ ${numericAmount.toFixed(2)} coletados com sucesso do jogador ${targetUser.fullName || numericTargetUserId}!`,
        promoterNewBalance: db.users[promoterIndex].balance
    });
});

// Rota para buscar transações de um promotor
app.get('/api/promoter/transactions/:promoterId', authenticatePromoter, (req, res) => {
    const requestedPromoterId = parseInt(req.params.promoterId);
    // Em um sistema real com JWT:
    // const authenticatedUserId = req.promoter.userId;
    // const authenticatedUserRole = req.promoter.role;
    // if (authenticatedUserRole !== 'admin' && authenticatedUserId !== requestedPromoterId) {
    //     return res.status(403).json({ error: "Acesso não autorizado." });
    // }

    if (isNaN(requestedPromoterId)) {
        return res.status(400).json({ error: "ID do promotor inválido." });
    }

    const db = readDatabase();
    const promoter = db.users.find(u => u.userId === requestedPromoterId && u.role === 'promoter');

    if (!promoter) {
        return res.status(404).json({ error: "Promotor não encontrado." });
    }

    const promoterTransactions = db.userTransactions.filter(tx => {
        return tx.userId === requestedPromoterId || tx.relatedUserId === requestedPromoterId;
    }).map(tx => {
        // Adapta o 'details' para o que o frontend promoter_transactions.html espera
        let frontendDetails = {};
        if (tx.type === 'PROMOTER_SALE_DEBIT') { // Anteriormente 'promoter_sell_chips' no frontend
            frontendDetails.toTargetUserId = tx.relatedUserId;
        } else if (tx.type === 'PROMOTER_COLLECT_CREDIT') { // Anteriormente 'promoter_collect_chips' no frontend
            frontendDetails.fromTargetUserId = tx.relatedUserId;
        } else if (tx.type === 'PROMOTER_CREDIT_BY_ADMIN') { // Anteriormente 'promoter_credit_by_admin' no frontend
            frontendDetails.adminId = tx.details.creditedByAdminId || 'Sistema'; // Supondo que adminId esteja em details
        } else {
            frontendDetails = tx.details || {};
        }

        return {
            transactionId: tx.transactionId,
            type: tx.type, // O frontend pode precisar adaptar os tipos (PROMOTER_SALE_DEBIT -> promoter_sell_chips)
            amount: tx.amount, // O frontend já usa Math.abs() para exibir, então o sinal aqui está OK.
            timestamp: tx.timestamp,
            details: frontendDetails,
        };
    });

    // Ordena da mais recente para a mais antiga
    promoterTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(promoterTransactions);
});


// --- Inicialização dos Servidores (COMO NO SEU CÓDIGO ORIGINAL) ---
const serverHttp = app.listen(PORT, HOST, () => {
    console.log(`Servidor HTTP (API) rodando em http://${HOST}:${PORT}`);
    initializeDatabase();
});

wss = new WebSocket.Server({ server: serverHttp });
console.log(`Servidor WebSocket aguardando conexões na mesma porta do HTTP (${PORT})...`);

wss.on('listening', () => {
    console.log("Servidor WebSocket está escutando. Iniciando ciclo do jogo.");
    setTimeout(() => {
        serverStartWaitingPhase();
    }, 500);
});

wss.on('connection', (ws) => {
    console.log('Servidor: Novo cliente conectado ao WebSocket.');
    ws.appUserId = null;

    let initialStateData = {
        history: globalGameHistory,
        currentMultiplier: serverCurrentMultiplier,
        roundId: currentRoundId
    };
    if (serverGameState === 'WAITING_TO_START') {
        initialStateData.type = 'waiting';
        const timeElapsedInWait = Date.now() - gamePhaseStartTime;
        initialStateData.timeLeft = Math.max(0, Math.floor((SERVER_WAIT_TIME_MS - timeElapsedInWait) / 1000));
    } else if (serverGameState === 'ROUND_ACTIVE') {
        initialStateData.type = 'multiplier_update';
    } else if (serverGameState === 'ROUND_CRASHED') {
        initialStateData.type = 'crash_info_on_connect';
        initialStateData.lastCrashPoint = serverCrashPoint;
    }
    if(initialStateData.type) {
      try {
          console.log("Servidor: Enviando estado inicial para novo cliente:", initialStateData);
          ws.send(JSON.stringify(initialStateData));
      } catch (e) {
          console.error("Servidor: Erro ao enviar estado inicial para novo cliente", e);
      }
    } else {
        console.warn("Servidor: Nenhum tipo de estado inicial definido para novo cliente. Estado do jogo no servidor:", serverGameState);
    }

    ws.on('message', (messageString) => {
        console.log('----------------------------------------------------');
        console.log('Servidor: MENSAGEM BRUTA RECEBIDA DO CLIENTE:', messageString.toString());
        let data;
        try {
            data = JSON.parse(messageString.toString());
            console.log('Servidor: Mensagem PARSEADA do cliente:', data);
            if(data.userId && !ws.appUserId) {
                ws.appUserId = parseInt(data.userId);
                console.log(`Servidor: UserID ${ws.appUserId} AGORA associado à conexão WebSocket.`);
            }
        } catch (error) {
            console.error('Servidor: Erro ao parsear mensagem JSON do cliente:', messageString.toString(), error);
            if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', message: 'Formato de mensagem inválido.' }));
            return;
        }

        const userIdToProcess = ws.appUserId || (data.userId ? parseInt(data.userId) : null);

        if (!userIdToProcess && (data.type === 'place_bet' || data.type === 'cash_out' || data.type === 'auto_cash_out')) {
            console.log(`Servidor: Ação (${data.type}) REJEITADA. UserID não pôde ser determinado.`);
            if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: `${data.type}_failed`, reason: 'identificacao_usuario_falhou' }));
            return;
        }

        if (data.type === 'place_bet') {
            console.log(`Servidor: Processando 'place_bet' para UserID: ${userIdToProcess}, Dados:`, data);
            const betAmount = parseFloat(data.amount);
            const autoTarget = data.autoTarget ? parseFloat(data.autoTarget) : null;

            if (isNaN(betAmount) || betAmount <= 0) {
                console.log(`Servidor: Aposta REJEITADA UserID: ${userIdToProcess}. Razão: dados_invalidos (valor)`);
                if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'bet_rejected', reason: 'dados_invalidos' })); return;
            }
            if (serverGameState !== 'WAITING_TO_START') {
                console.log(`Servidor: Aposta REJEITADA UserID: ${userIdToProcess}. Razão: fora_da_fase_de_apostas. Estado: ${serverGameState}`);
                if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'bet_rejected', reason: 'fora_da_fase_de_apostas' })); return;
            }
            if (activeRoundBets[userIdToProcess]) {
                console.log(`Servidor: Aposta REJEITADA UserID: ${userIdToProcess}. Razão: aposta_ja_realizada`);
                if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'bet_rejected', reason: 'aposta_ja_realizada_nesta_rodada' })); return;
            }
            let db = readDatabase();
            const userIndex = db.users.findIndex(u => u.userId === userIdToProcess);
            if (userIndex === -1) {
                console.log(`Servidor: Aposta REJEITADA UserID: ${userIdToProcess}. Razão: usuario_nao_encontrado`);
                if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'bet_rejected', reason: 'usuario_nao_encontrado' })); return;
            }
            if (db.users[userIndex].balance < betAmount) {
                console.log(`Servidor: Aposta REJEITADA UserID: ${userIdToProcess}. Razão: saldo_insuficiente. Saldo: ${db.users[userIndex].balance}, Aposta: ${betAmount}`);
                if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'bet_rejected', reason: 'saldo_insuficiente' })); return;
            }

            db.users[userIndex].balance -= betAmount;
            db.users[userIndex].balance = parseFloat(db.users[userIndex].balance.toFixed(2));
            // Log da transação de aposta
            logUserTransaction(userIdToProcess, 'BET_PLACED', -betAmount, { roundId: currentRoundId, amount: betAmount });
            writeDatabase(db);

            activeRoundBets[userIdToProcess] = {
                amount: betAmount, autoCashOutTarget: autoTarget, hasCashedOut: false,
                ws: ws,
                roundId: currentRoundId, userId: userIdToProcess,
                userName: db.users[userIndex].fullName || `User${userIdToProcess.toString().slice(-4)}`
            };
            console.log(`Servidor: Aposta de R$${betAmount.toFixed(2)} (Auto: ${autoTarget || 'N/A'}x) ACEITA para userId ${userIdToProcess} (${activeRoundBets[userIdToProcess].userName}). Saldo DB: ${db.users[userIndex].balance.toFixed(2)}`);
            if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({
                type: 'bet_accepted', newBalance: db.users[userIndex].balance, betAmount: betAmount,
                autoCashOutArmed: !!autoTarget, autoCashOutTarget: autoTarget
            }));
            broadcast({ type: 'player_bet_placed', playerDisplay: activeRoundBets[userIdToProcess].userName, betAmount: betAmount, userId: userIdToProcess, roundId: currentRoundId });

        } else if (data.type === 'cash_out') {
            console.log(`Servidor: Processando 'cash_out' manual para UserID: ${userIdToProcess}, Dados:`, data);
            processCashOut(userIdToProcess, serverCurrentMultiplier, false, ws);

        } else if (data.type === 'auto_cash_out') {
            console.log(`Servidor: Cliente ${userIdToProcess} informa que atingiu auto_cash_out @ ${data.targetMultiplier}x.`);
            if (activeRoundBets[userIdToProcess] && !activeRoundBets[userIdToProcess].hasCashedOut && serverGameState === 'ROUND_ACTIVE') {
                 processCashOut(userIdToProcess, data.targetMultiplier, true, ws);
            } else {
                console.log(`Servidor: Solicitação de auto_cash_out do cliente ${userIdToProcess} ignorada (provavelmente já processada ou inválida).`);
            }
        } else if (data.type === 'client_ready_with_id') {
            if (data.userId && !ws.appUserId) {
                 ws.appUserId = parseInt(data.userId);
                 console.log(`Servidor: UserID ${ws.appUserId} associado à conexão WebSocket via 'client_ready_with_id' (tardio).`);
            }
        }
    });

    ws.on('close', (code, reason) => {
        const reasonString = reason instanceof Buffer ? reason.toString() : reason;
        const closedUserId = ws.appUserId;
        console.log(`Servidor: Cliente (UserID: ${closedUserId || 'N/A'}) desconectado. Código: ${code}, Razão: ${reasonString || 'N/A'}`);
        if (closedUserId && activeRoundBets[closedUserId] && activeRoundBets[closedUserId].ws === ws) {
            activeRoundBets[closedUserId].ws = null;
            console.log(`Servidor: Conexão WS para aposta ativa do UserID ${closedUserId} invalidada (não será mais usada para msgs diretas).`);
        }
    });
    ws.on('error', (error) => { console.error(`Servidor: Erro no WebSocket (UserID: ${ws.appUserId || 'N/A'}):`, error); });
});