// js/script.js - Lógica do Jogo "Aventura Marítima" com WebSocket

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
const gameArea = document.querySelector('.game-area'); // Para obter a largura da área de jogo

// --- Chaves do LocalStorage ---
const authTokenKeyGame = 'crashGameAuthToken';
const loggedInUserKeyGame = 'crashGameLoggedInUser'; // Armazena objeto { userId, fullName }
const userIdKey = 'crashGameUserId'; // Armazena apenas o userId, por conveniência
const balanceKey = 'crashGamePlayerBalance'; // Armazena o saldo do jogador

// --- VERIFICAÇÃO DE LOGIN (CRÍTICO: Executa antes de tudo) ---
// Função para verificar autenticação com Firebase
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
    
    // Fallback: verificar localStorage se Firebase não estiver funcionando
    console.log("GAME.JS: Firebase não tem usuário, verificando localStorage...");
    const authToken = localStorage.getItem('crashGameAuthToken');
    const loggedInUserStr = localStorage.getItem('crashGameLoggedInUser');
    
    console.log("GAME.JS: localStorage authToken:", !!authToken);
    console.log("GAME.JS: localStorage loggedInUserStr:", !!loggedInUserStr);
    
    if (authToken && loggedInUserStr) {
        console.log("GAME.JS: Usuário encontrado via localStorage, continuando...");
        initializeGameFromLocalStorage();
        return;
    }
    
    if (!window.location.pathname.endsWith('index.html')) {
        console.log("GAME.JS: Usuário não logado, redirecionando para index.html");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Se estamos em index.html, aguardar um pouco e tentar novamente
    console.log("GAME.JS: Aguardando autenticação...");
    setTimeout(checkAuthAndContinue, 1000);
}

// Função para inicializar o jogo a partir do localStorage (fallback)
function initializeGameFromLocalStorage() {
    console.log("GAME.JS: Inicializando jogo a partir do localStorage...");
    
    try {
        const loggedInUserStr = localStorage.getItem('crashGameLoggedInUser');
        if (loggedInUserStr) {
            const loggedInUser = JSON.parse(loggedInUserStr);
            console.log("GAME.JS: Dados do localStorage:", loggedInUser);
            
            userId = loggedInUser.userId.toString();
            playerFullName = loggedInUser.fullName || '';
            playerBalance = parseFloat(localStorage.getItem('crashGamePlayerBalance') || '0.00');
            
            console.log("GAME.JS: Dados do usuário definidos via localStorage:");
            console.log("GAME.JS: - userId:", userId);
            console.log("GAME.JS: - playerFullName:", playerFullName);
            console.log("GAME.JS: - playerBalance:", playerBalance);
            
            // Atualiza a exibição do ID/Nome do usuário na UI
            if (userIdDisplay) {
                const displayText = playerFullName ? `Bem-vindo, ${playerFullName}!` : `ID: ${userId}`;
                userIdDisplay.textContent = displayText;
                console.log("GAME.JS: Texto definido no userIdDisplay:", displayText);
            }
            
            console.log("GAME.JS: Jogo inicializado com sucesso via localStorage");
            
            // Inicializar componentes do jogo
            updateBalanceDisplay();
            carregarHistoricoPessoal();
            connectWebSocket();
            updateUIState();
        } else {
            console.error("GAME.JS: Dados do usuário não encontrados no localStorage!");
        }
    } catch(e) {
        console.error("GAME.JS: Erro ao inicializar via localStorage:", e);
    }
}

// Função para inicializar o jogo após autenticação verificada
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
                }
                
                console.log("GAME.JS: Jogo inicializado com sucesso");
                
                // Inicializar componentes do jogo
                updateBalanceDisplay(); // Atualiza o saldo inicial
                carregarHistoricoPessoal(); // Carrega o histórico pessoal do jogador
                connectWebSocket(); // Inicia a conexão WebSocket
                updateUIState(); // Define o estado inicial da UI
            } else {
                console.error("GAME.JS: Dados do usuário não encontrados no Firestore!");
            }
        })
        .catch((error) => {
            console.error("GAME.JS: Erro ao buscar dados do usuário:", error);
        });
}

// --- Variáveis de Estado do Cliente ---
let userId = null;
let playerFullName = '';
let playerBalance = 0.00;

// Verificar se o Firebase está carregado
console.log("GAME.JS: Script carregado");
console.log("GAME.JS: Firebase disponível:", typeof firebase !== 'undefined');
if (typeof firebase !== 'undefined') {
    console.log("GAME.JS: Firebase Auth disponível:", typeof firebase.auth !== 'undefined');
    console.log("GAME.JS: Firebase Firestore disponível:", typeof firebase.firestore !== 'undefined');
}

// Variáveis de estado do jogo
let currentBet = 0;
let lastBetAmountAttempt = 0; // Guarda a última aposta tentada, mesmo que rejeitada
let gameRunning = false; // Indica se o jogo está ativo para ESTE jogador (ele fez uma aposta)
let gameState = 'CONNECTING'; // Estados: 'CONNECTING', 'WAITING_TO_START', 'ROUND_ACTIVE', 'ROUND_CRASHED'
let currentMultiplier = 1.00;
let historicoApostas = []; // Histórico de apostas pessoais
const MAX_PERSONAL_HISTORY_ITEMS = 20;
const MAX_GLOBAL_HISTORY_ITEMS = 15;
const MAX_FEED_ITEMS = 15;
let autoCashOutArmedForCurrentBet = false; // Se o auto-saque está ativado para a aposta atual
let autoCashOutTargetForCurrentBet = 1.50; // Multiplicador alvo para o auto-saque
let currentClientRoundId = 0; // ID da rodada atual, para gerenciar o feed de apostas

// --- Constantes e Variáveis do NAVIO (Animação) ---
const SHIP_START_BOTTOM_PERCENTAGE = 48; // % da altura da gameArea, na linha d'água
const SHIP_SINK_TARGET_BOTTOM_PERCENTAGE = -600; // % para onde o navio afunda (para desaparecer)
const SHIP_START_LEFT_OFFSET_PX = 10; // Posição X inicial em pixels (para translateX)
let currentShipX = SHIP_START_LEFT_OFFSET_PX; // Posição X atual do navio
const SHIP_HORIZONTAL_SPEED_FACTOR = 31.5; // Ajuste para controlar a velocidade horizontal do navio com o multiplicador

// URL do servidor WebSocket (VERIFIQUE SEU IP/PORTA)
const SOCKET_URL = 'ws://192.168.100.45:3000';
let socket;

// --- DEFINIÇÃO DAS FUNÇÕES ---

/**
 * Atualiza a exibição do saldo do jogador na UI.
 */
function updateBalanceDisplay() {
    console.log("GAME.JS: updateBalanceDisplay() chamada");
    console.log("GAME.JS: - playerBalanceSpan existe:", !!playerBalanceSpan);
    console.log("GAME.JS: - playerBalance:", playerBalance);
    
    if (playerBalanceSpan) {
        const balanceText = playerBalance.toFixed(2);
        playerBalanceSpan.textContent = balanceText;
        console.log("GAME.JS: Saldo atualizado no DOM:", balanceText);
    } else {
        console.error("GAME.JS: playerBalanceSpan não encontrado!");
    }
}

/**
 * Reseta a posição e a aparência do navio para o estado inicial.
 */
function resetShipPositionAndAppearance() {
    if (!shipElement) return;

    currentShipX = SHIP_START_LEFT_OFFSET_PX; // Reseta a posição X lógica
    shipElement.classList.remove('sinking'); // Remove a classe de afundamento
    shipElement.style.opacity = '1'; // Torna o navio visível
    shipElement.style.bottom = `${SHIP_START_BOTTOM_PERCENTAGE}%`; // Volta à linha d'água
    // A transição deve ser resetada para garantir que o movimento normal seja linear
    // e o afundamento seja 'ease-in' (controlado pela classe 'sinking' e JS)
    shipElement.style.transition = 'transform 0.1s linear, bottom 0.8s ease-in-out, opacity 0.8s ease-in-out';
    shipElement.style.transform = `translateX(0px) rotate(0deg)`; // Volta à posição e rotação inicial
}

/**
 * Atualiza o estado da interface do usuário (botões, mensagens, etc.)
 * com base no estado atual do jogo.
 */
function updateUIState() {
    // Verifica se todos os elementos DOM necessários existem
    const elementsExist = statusMessage && multiplierDisplay && countdownDisplay && shipElement &&
                          placeBetBtn && cashOutBtn && betAmountInput && halveBetBtn &&
                          doubleBetBtn && enableAutoCashOut && autoCashOutMultiplierInput;

    if (!elementsExist) {
        console.warn("GAME.JS: Nem todos os elementos DOM necessários para updateUIState foram encontrados.");
        return;
    }

    const canBet = (gameState === 'WAITING_TO_START' && !gameRunning); // Pode apostar se esperando e não apostou na rodada
    const roundIsOngoing = (gameState === 'ROUND_ACTIVE'); // Rodada está ativa

    // Habilita/Desabilita controles de aposta
    placeBetBtn.disabled = !canBet;
    betAmountInput.disabled = !canBet;
    halveBetBtn.disabled = !canBet;
    doubleBetBtn.disabled = !canBet;
    enableAutoCashOut.disabled = !canBet;
    // O input de auto-saque só é habilitado se puder apostar E o checkbox estiver marcado
    autoCashOutMultiplierInput.disabled = !canBet || (enableAutoCashOut.checked ? false : true);

    // Habilita/Desabilita botão de Saque
    cashOutBtn.disabled = !(gameRunning && roundIsOngoing); // Só pode sacar se apostou e a rodada está ativa

    if (gameState === 'WAITING_TO_START') {
        // Se a mensagem não contiver o countdown (para evitar sobrescrever), define a mensagem padrão
        if(!statusMessage.textContent.toLowerCase().includes("próxima rodada em")) {
            statusMessage.textContent = 'Aguardando próxima rodada...';
        }
        multiplierDisplay.textContent = '1.00x';
        multiplierDisplay.className = 'multiplier m-white'; // Cor branca para 1.00x
        countdownDisplay.style.display = 'block'; // Mostra o countdown
        resetShipPositionAndAppearance(); // Reseta o navio para a posição inicial
        if (!gameRunning && cashOutBtn) { // Se o cliente não está em jogo, reseta o texto do botão de saque
             cashOutBtn.textContent = 'Sair (0.00)';
        }
    } else if (roundIsOngoing) {
        statusMessage.textContent = 'Navio navegando...'; // Mensagem enquanto o jogo está ativo
        countdownDisplay.style.display = 'none'; // Esconde o countdown
    } else if (gameState === 'ROUND_CRASHED') {
        countdownDisplay.style.display = 'none'; // Esconde o countdown
        if (cashOutBtn) {
            if (gameRunning) { // Se o jogador ainda estava no jogo quando crashou
                 cashOutBtn.textContent = 'Afundou!'; // Botão indica que o navio afundou
            } else if (currentBet > 0 && cashOutBtn.textContent.startsWith("Sacado")) {
                // Mantém "Sacado" se o jogador já havia sacado nesta rodada
            } else {
                 cashOutBtn.textContent = 'Afundou!'; // Estado padrão de afundou
            }
        }
    }
    updateMultiplierDisplay(); // Garante que o multiplicador está sempre atualizado com a cor correta
}

/**
 * Atualiza a exibição do multiplicador e sua cor com base no valor atual.
 */
function updateMultiplierDisplay() {
    if (!multiplierDisplay) return;
    multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`;
    multiplierDisplay.className = 'multiplier'; // Reseta as classes de cor

    // Adiciona a classe de cor com base no multiplicador
    if (currentMultiplier < 2.0) { multiplierDisplay.classList.add('m-white'); }
    else if (currentMultiplier < 10) { multiplierDisplay.classList.add('m-green'); }
    else if (currentMultiplier < 100) { multiplierDisplay.classList.add('m-yellow'); }
    else { multiplierDisplay.classList.add('m-gold'); }

    // Atualiza o texto do botão de saque para mostrar o potencial de ganho
    if (gameRunning && gameState === 'ROUND_ACTIVE' && cashOutBtn) {
        cashOutBtn.textContent = `Sair (R$ ${(currentBet * currentMultiplier).toFixed(2)})`;
    }
}

/**
 * Popula o histórico de rodadas globais na UI.
 * @param {Array<Object>} historyArray - Array de objetos com dados de histórico de rodadas.
 */
function populateGlobalHistory(historyArray) {
    if (!gameHistory || !Array.isArray(historyArray)) return;
    gameHistory.innerHTML = ''; // Limpa o histórico atual

    // Adiciona os itens do histórico, limitando ao MAX_GLOBAL_HISTORY_ITEMS
    historyArray.slice(0, MAX_GLOBAL_HISTORY_ITEMS).forEach(histItemData => {
        const itemElement = document.createElement('div');
        itemElement.textContent = histItemData.multiplier.toFixed(2) + 'x';
        itemElement.classList.add('history-item');

        // Define a cor do item do histórico com base no multiplicador
        if (histItemData.multiplier < 1.01) { itemElement.classList.add('red'); }
        else if (histItemData.multiplier < 2.0) { itemElement.classList.add('white'); }
        else if (histItemData.multiplier < 10) { itemElement.classList.add('green'); }
        else if (histItemData.multiplier < 100) { itemElement.classList.add('m-yellow'); }
        else { itemElement.classList.add('m-gold'); }

        gameHistory.appendChild(itemElement);
    });
}

/**
 * Adiciona um item ao histórico de apostas pessoais e o salva no localStorage.
 * @param {number} aposta - Valor da aposta.
 * @param {number} multiplicadorResultado - Multiplicador final da aposta (crash point ou cashout point).
 * @param {number} vitoria - Valor ganho (0 se perdeu).
 */
function adicionarApostaAoHistorico(aposta, multiplicadorResultado, vitoria) {
    // Filtra entradas irrelevantes (aposta 0, vitória 0, multiplicador baixo) se não houver um contexto específico
    if (aposta <= 0 && vitoria <= 0 && multiplicadorResultado < 1.01 && gameState === 'ROUND_CRASHED' && !gameRunning && currentBet === 0 && lastBetAmountAttempt === 0) {
        return;
    }

    historicoApostas.unshift({ // Adiciona no início do array
        aposta: parseFloat(aposta.toFixed(2)),
        multiplicador: parseFloat(multiplicadorResultado.toFixed(2)),
        vitoria: parseFloat(vitoria.toFixed(2))
    });

    // Limita o tamanho do histórico pessoal
    if (historicoApostas.length > MAX_PERSONAL_HISTORY_ITEMS) {
        historicoApostas.pop(); // Remove o item mais antigo
    }

    // Salva o histórico no localStorage, associado ao userId
    try {
        if(userId && !userId.startsWith('Visitante')) { // Não salva histórico para visitantes genéricos
            localStorage.setItem(`crashGamePersonalHistory_${userId}`, JSON.stringify(historicoApostas));
        }
    } catch(e) {
        console.error("Erro ao salvar histórico pessoal:", e);
    }
    atualizarHistoricoNaTela(); // Atualiza a exibição na UI
}

/**
 * Carrega e atualiza a exibição do histórico de apostas pessoais na UI.
 */
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
            historicoApostas = []; // Limpa se houver erro ao carregar
        }
    }
}

/**
 * Atualiza a exibição do histórico de apostas pessoais na UI.
 */
function atualizarHistoricoNaTela() {
    if (!betHistoryDiv) return;
    betHistoryDiv.innerHTML = ''; // Limpa o histórico atual

    // Cria o cabeçalho da tabela
    const header = document.createElement('div');
    header.className = 'personal-historico-header';
    header.innerHTML = `<span>APOSTA</span><span>RESULTADO</span>`;
    betHistoryDiv.appendChild(header);

    // Adiciona cada item do histórico à tabela
    historicoApostas.forEach(item => {
        const row = document.createElement('div');
        row.className = 'personal-history-item';

        const apostaSpan = document.createElement('span');
        apostaSpan.textContent = `R$ ${item.aposta.toFixed(2)}`;

        const resultadoSpan = document.createElement('span');
        if (item.vitoria > 0) {
            resultadoSpan.textContent = `R$ ${item.vitoria.toFixed(2)} (${item.multiplicador.toFixed(2)}x)`;
            resultadoSpan.className = 'win'; // Classe CSS para vitórias
        } else {
            resultadoSpan.textContent = `Afundou @ ${item.multiplicador.toFixed(2)}x`;
            resultadoSpan.className = 'loss'; // Classe CSS para perdas
        }
        row.appendChild(apostaSpan);
        row.appendChild(resultadoSpan);
        betHistoryDiv.appendChild(row);
    });
}

/**
 * Função chamada no lado do cliente quando um saque (manual ou auto) é bem-sucedido.
 * @param {number} multiplier - Multiplicador no momento do saque.
 * @param {number} winnings - Valor ganho no saque.
 * @param {number} newBalance - Novo saldo do jogador após o saque.
 * @param {boolean} isAuto - True se foi um auto-saque.
 */
function clientSideOnCashOutSuccess(multiplier, winnings, newBalance, isAuto) {
    console.log(`CLIENTE: clientSideOnCashOutSuccess - Saldo Anterior Local: ${playerBalance}, Ganhos: ${winnings}, Novo Saldo Servidor: ${newBalance}`);
    playerBalance = newBalance; // Atualiza o saldo local com o valor do servidor
    localStorage.setItem(balanceKey, playerBalance.toString()); // Salva no localStorage
    updateBalanceDisplay(); // Atualiza a exibição do saldo
    adicionarApostaAoHistorico(currentBet, multiplier, winnings); // Adiciona ao histórico pessoal
    gameRunning = false; // O jogo não está mais 'running' para este cliente
    autoCashOutArmedForCurrentBet = false; // Desarma o auto-saque
    const statusMsgText = isAuto ? `✅ Auto Saque @ ${multiplier.toFixed(2)}x!` : `✅ Você saiu @ ${multiplier.toFixed(2)}x!`;
    if (statusMessage) statusMessage.textContent = `${statusMsgText} Ganhou R$ ${winnings.toFixed(2)}`;
    if (cashOutBtn) {
        cashOutBtn.disabled = true; // Desabilita o botão de saque
        cashOutBtn.textContent = isAuto ? `Auto Sacado @ ${multiplier.toFixed(2)}x` : `Sacado @ ${multiplier.toFixed(2)}x`;
    }
    currentBet = 0; // Reseta a aposta atual
    updateUIState(); // Assegura que a UI reflita que o jogo não está mais 'running' para este cliente
}

/**
 * Atualiza o feed de apostas em tempo real.
 * @param {Object} data - Dados da aposta/saque/perda para o feed.
 */
function updateRealTimeFeed(data) {
    if (!realTimeBetFeedDiv) return;

    const playerMessageUserId = data.userId ? data.userId.toString() : null;
    // Usa o roundId da mensagem ou o roundId atual do cliente como fallback
    const entryRoundId = data.roundId || currentClientRoundId;
    const feedEntryId = `feed-entry-${playerMessageUserId}-${entryRoundId}`;

    let existingItem = document.getElementById(feedEntryId);
    // Exibe "Você" se for o próprio usuário, senão um identificador curto do jogador
    const playerIdentifier = (playerMessageUserId === userId) ? "Você" : (data.playerDisplay ? data.playerDisplay.substring(0, 12) : 'Jogador');

    if (data.type === 'player_bet_placed') {
        // Remove item existente se for uma nova aposta (garante que não duplique)
        if (existingItem) {
            existingItem.remove();
        }
        existingItem = document.createElement('div');
        existingItem.id = feedEntryId;
        existingItem.className = 'feed-item';

        // Adiciona o novo item no topo do feed
        if (realTimeBetFeedDiv.firstChild) {
            realTimeBetFeedDiv.insertBefore(existingItem, realTimeBetFeedDiv.firstChild);
        } else {
            realTimeBetFeedDiv.appendChild(existingItem);
        }
        // Limita o número de itens no feed
        while (realTimeBetFeedDiv.children.length > MAX_FEED_ITEMS) {
            realTimeBetFeedDiv.removeChild(realTimeBetFeedDiv.lastChild);
        }
    } else if (!existingItem && (data.type === 'player_cashed_out' || data.type === 'player_lost_bet')) {
        // Se a mensagem for de cash-out ou perda e o item 'ongoing' não for encontrado,
        // cria um novo item para exibir o resultado. Isso pode acontecer se o feed
        // foi limpo ou o cliente se conectou no meio da rodada.
        console.warn(`Feed: Não encontrou item 'ongoing' para ${playerIdentifier} (ID: ${playerMessageUserId}) na rodada ${entryRoundId} para atualizar com ${data.type}. Criando novo item de resultado.`);
        existingItem = document.createElement('div');
        existingItem.id = feedEntryId;
        existingItem.className = 'feed-item';
        if (realTimeBetFeedDiv.firstChild) {
            realTimeBetFeedDiv.insertBefore(existingItem, realTimeBetFeedDiv.firstChild);
        } else {
            realTimeBetFeedDiv.appendChild(existingItem);
        }
        while (realTimeBetFeedDiv.children.length > MAX_FEED_ITEMS) {
            realTimeBetFeedDiv.removeChild(realTimeBetFeedDiv.lastChild);
        }
    } else if (!existingItem) {
        // Se o item não existe e não é uma nova aposta, não faz nada
        return;
    }

    const itemToUpdateOrAdd = existingItem;
    itemToUpdateOrAdd.classList.remove('ongoing', 'cashout', 'loss'); // Remove classes de estado anteriores
    itemToUpdateOrAdd.innerHTML = ''; // Limpa o conteúdo para re-criar

    // Cria os spans para as colunas do feed
    const playerSpan = document.createElement('span');
    playerSpan.className = 'col-player';
    playerSpan.textContent = playerIdentifier;
    if (playerMessageUserId === userId) {
        playerSpan.classList.add('me'); // Adiciona classe para destacar o próprio jogador
    }

    const betSpan = document.createElement('span');
    betSpan.className = 'col-bet';
    // Tenta usar o valor da aposta da mensagem, ou o valor existente se já estiver no DOM
    betSpan.textContent = data.betAmount ? `R$ ${data.betAmount.toFixed(2)}` : (itemToUpdateOrAdd.querySelector('.col-bet') ? itemToUpdateOrAdd.querySelector('.col-bet').textContent : 'R$ -');

    const multiplierSpan = document.createElement('span');
    multiplierSpan.className = 'col-multiplier';

    const winningsSpan = document.createElement('span');
    winningsSpan.className = 'col-winnings';

    // Define o conteúdo e classes com base no tipo de evento
    if (data.type === 'player_bet_placed') {
        itemToUpdateOrAdd.classList.add('ongoing');
        multiplierSpan.textContent = 'Em Jogo';
        winningsSpan.textContent = '-';
        multiplierSpan.classList.remove('no-value'); // Remove no-value se houver texto
        winningsSpan.classList.add('no-value'); // Adiciona no-value se não houver valor
    } else if (data.type === 'player_cashed_out') {
        itemToUpdateOrAdd.classList.add('cashout');
        multiplierSpan.textContent = data.cashOutMultiplier ? `${data.cashOutMultiplier.toFixed(2)}x` : '-';
        winningsSpan.textContent = data.winnings !== undefined ? `R$ ${data.winnings.toFixed(2)}` : 'R$ -';
        if (!data.cashOutMultiplier) multiplierSpan.classList.add('no-value');
        if (typeof data.winnings === 'undefined') winningsSpan.classList.add('no-value');
    } else if (data.type === 'player_lost_bet') {
        itemToUpdateOrAdd.classList.add('loss');
        multiplierSpan.textContent = data.crashPoint ? `Afundou @ ${data.crashPoint.toFixed(2)}x` : 'Perdeu';
        winningsSpan.textContent = `R$ 0.00`;
        if (data.crashPoint) multiplierSpan.classList.remove('no-value');
        winningsSpan.classList.remove('no-value');
    }

    // Adiciona os spans ao item do feed
    itemToUpdateOrAdd.appendChild(playerSpan);
    itemToUpdateOrAdd.appendChild(betSpan);
    itemToUpdateOrAdd.appendChild(multiplierSpan);
    itemToUpdateOrAdd.appendChild(winningsSpan);
}

/**
 * Traduz os motivos de rejeição/falha do servidor para mensagens amigáveis ao usuário.
 * @param {string} reason - Código do motivo da rejeição/falha.
 * @returns {string} Mensagem traduzida.
 */
function traduzirMotivoRejeicao(reason) {
    switch(reason) {
        case 'dados_invalidos': return 'Dados da aposta inválidos.';
        case 'fora_da_fase_de_apostas': return 'Não é possível apostar agora.';
        case 'aposta_ja_realizada_nesta_rodada': return 'Você já apostou nesta rodada.';
        case 'usuario_nao_encontrado': return 'Usuário não reconhecido.';
        case 'saldo_insuficiente': return 'Saldo insuficiente.';
        case 'ja_sacado_ou_sem_aposta': return 'Saque já realizado ou sem aposta ativa.';
        case 'rodada_nao_ativa': return 'A rodada não está ativa para saque.';
        case 'saque_apos_crash_point': return 'Tarde demais! O navio já afundou.';
        case 'ja_crashou_ou_crasharia_antes': return 'Tarde demais! O navio afundou antes.';
        case 'saque_tardio_crash_ocorreu': return 'Tarde demais! O navio afundou.';
        case 'condicao_auto_saque_invalida_ou_tardia': return 'Auto-saque não pôde ser processado.';
        case 'userId_nao_associado_a_conexao': return 'Erro de identificação do usuário.';
        case 'identificacao_necessaria': return 'Identificação do usuário necessária.';
        case 'identificacao_usuario_falhou': return 'Falha na identificação do usuário.';
        case 'dados_auto_saque_invalidos': return 'Dados para auto-saque inválidos.';
        default: return reason || 'Motivo desconhecido.';
    }
}

// --- Lógica do WebSocket ---
function connectWebSocket() {
    console.log("GAME.JS: Tentando conectar ao WebSocket em:", SOCKET_URL);
    socket = new WebSocket(SOCKET_URL);
    
    // Timeout para conexão WebSocket
    const connectionTimeout = setTimeout(() => {
        console.log("GAME.JS: Timeout na conexão WebSocket após 10 segundos");
        if (statusMessage) statusMessage.textContent = 'Erro de conexão com o servidor';
    }, 10000);

    // Evento quando a conexão é aberta
    socket.onopen = () => {
        console.log('GAME.JS: CONEXÃO WEBSOCKET ABERTA!');
        clearTimeout(connectionTimeout); // Limpa o timeout
        if (statusMessage) statusMessage.textContent = 'Conectado ao Jogo!';
        // Envia o userId para o servidor assim que a conexão é estabelecida
        if (userId && !userId.startsWith('Visitante')) {
             socket.send(JSON.stringify({ type: 'client_ready_with_id', userId: userId }));
        }
    };
    
    // Evento quando há erro na conexão
    socket.onerror = (error) => {
        console.log('GAME.JS: ERRO NA CONEXÃO WEBSOCKET:', error);
        if (statusMessage) statusMessage.textContent = 'Erro de conexão com o servidor';
    };
    
    // Evento quando a conexão é fechada
    socket.onclose = (event) => {
        console.log('GAME.JS: CONEXÃO WEBSOCKET FECHADA:', event.code, event.reason);
        if (statusMessage) statusMessage.textContent = 'Conexão perdida com o servidor';
    };

    // Evento quando uma mensagem é recebida do servidor
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            // console.log('CLIENTE: MSG DO SERVIDOR:', data); // Descomente para depurar

            // Atualiza o histórico global se houver dados de histórico
            if (data.history && Array.isArray(data.history) && gameHistory) {
                populateGlobalHistory(data.history);
            }

            // Detecta nova rodada para limpar o feed de apostas em tempo real
            if (data.roundId) {
                if (data.roundId !== currentClientRoundId && (data.type === 'waiting' || data.type === 'countdown')) {
                    console.log(`CLIENTE: Nova rodada ${data.roundId} detectada. Limpando feed.`);
                    if (realTimeBetFeedDiv) realTimeBetFeedDiv.innerHTML = '';
                }
                currentClientRoundId = data.roundId;
            }

            // Lógica principal de tratamento das mensagens do servidor
            switch (data.type) {
                case 'waiting':
                case 'countdown':
                    gameState = 'WAITING_TO_START';
                    currentMultiplier = 1.00;
                    // Se o jogo estava rodando, ele já foi resetado por 'crash' ou 'cash_out_success'
                    if (placeBetBtn && placeBetBtn.disabled && !gameRunning) {
                        lastBetAmountAttempt = 0; // Limpa a última aposta tentada
                    }
                    updateUIState(); // Atualiza UI (inclui reset do navio)
                    if (data.timeLeft !== undefined && countdownDisplay) {
                        // Exibe o countdown
                        const timeString = Number.isInteger(data.timeLeft) ? data.timeLeft.toString() : data.timeLeft.toFixed(0);
                        countdownDisplay.innerHTML = `<span class="countdown-text-white">Próxima rodada em </span><span class="countdown-number-yellow">${timeString}</span><span class="countdown-text-white">s...</span>`;
                        countdownDisplay.style.display = 'block';
                    }
                    break;
                case 'round_start':
                    gameState = 'ROUND_ACTIVE';
                    currentMultiplier = 1.00; // Multiplicador inicial
                    if(countdownDisplay) countdownDisplay.style.display = 'none'; // Esconde countdown

                    resetShipPositionAndAppearance(); // Garante que o navio está na posição inicial
                    currentShipX = SHIP_START_LEFT_OFFSET_PX; // Reseta a posição X lógica
                    if(shipElement) {
                        shipElement.style.transform = `translateX(0px) rotate(0deg)`; // Posição X visual inicial
                    }

                    updateUIState();
                    updateMultiplierDisplay();
                    if(statusMessage) statusMessage.textContent = 'Navio navegando...';
                    break;
                case 'multiplier_update':
                    // Só atualiza se a rodada está ativa (evita atualizar antes do início ou depois do crash)
                    if (gameState === 'ROUND_ACTIVE' || (gameState === 'WAITING_TO_START' && currentMultiplier > 1.00) ) {
                        currentMultiplier = data.multiplier;
                        updateMultiplierDisplay();

                        // Lógica de movimento horizontal do navio
                        if (shipElement && gameArea) {
                            const gameAreaWidth = gameArea.offsetWidth;
                            const shipWidth = shipElement.offsetWidth;
                            let targetX = (currentMultiplier - 1) * SHIP_HORIZONTAL_SPEED_FACTOR;

                            // Limita o navio dentro da área de jogo (com margem direita)
                            const maxShipX = gameAreaWidth - shipWidth - SHIP_START_LEFT_OFFSET_PX - 10;
                            currentShipX = Math.min(targetX, maxShipX);

                            shipElement.style.transform = `translateX(${currentShipX}px) rotate(0deg)`;
                        }
                    }
                    break;
                case 'crash':
                    gameState = 'ROUND_CRASHED';
                    currentMultiplier = data.multiplier; // O multiplicador onde o navio afundou

                    if (shipElement) {
                        shipElement.classList.add('sinking'); // Adiciona classe para animação de afundamento
                        shipElement.style.bottom = `${SHIP_SINK_TARGET_BOTTOM_PERCENTAGE}%`; // Move para baixo
                        // A rotação e opacidade são controladas pela classe '.sinking' no CSS
                    }

                    // Mensagens de status após o crash
                    if (gameRunning) {
                        // A mensagem 'bet_lost_due_to_crash' tratará o histórico e a mensagem principal para este jogador
                    } else if (lastBetAmountAttempt > 0 && statusMessage && !statusMessage.textContent.includes("Sacado")) {
                        // Se o jogador tentou apostar mas não estava no jogo e não sacou
                        if(statusMessage) statusMessage.textContent = `💥 Navio Afundou @ ${currentMultiplier.toFixed(2)}x!`;
                    } else if (statusMessage && !statusMessage.textContent.includes("Sacado")) {
                        // Mensagem genérica de crash se o jogador não estava envolvido
                        statusMessage.textContent = `💥 Navio Afundou @ ${currentMultiplier.toFixed(2)}x!`;
                    }
                    updateUIState(); // Atualiza botões e outros elementos da UI
                    if(multiplierDisplay) multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`; // Mostra o multiplicador final
                    if(cashOutBtn) cashOutBtn.disabled = true; // Desabilita o botão de saque

                    // Reseta variáveis de estado do cliente para a próxima rodada
                    gameRunning = false;
                    currentBet = 0;
                    lastBetAmountAttempt = 0;
                    autoCashOutArmedForCurrentBet = false;
                    break;
                case 'bet_lost_due_to_crash':
                    if (userId && userId.toString() === data.userId?.toString()) { // Garante que a mensagem é para este cliente
                        adicionarApostaAoHistorico(data.betAmount, data.crashPoint, 0); // Adiciona ao histórico como perda
                        if (statusMessage) statusMessage.textContent = `💥 Navio Afundou @ ${data.crashPoint.toFixed(2)}x! Você perdeu R$ ${data.betAmount.toFixed(2)}`;
                        gameRunning = false;
                        currentBet = 0;
                        autoCashOutArmedForCurrentBet = false;
                        updateUIState();
                    }
                    break;
                case 'crash_info_on_connect': // Mensagem enviada quando um cliente se conecta e a rodada acabou de crashar
                    gameState = 'WAITING_TO_START';
                    if (data.lastCrashPoint) {
                        currentMultiplier = data.lastCrashPoint;
                        if(multiplierDisplay) multiplierDisplay.textContent = `${data.lastCrashPoint.toFixed(2)}x`;
                        if(statusMessage) statusMessage.textContent = `Rodada anterior: Navio Afundou @ ${data.lastCrashPoint.toFixed(2)}x. Aguardando...`;

                        if (shipElement) { // Anima o navio para a posição afundada
                            const approxCrashX = (data.lastCrashPoint -1) * SHIP_HORIZONTAL_SPEED_FACTOR;
                            const gameAreaWidth = gameArea ? gameArea.offsetWidth : 600;
                            const shipWidth = shipElement.offsetWidth || 80;
                            const maxShipX = gameAreaWidth - shipWidth - SHIP_START_LEFT_OFFSET_PX - 10;
                            const finalX = Math.min(approxCrashX, maxShipX);

                            shipElement.style.transform = `translateX(${finalX}px) rotate(15deg)`;
                            shipElement.classList.add('sinking');
                            shipElement.style.bottom = `${SHIP_SINK_TARGET_BOTTOM_PERCENTAGE}%`;
                        }
                    }
                    updateUIState(); // Reseta outros controles
                    break;
                case 'bet_accepted':
                    playerBalance = data.newBalance; // Atualiza saldo com o do servidor
                    currentBet = data.betAmount; // Define a aposta atual do cliente
                    lastBetAmountAttempt = 0; // Limpa a última aposta tentada
                    localStorage.setItem(balanceKey, playerBalance.toString());
                    updateBalanceDisplay();
                    gameRunning = true; // O jogo está 'running' para este cliente
                    if (data.autoCashOutTarget) { // Se a aposta incluiu auto-saque
                        autoCashOutArmedForCurrentBet = true;
                        autoCashOutTargetForCurrentBet = data.autoCashOutTarget;
                        if (statusMessage) statusMessage.textContent = `✅ Aposta de R$ ${currentBet.toFixed(2)} ACEITA! (Auto @ ${autoCashOutTargetForCurrentBet.toFixed(2)}x)`;
                    } else {
                        autoCashOutArmedForCurrentBet = false;
                        if (statusMessage) statusMessage.textContent = `✅ Aposta de R$ ${currentBet.toFixed(2)} ACEITA!`;
                    }
                    updateUIState(); // Atualiza UI para refletir aposta aceita
                    break;
                case 'bet_rejected':
                    if (statusMessage) statusMessage.textContent = `❌ Aposta Rejeitada: ${traduzirMotivoRejeicao(data.reason)}`;
                    lastBetAmountAttempt = 0;
                    autoCashOutArmedForCurrentBet = false;
                    // Reabilita os controles de aposta se a rodada ainda estiver na fase de espera
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
                     if (statusMessage) statusMessage.textContent = `❌ Saque Falhou: ${traduzirMotivoRejeicao(data.reason)}`;
                     // Se a falha foi por ter crashado ou a rodada encerrado, desabilita o botão
                     if (['rodada_encerrada', 'ja_crashou_ou_crasharia_antes', 'saque_tardio_crash_iminente', 'rodada_nao_ativa', 'saque_tardio_crash_ocorreu'].includes(data.reason) ) {
                          if (cashOutBtn) cashOutBtn.disabled = true;
                          gameRunning = false; // Cliente não está mais em jogo
                     } else if (gameRunning && gameState === 'ROUND_ACTIVE' && cashOutBtn) {
                          // Se a rodada ainda está ativa e o cliente está em jogo, reabilita o botão para nova tentativa
                          cashOutBtn.disabled = false;
                     }
                    break;
                case 'balance_update_from_server': // Atualização de saldo vinda do servidor (ex: depósito, ajuste)
                    playerBalance = data.newBalance;
                    localStorage.setItem(balanceKey, playerBalance.toString());
                    updateBalanceDisplay();
                    break;
                case 'player_bet_placed':
                case 'player_cashed_out':
                case 'player_lost_bet':
                    updateRealTimeFeed(data); // Atualiza o feed de apostas em tempo real
                    break;
            }
        } catch (error) {
            console.error("CLIENTE: Erro ao processar mensagem do servidor:", error, "Dados brutos:", event.data);
        }
    };

    // Evento quando a conexão é fechada
    socket.onclose = (event) => {
        console.log('CONEXÃO WEBSOCKET FECHADA:', event);
        if (statusMessage) statusMessage.textContent = 'Desconectado do servidor.';
        // Tentar reconectar após um atraso
        setTimeout(connectWebSocket, 3000);
    };

    // Evento quando ocorre um erro na conexão
    socket.onerror = (error) => {
        console.error('ERRO NO WEBSOCKET:', error);
        if (statusMessage) statusMessage.textContent = 'Erro de conexão com o servidor.';
    };
}

// --- Event Listeners para Controles ---

// Botão de Apostar
if (placeBetBtn && betAmountInput) {
    placeBetBtn.addEventListener('click', () => {
        // Verifica se a aposta é permitida neste momento
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
            // Multiplicador de auto-saque deve ser um número válido e maior que 1.00
            if (!isNaN(target) && target >= 1.01) {
                autoTargetValue = target;
            } else {
                if (statusMessage) statusMessage.textContent = "Multiplicador de Auto-Saque inválido! (mín. 1.01x)";
                return;
            }
        }

        // Envia a aposta via WebSocket para o servidor
        socket.send(JSON.stringify({
            type: 'place_bet',
            userId: userId,
            amount: lastBetAmountAttempt,
            autoCashOut: autoTargetValue // Envia o alvo de auto-saque se definido
        }));

        if(statusMessage) statusMessage.textContent = "Aguardando confirmação da aposta...";
        // Desabilita os botões para evitar múltiplas apostas ou ações enquanto espera confirmação
        placeBetBtn.disabled = true;
        betAmountInput.disabled = true;
        halveBetBtn.disabled = true;
        doubleBetBtn.disabled = true;
        enableAutoCashOut.disabled = true;
        autoCashOutMultiplierInput.disabled = true;
    });
}

// Botão de Sacar
if (cashOutBtn) {
    cashOutBtn.addEventListener('click', () => {
        // Só permite sacar se o jogo está rodando, a rodada está ativa e o cliente tem uma aposta ativa
        if (gameRunning && gameState === 'ROUND_ACTIVE' && currentBet > 0) {
            socket.send(JSON.stringify({ type: 'cash_out', userId: userId }));
            if (statusMessage) statusMessage.textContent = "Solicitando saque...";
            cashOutBtn.disabled = true; // Desabilita para evitar múltiplos saques
        } else {
            console.warn("CLIENTE: Tentativa de saque bloqueada. Jogo não está rodando ou sem aposta ativa.");
        }
    });
}

// Botão de Dividir Aposta pela Metade
if (halveBetBtn && betAmountInput) {
    halveBetBtn.addEventListener('click', () => {
        if (!betAmountInput.disabled) { // Só permite ajustar se o input não estiver desabilitado (ou seja, na fase de aposta)
            let currentVal = parseFloat(betAmountInput.value);
            if (isNaN(currentVal)) currentVal = 0;
            betAmountInput.value = (currentVal / 2).toFixed(2);
        }
    });
}

// Botão de Dobrar Aposta
if (doubleBetBtn && betAmountInput) {
    doubleBetBtn.addEventListener('click', () => {
        if (!betAmountInput.disabled) { // Só permite ajustar se o input não estiver desabilitado
            let currentVal = parseFloat(betAmountInput.value);
            if (isNaN(currentVal)) currentVal = 0;
            betAmountInput.value = (currentVal * 2).toFixed(2);
        }
    });
}

// Checkbox para habilitar/desabilitar auto-saque
if (enableAutoCashOut && autoCashOutMultiplierInput) {
    enableAutoCashOut.addEventListener('change', () => {
        // Habilita/desabilita o input do multiplicador de auto-saque
        // O input só é habilitado se o checkbox estiver marcado E os controles de aposta estiverem habilitados
        autoCashOutMultiplierInput.disabled = !(enableAutoCashOut.checked && gameState === 'WAITING_TO_START' && !gameRunning);
    });
}

// Botão para Voltar ao Lobby (redireciona para index.html, que é o lobby principal)
if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html'; // Lobby principal
    });
}

// Botão para alternar a visibilidade do histórico pessoal
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

// --- Inicialização ao Carregar o DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("GAME.JS: DOMContentLoaded disparado.");
    console.log("GAME.JS: Aguardando 2 segundos antes de verificar autenticação...");
    // Aguardar mais tempo antes de verificar autenticação
    setTimeout(() => {
        checkAuthAndContinue();
    }, 2000);
});
