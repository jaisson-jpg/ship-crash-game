// script-firebase.js - Sistema de Jogo Simplificado com Firebase
console.log('script-firebase.js carregado');

// --- Elementos DOM Globais ---
const shipElement = document.getElementById('ship');
const multiplierDisplay = document.getElementById('multiplier');
const statusMessage = document.getElementById('status-message');
const betAmountInput = document.getElementById('betAmount');
const placeBetBtn = document.getElementById('placeBetBtn');
const cashOutBtn = document.getElementById('cashOutBtn');
const playerBalanceSpan = document.getElementById('playerBalance');
const userIdDisplay = document.getElementById('userIdDisplay');
const countdownDisplay = document.getElementById('countdownDisplay');
const gameHistory = document.getElementById('gameHistory');
const betHistoryDiv = document.getElementById('betHistory');
const myPersonalHistoryContainer = document.getElementById('myPersonalHistoryContainer');
const toggleMyHistoryBtn = document.getElementById('toggleMyHistoryBtn');
const halveBetBtn = document.getElementById('halveBetBtn');
const doubleBetBtn = document.getElementById('doubleBetBtn');
const enableAutoCashOut = document.getElementById('enableAutoCashOut');
const autoCashOutMultiplierInput = document.getElementById('autoCashOutMultiplierInput');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const realTimeBetFeedDiv = document.getElementById('realTimeBetFeed');
const gameArea = document.querySelector('.game-area');

// --- Variáveis de Estado do Cliente ---
let userId = null;
let playerFullName = '';
let playerBalance = 0.00;

// --- Variáveis de Estado do Jogo ---
let currentBet = 0;
let lastBetAmountAttempt = 0;
let gameRunning = false;
let gameState = 'CONNECTING';
let currentMultiplier = 1.00;
let historicoApostas = [];
const MAX_PERSONAL_HISTORY_ITEMS = 20;
const MAX_GLOBAL_HISTORY_ITEMS = 15;
const MAX_FEED_ITEMS = 15;
let autoCashOutArmedForCurrentBet = false;
let autoCashOutTargetForCurrentBet = 1.50;
let currentClientRoundId = 0;

// --- Constantes do NAVIO ---
const SHIP_START_BOTTOM_PERCENTAGE = 48;
const SHIP_SINK_TARGET_BOTTOM_PERCENTAGE = -600;
const SHIP_START_LEFT_OFFSET_PX = 10;
let currentShipX = SHIP_START_LEFT_OFFSET_PX;
const SHIP_HORIZONTAL_SPEED_FACTOR = 31.5;

// URL do servidor WebSocket
// URL do WebSocket - FORÇAR Railway
const SOCKET_URL = 'wss://web-production-20fe.up.railway.app';
let socket;

// --- VERIFICAÇÃO DE AUTENTICAÇÃO ---
function checkAuthAndContinue() {
    console.log("GAME.JS: Verificando autenticação...");
    
    // Verificar se o Firebase está carregado
    if (typeof firebase === 'undefined') {
        console.error("GAME.JS: Firebase não está carregado!");
        setTimeout(checkAuthAndContinue, 1000);
        return;
    }
    
    // Verificar se o usuário está logado no Firebase
    const currentUser = firebase.auth().currentUser;
    console.log("GAME.JS: Firebase currentUser:", !!currentUser);
    
    if (currentUser) {
        console.log("GAME.JS: Usuário logado - UID:", currentUser.uid);
        console.log("GAME.JS: Usuário logado - Email:", currentUser.email);
        console.log("GAME.JS: Autenticação verificada via Firebase, continuando...");
        initializeGame();
        return;
    }
    
    // Fallback: verificar localStorage
    console.log("GAME.JS: Firebase não tem usuário, verificando localStorage...");
    
    // Logs detalhados do localStorage
    const authToken = localStorage.getItem('crashGameAuthToken');
    const loggedInUserStr = localStorage.getItem('crashGameLoggedInUser');
    const userId = localStorage.getItem('crashGameUserId');
    const balance = localStorage.getItem('crashGamePlayerBalance');
    
    console.log("GAME.JS: localStorage authToken:", authToken);
    console.log("GAME.JS: localStorage loggedInUserStr:", loggedInUserStr);
    console.log("GAME.JS: localStorage userId:", userId);
    console.log("GAME.JS: localStorage balance:", balance);
    
    console.log("GAME.JS: Todos os dados do localStorage:", {
        authToken: !!authToken,
        loggedInUserStr: !!loggedInUserStr,
        userId: !!userId,
        balance: !!balance
    });
    
    if (authToken && loggedInUserStr) {
        console.log("GAME.JS: Usuário encontrado via localStorage, tentando login automático no Firebase...");
        
        // 🔥 TENTAR FAZER LOGIN AUTOMÁTICO NO FIREBASE
        try {
            const userData = JSON.parse(loggedInUserStr);
            console.log("GAME.JS: Dados do usuário para login automático:", userData);
            
            // Se temos um email salvo, tentar fazer login silencioso
            if (userData.email) {
                console.log("GAME.JS: Tentando login automático com email:", userData.email);
                // Continuar sem Firebase por agora, mas com dados do localStorage
                initializeGameFromLocalStorage();
                return;
            } else {
                console.log("GAME.JS: Sem email para login automático, continuando com localStorage");
                initializeGameFromLocalStorage();
                return;
            }
        } catch (error) {
            console.log("GAME.JS: Erro ao processar dados do localStorage:", error);
            initializeGameFromLocalStorage();
            return;
        }
    }
    
    // Tentar ler dados da URL como fallback
    console.log("GAME.JS: localStorage vazio, tentando ler dados da URL...");
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    const urlFullName = urlParams.get('fullName');
    const urlBalance = urlParams.get('balance');
    const urlRole = urlParams.get('role');
    
    console.log("GAME.JS: Dados da URL:", {
        userId: urlUserId,
        fullName: urlFullName,
        balance: urlBalance,
        role: urlRole
    });
    
    if (urlUserId && urlFullName && urlBalance !== null && urlRole) {
        console.log("GAME.JS: Dados encontrados na URL, salvando no localStorage e continuando...");
        
        // Salvar dados no localStorage
        const gameData = {
            userId: urlUserId,
            fullName: decodeURIComponent(urlFullName),
            balance: parseFloat(urlBalance),
            role: urlRole
        };
        
        localStorage.setItem('crashGameAuthToken', 'authenticated');
        localStorage.setItem('crashGameLoggedInUser', JSON.stringify(gameData));
        localStorage.setItem('crashGameUserId', gameData.userId);
        localStorage.setItem('crashGamePlayerBalance', gameData.balance);
        
        console.log("GAME.JS: Dados salvos no localStorage:", gameData);
        
        initializeGameFromLocalStorage();
        return;
    }
    
    console.log("GAME.JS: Usuário não logado, aguardando...");
    // NÃO REDIRECIONAR - apenas aguardar
    setTimeout(checkAuthAndContinue, 1000);
}

// --- INICIALIZAÇÃO DO JOGO ---
async function initializeGameFromLocalStorage() {
    console.log("GAME.JS: Inicializando jogo a partir do localStorage...");
    
    try {
        const loggedInUserStr = localStorage.getItem('crashGameLoggedInUser');
        if (loggedInUserStr) {
            const loggedInUser = JSON.parse(loggedInUserStr);
            console.log("GAME.JS: Dados do localStorage:", loggedInUser);
            
            userId = loggedInUser.userId.toString();
            playerFullName = loggedInUser.fullName || '';
            playerBalance = parseFloat(localStorage.getItem('crashGamePlayerBalance') || '0.00');
            
            console.log("GAME.JS: Dados iniciais do localStorage:");
            console.log("GAME.JS: - userId:", userId);
            console.log("GAME.JS: - playerFullName:", playerFullName);
            console.log("GAME.JS: - playerBalance (localStorage):", playerBalance);
            
            // 🔥 FORÇAR BUSCA NO FIRESTORE PARA SALDO ATUALIZADO
            console.log("GAME.JS: 🔄 Buscando saldo atualizado no Firestore...");
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                try {
                    const currentUser = firebase.auth().currentUser;
                    const userDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        const firestoreBalance = userData.balance || 0;
                        
                        console.log("GAME.JS: ✅ Saldo atual no Firestore:", firestoreBalance);
                        
                        // Atualizar com saldo do Firestore
                        playerBalance = firestoreBalance;
                        
                        // Atualizar localStorage também
                        localStorage.setItem('crashGamePlayerBalance', playerBalance);
                        
                        console.log("GAME.JS: ✅ Saldo sincronizado do Firestore:", playerBalance);
                    } else {
                        console.log("GAME.JS: ⚠️ Documento do usuário não encontrado no Firestore");
                    }
                } catch (error) {
                    console.log("GAME.JS: ❌ Erro ao buscar saldo do Firestore:", error);
                    console.log("GAME.JS: ⚠️ Usando saldo do localStorage:", playerBalance);
                }
            } else {
                console.log("GAME.JS: ⚠️ Firebase não disponível, usando localStorage");
            }
            
            // Atualiza a exibição do ID/Nome do usuário na UI
            if (userIdDisplay) {
                const displayText = playerFullName ? `Bem-vindo, ${playerFullName}!` : `ID: ${userId}`;
                userIdDisplay.textContent = displayText;
                console.log("GAME.JS: Texto definido no userIdDisplay:", displayText);
            }
            
            console.log("GAME.JS: 🎮 Dados finais para o jogo:");
            console.log("GAME.JS: - userId:", userId);
            console.log("GAME.JS: - playerFullName:", playerFullName);
            console.log("GAME.JS: - playerBalance (final):", playerBalance);
            
            // Inicializar componentes do jogo
            await updateBalanceDisplay();
            carregarHistoricoPessoal();
            connectWebSocket();
            updateUIState();
            
            // Iniciar atualização automática de saldo
            startBalanceAutoUpdate();
            
            console.log("GAME.JS: ✅ Jogo inicializado com sucesso!");
        } else {
            console.error("GAME.JS: Dados do usuário não encontrados no localStorage!");
        }
    } catch(e) {
        console.error("GAME.JS: Erro ao inicializar via localStorage:", e);
    }
}

function initializeGame() {
    console.log("GAME.JS: Inicializando jogo...");
    
    // Verificar se o Firebase está carregado
    if (typeof firebase === 'undefined') {
        console.error("GAME.JS: Firebase não está carregado na inicialização!");
        return;
    }
    
    // Obter dados do usuário do Firebase
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        console.error("GAME.JS: Usuário não encontrado no Firebase!");
        return;
    }
    
    // Buscar dados do usuário no Firestore
    firebase.firestore().collection('users').doc(currentUser.uid).get()
        .then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                console.log("GAME.JS: Dados do usuário no Firestore:", userData);
                
                // Definir dados do usuário
                userId = userData.numericId || currentUser.uid;
                playerFullName = userData.fullName || '';
                playerBalance = userData.balance || 0;
                
                console.log("GAME.JS: Dados do usuário definidos:");
                console.log("GAME.JS: - userId:", userId);
                console.log("GAME.JS: - playerFullName:", playerFullName);
                console.log("GAME.JS: - playerBalance:", playerBalance);
                
                // Atualizar localStorage com dados do Firestore
                localStorage.setItem('crashGameUserId', userId.toString());
                localStorage.setItem('crashGamePlayerBalance', playerBalance.toString());
                localStorage.setItem('crashGameAuthToken', 'authenticated');
                localStorage.setItem('crashGameLoggedInUser', JSON.stringify({
                    userId: userId,
                    fullName: playerFullName,
                    balance: playerBalance,
                    role: userData.role || 'player'
                }));
                
                // Atualiza a exibição do ID/Nome do usuário na UI
                console.log("GAME.JS: Verificando elementos DOM:");
                console.log("GAME.JS: - userIdDisplay existe:", !!userIdDisplay);
                console.log("GAME.JS: - playerBalanceSpan existe:", !!playerBalanceSpan);
                
                if (userIdDisplay) {
                    const displayText = playerFullName ? `Bem-vindo, ${playerFullName}!` : `ID: ${userId}`;
                    userIdDisplay.textContent = displayText;
                    console.log("GAME.JS: Texto definido no userIdDisplay:", displayText);
                } else {
                    console.error("GAME.JS: userIdDisplay não encontrado!");
                    // Tentar encontrar o elemento novamente
                    const userDisplayElement = document.getElementById('userIdDisplay');
                    if (userDisplayElement) {
                        const displayText = playerFullName ? `Bem-vindo, ${playerFullName}!` : `ID: ${userId}`;
                        userDisplayElement.textContent = displayText;
                        console.log("GAME.JS: Texto definido no userIdDisplay (segunda tentativa):", displayText);
                    } else {
                        console.error("GAME.JS: Elemento userIdDisplay não encontrado mesmo na segunda tentativa!");
                    }
                }
                
                console.log("GAME.JS: Jogo inicializado com sucesso");
                
                // Inicializar componentes do jogo
                updateBalanceDisplay();
                carregarHistoricoPessoal();
                connectWebSocket();
                updateUIState();
                
                // Iniciar atualização automática de saldo
                startBalanceAutoUpdate();
                
                // Verificação final dos dados exibidos
                setTimeout(() => {
                    console.log("GAME.JS: Verificação final dos dados exibidos:");
                    const finalUserDisplay = document.getElementById('userIdDisplay');
                    const finalBalanceDisplay = document.getElementById('playerBalance');
                    
                    if (finalUserDisplay) {
                        console.log("GAME.JS: Texto final no userIdDisplay:", finalUserDisplay.textContent);
                    }
                    if (finalBalanceDisplay) {
                        console.log("GAME.JS: Texto final no playerBalance:", finalBalanceDisplay.textContent);
                    }
                }, 1000);
            } else {
                console.error("GAME.JS: Dados do usuário não encontrados no Firestore!");
            }
        })
        .catch((error) => {
            console.error("GAME.JS: Erro ao buscar dados do usuário:", error);
        });
}

// --- ATUALIZAÇÃO DE SALDO EM TEMPO REAL ---
async function forceBalanceUpdateFromFirestore() {
    console.log("GAME.JS: 🔄 Forçando atualização de saldo do Firestore...");
    
    // Verificar se Firebase está disponível
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.log("GAME.JS: ❌ Firebase não disponível");
        return false;
    }
    
    // 🔥 PRIMEIRO: Tentar com usuário autenticado
    if (firebase.auth && firebase.auth().currentUser) {
        console.log("GAME.JS: ✅ Usuário autenticado encontrado, buscando no Firestore...");
        try {
            const currentUser = firebase.auth().currentUser;
            const userDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const newBalance = userData.balance || 0;
                
                console.log("GAME.JS: 💰 Saldo atual no Firestore:", newBalance);
                console.log("GAME.JS: 💰 Saldo antigo no jogo:", playerBalance);
                
                if (newBalance !== playerBalance) {
                    playerBalance = newBalance;
                    localStorage.setItem('crashGamePlayerBalance', playerBalance);
                    console.log("GAME.JS: ✅ Saldo atualizado para:", playerBalance);
                    
                    // Atualizar display imediatamente
                    await updateBalanceDisplay();
                    return true;
                } else {
                    console.log("GAME.JS: ℹ️ Saldo já está sincronizado");
                    return false;
                }
            }
        } catch (error) {
            console.error("GAME.JS: ❌ Erro ao buscar saldo com usuário autenticado:", error);
        }
    }
    
    // 🔥 SEGUNDO: Tentar buscar por numericId se temos localStorage
    const loggedInUserStr = localStorage.getItem('crashGameLoggedInUser');
    if (loggedInUserStr) {
        try {
            const userData = JSON.parse(loggedInUserStr);
            const numericId = userData.userId;
            
            console.log("GAME.JS: ⚡ Tentando buscar por numericId:", numericId);
            
            // Buscar usuário pelo numericId
            const usersQuery = await firebase.firestore().collection('users')
                .where('numericId', '==', parseInt(numericId))
                .limit(1)
                .get();
            
            if (!usersQuery.empty) {
                const userDoc = usersQuery.docs[0];
                const firestoreData = userDoc.data();
                const newBalance = firestoreData.balance || 0;
                
                console.log("GAME.JS: 💰 Saldo encontrado por numericId:", newBalance);
                console.log("GAME.JS: 💰 Saldo antigo no jogo:", playerBalance);
                
                if (newBalance !== playerBalance) {
                    playerBalance = newBalance;
                    localStorage.setItem('crashGamePlayerBalance', playerBalance);
                    console.log("GAME.JS: ✅ Saldo atualizado via numericId para:", playerBalance);
                    
                    // Atualizar display imediatamente
                    await updateBalanceDisplay();
                    return true;
                } else {
                    console.log("GAME.JS: ℹ️ Saldo já está sincronizado (via numericId)");
                    return false;
                }
            } else {
                console.log("GAME.JS: ❌ Usuário não encontrado por numericId:", numericId);
            }
        } catch (error) {
            console.error("GAME.JS: ❌ Erro ao buscar saldo por numericId:", error);
        }
    }
    
    console.log("GAME.JS: ❌ Não foi possível atualizar saldo do Firestore");
    return false;
}

// --- FUNÇÕES DE UI ---
async function updateBalanceDisplay() {
    console.log("GAME.JS: updateBalanceDisplay() chamada");
    console.log("GAME.JS: Saldo atual:", playerBalance);
    
    console.log("GAME.JS: - playerBalanceSpan existe:", !!playerBalanceSpan);
    console.log("GAME.JS: - playerBalance:", playerBalance);
    
    // Tentar múltiplos elementos
    const balanceElements = [
        playerBalanceSpan,
        document.getElementById('playerBalance'),
        document.querySelector('#playerBalance'),
        document.querySelector('.balance'),
        document.querySelector('[data-balance]')
    ];
    
    let updated = false;
    for (const element of balanceElements) {
        if (element) {
            const balanceText = playerBalance.toFixed(2);
            element.textContent = balanceText;
            console.log("GAME.JS: Saldo atualizado no DOM:", balanceText);
            updated = true;
            break;
        }
    }
    
    if (!updated) {
        console.error("GAME.JS: Nenhum elemento de saldo encontrado!");
    }
}

function resetShipPositionAndAppearance() {
    if (!shipElement) return;

    currentShipX = SHIP_START_LEFT_OFFSET_PX;
    shipElement.classList.remove('sinking');
    shipElement.style.opacity = '1';
    shipElement.style.bottom = `${SHIP_START_BOTTOM_PERCENTAGE}%`;
    shipElement.style.transition = 'transform 0.1s linear, bottom 0.8s ease-in-out, opacity 0.8s ease-in-out';
    shipElement.style.transform = `translateX(0px) rotate(0deg)`;
}

function updateUIState() {
    const elementsExist = statusMessage && multiplierDisplay && countdownDisplay && shipElement &&
                          placeBetBtn && cashOutBtn && betAmountInput && halveBetBtn &&
                          doubleBetBtn && enableAutoCashOut && autoCashOutMultiplierInput;

    if (!elementsExist) {
        console.warn("GAME.JS: Nem todos os elementos DOM necessários para updateUIState foram encontrados.");
        return;
    }

    const canBet = (gameState === 'WAITING_TO_START' && !gameRunning);
    const roundIsOngoing = (gameState === 'ROUND_ACTIVE');

    // Habilita/Desabilita controles de aposta
    placeBetBtn.disabled = !canBet;
    betAmountInput.disabled = !canBet;
    halveBetBtn.disabled = !canBet;
    doubleBetBtn.disabled = !canBet;
    enableAutoCashOut.disabled = !canBet;
    autoCashOutMultiplierInput.disabled = !canBet || (enableAutoCashOut.checked ? false : true);

    // Habilita/Desabilita botão de Saque
    cashOutBtn.disabled = !(gameRunning && roundIsOngoing);

    if (gameState === 'WAITING_TO_START') {
        if(!statusMessage.textContent.toLowerCase().includes("próxima rodada em")) {
            statusMessage.textContent = 'Aguardando próxima rodada...';
        }
        multiplierDisplay.textContent = '1.00x';
        multiplierDisplay.className = 'multiplier m-white';
        countdownDisplay.style.display = 'block';
        resetShipPositionAndAppearance();
        if (!gameRunning && cashOutBtn) {
             cashOutBtn.textContent = 'Sair (0.00)';
        }
    } else if (roundIsOngoing) {
        statusMessage.textContent = 'Navio navegando...';
        countdownDisplay.style.display = 'none';
    } else if (gameState === 'ROUND_CRASHED') {
        countdownDisplay.style.display = 'none';
        if (cashOutBtn) {
            if (gameRunning) {
                 cashOutBtn.textContent = 'Afundou!';
            } else if (currentBet > 0 && cashOutBtn.textContent.startsWith("Sacado")) {
                // Mantém "Sacado" se o jogador já havia sacado nesta rodada
            } else {
                 cashOutBtn.textContent = 'Afundou!';
            }
        }
    }
    updateMultiplierDisplay();
}

function updateMultiplierDisplay() {
    // Tentar múltiplos elementos do multiplicador
    const multiplierElements = [
        multiplierDisplay,
        document.getElementById('multiplier'),
        document.querySelector('.multiplier'),
        document.querySelector('[data-multiplier]')
    ];
    
    let updated = false;
    for (const element of multiplierElements) {
        if (element) {
            element.textContent = `${currentMultiplier.toFixed(2)}x`;
            element.className = 'multiplier';

            if (currentMultiplier < 2.0) { element.classList.add('m-white'); }
            else if (currentMultiplier < 10) { element.classList.add('m-green'); }
            else if (currentMultiplier < 100) { element.classList.add('m-yellow'); }
            else { element.classList.add('m-gold'); }
            
            updated = true;
            break;
        }
    }
    
    if (!updated) {
        console.error("GAME.JS: Nenhum elemento de multiplicador encontrado!");
    }

    // Atualizar botão de cash out
    if (gameRunning && gameState === 'ROUND_ACTIVE' && cashOutBtn) {
        cashOutBtn.textContent = `Sair (R$ ${(currentBet * currentMultiplier).toFixed(2)})`;
    }
    
    // Log para debug
    console.log(`GAME.JS: Multiplicador exibido: ${currentMultiplier.toFixed(2)}x`);
}

// --- HISTÓRICO ---
function populateGlobalHistory(historyArray) {
    if (!gameHistory || !Array.isArray(historyArray)) return;
    gameHistory.innerHTML = '';

    historyArray.slice(0, MAX_GLOBAL_HISTORY_ITEMS).forEach(histItemData => {
        const itemElement = document.createElement('div');
        // Usar crashPoint em vez de multiplier
        const multiplier = histItemData.crashPoint || histItemData.multiplier || 0;
        itemElement.textContent = multiplier.toFixed(2) + 'x';
        itemElement.classList.add('history-item');

        if (multiplier < 1.01) { itemElement.classList.add('red'); }
        else if (multiplier < 2.0) { itemElement.classList.add('white'); }
        else if (multiplier < 10) { itemElement.classList.add('green'); }
        else if (multiplier < 100) { itemElement.classList.add('m-yellow'); }
        else { itemElement.classList.add('m-gold'); }

        gameHistory.appendChild(itemElement);
    });
}

function adicionarApostaAoHistorico(aposta, multiplicadorResultado, vitoria) {
    if (aposta <= 0 && vitoria <= 0 && multiplicadorResultado < 1.01 && gameState === 'ROUND_CRASHED' && !gameRunning && currentBet === 0 && lastBetAmountAttempt === 0) {
        return;
    }

    historicoApostas.unshift({
        aposta: parseFloat(aposta.toFixed(2)),
        multiplicador: parseFloat(multiplicadorResultado.toFixed(2)),
        vitoria: parseFloat(vitoria.toFixed(2))
    });

    if (historicoApostas.length > MAX_PERSONAL_HISTORY_ITEMS) {
        historicoApostas.pop();
    }

    try {
        if(userId && !userId.startsWith('Visitante')) {
            localStorage.setItem(`crashGamePersonalHistory_${userId}`, JSON.stringify(historicoApostas));
        }
    } catch(e) {
        console.error("Erro ao salvar histórico pessoal:", e);
    }
    atualizarHistoricoNaTela();
}

function carregarHistoricoPessoal() {
    if (userId && !userId.startsWith('Visitante')) {
        try {
            const savedHistory = localStorage.getItem(`crashGamePersonalHistory_${userId}`);
            if (savedHistory) {
                historicoApostas = JSON.parse(savedHistory);
                atualizarHistoricoNaTela();
            }
        } catch (e) {
            console.error("Erro ao carregar histórico pessoal do localStorage:", e);
            historicoApostas = [];
        }
    }
}

function atualizarHistoricoNaTela() {
    if (!betHistoryDiv) return;
    betHistoryDiv.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'personal-historico-header';
    header.innerHTML = `<span>APOSTA</span><span>RESULTADO</span>`;
    betHistoryDiv.appendChild(header);

    historicoApostas.forEach(item => {
        const row = document.createElement('div');
        row.className = 'personal-history-item';

        const apostaSpan = document.createElement('span');
        apostaSpan.textContent = `R$ ${item.aposta.toFixed(2)}`;

        const resultadoSpan = document.createElement('span');
        if (item.vitoria > 0) {
            resultadoSpan.textContent = `R$ ${item.vitoria.toFixed(2)} (${item.multiplicador.toFixed(2)}x)`;
            resultadoSpan.className = 'win';
        } else {
            resultadoSpan.textContent = `Afundou @ ${item.multiplicador.toFixed(2)}x`;
            resultadoSpan.className = 'loss';
        }
        row.appendChild(apostaSpan);
        row.appendChild(resultadoSpan);
        betHistoryDiv.appendChild(row);
    });
}

// --- WEBSOCKET ---
function connectWebSocket() {
    console.log("GAME.JS: === DEBUG WEBSOCKET ===");
    console.log("GAME.JS: window.location.hostname:", window.location.hostname);
    console.log("GAME.JS: window.location.href:", window.location.href);
    console.log("GAME.JS: includes railway.app?", window.location.hostname.includes('railway.app'));
    console.log("GAME.JS: SOCKET_URL final:", SOCKET_URL);
    console.log("GAME.JS: ========================");
    socket = new WebSocket(SOCKET_URL);
    
    const connectionTimeout = setTimeout(() => {
        console.log("GAME.JS: Timeout na conexão WebSocket após 10 segundos");
        if (statusMessage) statusMessage.textContent = 'Erro de conexão com o servidor';
    }, 10000);

    socket.onopen = () => {
        console.log('GAME.JS: CONEXÃO WEBSOCKET ABERTA!');
        clearTimeout(connectionTimeout);
        if (statusMessage) statusMessage.textContent = 'Conectado ao Jogo!';
        if (userId && !userId.startsWith('Visitante')) {
             socket.send(JSON.stringify({ type: 'client_ready_with_id', userId: userId }));
        }
    };
    
    socket.onerror = (error) => {
        console.log('GAME.JS: ERRO NA CONEXÃO WEBSOCKET:', error);
        if (statusMessage) statusMessage.textContent = 'Erro de conexão com o servidor';
    };
    
    socket.onclose = (event) => {
        console.log('GAME.JS: CONEXÃO WEBSOCKET FECHADA:', event.code, event.reason);
        if (statusMessage) statusMessage.textContent = 'Conexão perdida com o servidor';
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.history && Array.isArray(data.history) && gameHistory) {
                populateGlobalHistory(data.history);
            }

            if (data.roundId) {
                if (data.roundId !== currentClientRoundId && (data.type === 'waiting' || data.type === 'countdown')) {
                    console.log(`CLIENTE: Nova rodada ${data.roundId} detectada. Limpando feed.`);
                    if (realTimeBetFeedDiv) realTimeBetFeedDiv.innerHTML = '';
                }
                currentClientRoundId = data.roundId;
            }

            switch (data.type) {
                case 'waiting':
                case 'countdown':
                    gameState = 'WAITING_TO_START';
                    currentMultiplier = 1.00;
                    if (placeBetBtn && placeBetBtn.disabled && !gameRunning) {
                        lastBetAmountAttempt = 0;
                    }
                    updateUIState();
                    if (data.timeLeft !== undefined && countdownDisplay) {
                        const timeString = Number.isInteger(data.timeLeft) ? data.timeLeft.toString() : data.timeLeft.toFixed(0);
                        countdownDisplay.innerHTML = `<span class="countdown-text-white">Próxima rodada em </span><span class="countdown-number-yellow">${timeString}</span><span class="countdown-text-white">s...</span>`;
                        countdownDisplay.style.display = 'block';
                    }
                    break;
                case 'round_start':
                    gameState = 'ROUND_ACTIVE';
                    currentMultiplier = 1.00;
                    if(countdownDisplay) countdownDisplay.style.display = 'none';

                    resetShipPositionAndAppearance();
                    currentShipX = SHIP_START_LEFT_OFFSET_PX;
                    if(shipElement) {
                        shipElement.style.transform = `translateX(0px) rotate(0deg)`;
                    }

                    updateUIState();
                    updateMultiplierDisplay();
                    if(statusMessage) statusMessage.textContent = 'Navio navegando...';
                    break;
                case 'multiplier_update':
                    // Sempre atualizar o multiplicador quando receber do servidor
                    currentMultiplier = data.multiplier;
                    gameState = 'ROUND_ACTIVE'; // Garantir que está no estado ativo
                    
                    // Atualizar display do multiplicador
                    updateMultiplierDisplay();
                    
                    // Atualizar posição do navio
                    if (shipElement && gameArea) {
                        const gameAreaWidth = gameArea.offsetWidth;
                        const shipWidth = shipElement.offsetWidth;
                        let targetX = (currentMultiplier - 1) * SHIP_HORIZONTAL_SPEED_FACTOR;

                        const maxShipX = gameAreaWidth - shipWidth - SHIP_START_LEFT_OFFSET_PX - 10;
                        currentShipX = Math.min(targetX, maxShipX);

                        shipElement.style.transform = `translateX(${currentShipX}px) rotate(0deg)`;
                        
                        // Remover classe de afundamento se existir
                        shipElement.classList.remove('sinking');
                    }
                    
                    // Log para debug
                    console.log(`GAME.JS: Multiplicador atualizado para ${currentMultiplier.toFixed(2)}x`);
                    break;
                case 'crash':
                    gameState = 'ROUND_CRASHED';
                    currentMultiplier = data.multiplier;

                    if (shipElement) {
                        shipElement.classList.add('sinking');
                        shipElement.style.bottom = `${SHIP_SINK_TARGET_BOTTOM_PERCENTAGE}%`;
                    }

                    if (gameRunning) {
                        // A mensagem 'bet_lost_due_to_crash' tratará o histórico e a mensagem principal para este jogador
                    } else if (lastBetAmountAttempt > 0 && statusMessage && !statusMessage.textContent.includes("Sacado")) {
                        if(statusMessage) statusMessage.textContent = `💥 Navio Afundou @ ${currentMultiplier.toFixed(2)}x!`;
                    } else if (statusMessage && !statusMessage.textContent.includes("Sacado")) {
                        statusMessage.textContent = `💥 Navio Afundou @ ${currentMultiplier.toFixed(2)}x!`;
                    }
                    updateUIState();
                    if(multiplierDisplay) multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`;
                    if(cashOutBtn) cashOutBtn.disabled = true;

                    gameRunning = false;
                    currentBet = 0;
                    lastBetAmountAttempt = 0;
                    autoCashOutArmedForCurrentBet = false;
                    break;
                case 'bet_lost_due_to_crash':
                    if (userId && userId.toString() === data.userId?.toString()) {
                        adicionarApostaAoHistorico(data.betAmount, data.crashPoint, 0);
                        if (statusMessage) statusMessage.textContent = `💥 Navio Afundou @ ${data.crashPoint.toFixed(2)}x! Você perdeu R$ ${data.betAmount.toFixed(2)}`;
                        gameRunning = false;
                        currentBet = 0;
                        autoCashOutArmedForCurrentBet = false;
                        updateUIState();
                    }
                    break;
                case 'bet_accepted':
                    playerBalance = data.newBalance;
                    currentBet = data.betAmount;
                    lastBetAmountAttempt = 0;
                    localStorage.setItem('crashGamePlayerBalance', playerBalance.toString());
                    updateBalanceDisplay();
                    gameRunning = true;
                    if (data.autoCashOutTarget) {
                        autoCashOutArmedForCurrentBet = true;
                        autoCashOutTargetForCurrentBet = data.autoCashOutTarget;
                        if (statusMessage) statusMessage.textContent = `✅ Aposta de R$ ${currentBet.toFixed(2)} ACEITA! (Auto @ ${autoCashOutTargetForCurrentBet.toFixed(2)}x)`;
                    } else {
                        autoCashOutArmedForCurrentBet = false;
                        if (statusMessage) statusMessage.textContent = `✅ Aposta de R$ ${currentBet.toFixed(2)} ACEITA!`;
                    }
                    updateUIState();
                    break;
                case 'bet_rejected':
                    if (statusMessage) statusMessage.textContent = `❌ Aposta Rejeitada: ${data.reason}`;
                    lastBetAmountAttempt = 0;
                    autoCashOutArmedForCurrentBet = false;
                    if (gameState === 'WAITING_TO_START' && !gameRunning) {
                        if(placeBetBtn) placeBetBtn.disabled = false;
                        if(betAmountInput) betAmountInput.disabled = false;
                        if(halveBetBtn) halveBetBtn.disabled = false;
                        if(doubleBetBtn) doubleBetBtn.disabled = false;
                        if(enableAutoCashOut) enableAutoCashOut.disabled = false;
                        if(autoCashOutMultiplierInput && enableAutoCashOut) autoCashOutMultiplierInput.disabled = !enableAutoCashOut.checked;
                    }
                    break;
                case 'cash_out_success':
                    clientSideOnCashOutSuccess(data.multiplier, data.winnings, data.newBalance, data.isAuto);
                    break;
                case 'cash_out_failed':
                     if (statusMessage) statusMessage.textContent = `❌ Saque Falhou: ${data.reason}`;
                     if (['rodada_encerrada', 'ja_crashou_ou_crasharia_antes', 'saque_tardio_crash_iminente', 'rodada_nao_ativa', 'saque_tardio_crash_ocorreu'].includes(data.reason) ) {
                          if (cashOutBtn) cashOutBtn.disabled = true;
                          gameRunning = false;
                     } else if (gameRunning && gameState === 'ROUND_ACTIVE' && cashOutBtn) {
                          cashOutBtn.disabled = false;
                     }
                    break;
                case 'balance_update_from_server':
                    playerBalance = data.newBalance;
                    localStorage.setItem('crashGamePlayerBalance', playerBalance.toString());
                    updateBalanceDisplay();
                    break;
            }
        } catch (error) {
            console.error("CLIENTE: Erro ao processar mensagem do servidor:", error, "Dados brutos:", event.data);
        }
    };
}

// --- FUNÇÕES DE CASHOUT ---
function clientSideOnCashOutSuccess(multiplier, winnings, newBalance, isAuto) {
    console.log(`CLIENTE: clientSideOnCashOutSuccess - Saldo Anterior Local: ${playerBalance}, Ganhos: ${winnings}, Novo Saldo Servidor: ${newBalance}`);
    playerBalance = newBalance;
    localStorage.setItem('crashGamePlayerBalance', playerBalance.toString());
    updateBalanceDisplay();
    adicionarApostaAoHistorico(currentBet, multiplier, winnings);
    gameRunning = false;
    autoCashOutArmedForCurrentBet = false;
    const statusMsgText = isAuto ? `✅ Auto Saque @ ${multiplier.toFixed(2)}x!` : `✅ Você saiu @ ${multiplier.toFixed(2)}x!`;
    if (statusMessage) statusMessage.textContent = `${statusMsgText} Ganhou R$ ${winnings.toFixed(2)}`;
    if (cashOutBtn) {
        cashOutBtn.disabled = true;
        cashOutBtn.textContent = isAuto ? `Auto Sacado @ ${multiplier.toFixed(2)}x` : `Sacado @ ${multiplier.toFixed(2)}x`;
    }
    currentBet = 0;
    updateUIState();
}

// --- EVENT LISTENERS ---
if (placeBetBtn && betAmountInput) {
    placeBetBtn.addEventListener('click', () => {
        if (gameState !== 'WAITING_TO_START' || gameRunning) {
            console.log("CLIENTE: Tentativa de aposta bloqueada. Estado:", gameState, "GameRunning:", gameRunning);
            return;
        }

        lastBetAmountAttempt = parseFloat(betAmountInput.value);
        if (isNaN(lastBetAmountAttempt) || lastBetAmountAttempt <= 0) {
            if(statusMessage) { statusMessage.textContent = "Valor da aposta inválido!";}
            return;
        }
        if (lastBetAmountAttempt > playerBalance) {
            if(statusMessage) statusMessage.textContent = "Saldo insuficiente!";
            return;
        }

        let autoTargetValue = null;
        if (enableAutoCashOut && enableAutoCashOut.checked) {
            const target = parseFloat(autoCashOutMultiplierInput.value);
            if (!isNaN(target) && target >= 1.01) {
                autoTargetValue = target;
            } else {
                if (statusMessage) statusMessage.textContent = "Multiplicador de Auto-Saque inválido! (mín. 1.01x)";
                return;
            }
        }

        socket.send(JSON.stringify({
            type: 'place_bet',
            userId: userId,
            amount: lastBetAmountAttempt,
            autoCashOut: autoTargetValue
        }));

        if(statusMessage) statusMessage.textContent = "Aguardando confirmação da aposta...";
        placeBetBtn.disabled = true;
        betAmountInput.disabled = true;
        halveBetBtn.disabled = true;
        doubleBetBtn.disabled = true;
        enableAutoCashOut.disabled = true;
        autoCashOutMultiplierInput.disabled = true;
    });
}

if (cashOutBtn) {
    cashOutBtn.addEventListener('click', () => {
        if (gameRunning && gameState === 'ROUND_ACTIVE' && currentBet > 0) {
            socket.send(JSON.stringify({ type: 'cash_out', userId: userId }));
            if (statusMessage) statusMessage.textContent = "Solicitando saque...";
            cashOutBtn.disabled = true;
        } else {
            console.warn("CLIENTE: Tentativa de saque bloqueada. Jogo não está rodando ou sem aposta ativa.");
        }
    });
}

if (halveBetBtn && betAmountInput) {
    halveBetBtn.addEventListener('click', () => {
        if (!betAmountInput.disabled) {
            let currentVal = parseFloat(betAmountInput.value);
            if (isNaN(currentVal)) currentVal = 0;
            betAmountInput.value = (currentVal / 2).toFixed(2);
        }
    });
}

if (doubleBetBtn && betAmountInput) {
    doubleBetBtn.addEventListener('click', () => {
        if (!betAmountInput.disabled) {
            let currentVal = parseFloat(betAmountInput.value);
            if (isNaN(currentVal)) currentVal = 0;
            betAmountInput.value = (currentVal * 2).toFixed(2);
        }
    });
}

if (enableAutoCashOut && autoCashOutMultiplierInput) {
    enableAutoCashOut.addEventListener('change', () => {
        autoCashOutMultiplierInput.disabled = !(enableAutoCashOut.checked && gameState === 'WAITING_TO_START' && !gameRunning);
    });
}

if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

if (toggleMyHistoryBtn && myPersonalHistoryContainer) {
    toggleMyHistoryBtn.addEventListener('click', () => {
        if (myPersonalHistoryContainer.style.display === 'none') {
            myPersonalHistoryContainer.style.display = 'block';
            toggleMyHistoryBtn.textContent = 'Ocultar Meu Histórico';
        } else {
            myPersonalHistoryContainer.style.display = 'none';
            toggleMyHistoryBtn.textContent = 'Meu Histórico';
        }
    });
}

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("GAME.JS: DOMContentLoaded disparado.");
    console.log("GAME.JS: Verificando elementos DOM...");
    
    // Verificar se os elementos DOM existem
    const requiredElements = [
        'userIdDisplay',
        'playerBalance',
        'ship',
        'multiplier',
        'betAmount',
        'placeBetBtn',
        'cashOutBtn'
    ];
    
    const missingElements = [];
    for (const elementId of requiredElements) {
        const element = document.getElementById(elementId);
        if (!element) {
            missingElements.push(elementId);
            console.error(`GAME.JS: Elemento ${elementId} não encontrado!`);
        } else {
            console.log(`GAME.JS: Elemento ${elementId} encontrado.`);
        }
    }
    
    if (missingElements.length > 0) {
        console.error(`GAME.JS: Elementos faltando: ${missingElements.join(', ')}`);
        console.error("GAME.JS: Isso pode causar problemas na exibição dos dados!");
    }
    
    console.log("GAME.JS: Aguardando 2 segundos antes de verificar autenticação...");
    setTimeout(() => {
        checkAuthAndContinue();
    }, 2000);
});

// --- ATUALIZAÇÃO AUTOMÁTICA DE SALDO ---
let balanceUpdateInterval;

function startBalanceAutoUpdate() {
    console.log("GAME.JS: 🔄 Iniciando atualização automática de saldo (a cada 10s)");
    
    // Limpar intervalo existente se houver
    if (balanceUpdateInterval) {
        clearInterval(balanceUpdateInterval);
    }
    
    // Configurar novo intervalo
    balanceUpdateInterval = setInterval(async () => {
        console.log("GAME.JS: 🔄 Atualização automática de saldo...");
        const updated = await forceBalanceUpdateFromFirestore();
        if (updated) {
            console.log("GAME.JS: ✅ Saldo atualizado automaticamente!");
        }
    }, 10000); // 10 segundos
}

function stopBalanceAutoUpdate() {
    if (balanceUpdateInterval) {
        clearInterval(balanceUpdateInterval);
        balanceUpdateInterval = null;
        console.log("GAME.JS: ⏹️ Atualização automática de saldo parada");
    }
}

// Iniciar atualização automática quando o script carrega
setTimeout(() => {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        startBalanceAutoUpdate();
    }
}, 5000); // Aguardar 5 segundos para garantir que tudo esteja carregado

console.log('script-firebase.js: Script carregado'); 
console.log('script-firebase.js: Script carregado'); 