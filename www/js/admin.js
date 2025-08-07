// admin.js - Painel Administrativo do Ship Crash
let isCheckingAuth = false;
let authChecked = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚢 Painel Admin inicializando...');
    
    // PROTEÇÃO: Garantir que estamos no painel admin
    console.log('🔒 Proteção ativada: Admin deve permanecer no painel admin');
    
    // Carregar dados iniciais primeiro
    loadAdminData();
    
    // Configurar listeners
    setupEventListeners();
    
    // Verificar autenticação após um delay maior
    setTimeout(() => {
        if (!authChecked) {
            authChecked = true;
            checkAdminAuth();
        }
    }, 3000);
    
    // Proteção adicional: Interceptar tentativas de navegação
    window.addEventListener('beforeunload', (e) => {
        if (window.location.pathname.includes('admin')) {
            console.log('🚫 Tentativa de sair do painel admin bloqueada');
        }
    });
    
    // Verificação periódica para garantir que admin permaneça no painel
    setInterval(() => {
        forceAdminStay();
    }, 5000); // Verificar a cada 5 segundos
});

// Verificar autenticação do admin
async function checkAdminAuth() {
    if (isCheckingAuth) {
        console.log('⏳ Verificação já em andamento...');
        return;
    }
    
    isCheckingAuth = true;
    
    try {
        console.log('🔍 Verificando autenticação do admin...');
        
        // Aguardar Firebase Auth inicializar
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const user = auth.currentUser;
        console.log('👤 Usuário atual:', user ? user.email : 'Nenhum');
        
        if (!user) {
            console.log('❌ Admin não logado, redirecionando para login...');
            setTimeout(() => {
                window.location.replace('auth.html');
            }, 1000);
            return;
        }
        
        // Verificar se o usuário é admin
        console.log('📋 Verificando role do usuário...');
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        console.log('📊 Dados do usuário:', userData);
        
        if (!userData || userData.role !== 'admin') {
            console.log('❌ Usuário não é admin, redirecionando para login...');
            setTimeout(() => {
                window.location.replace('auth.html');
            }, 1000);
            return;
        }
        
        console.log('✅ Admin autenticado:', userData.fullName);
        isCheckingAuth = false;
        
        // Mostrar mensagem de sucesso
        showSuccess(`✅ Admin logado: ${userData.fullName}`);
        
        // IMPORTANTE: Admin NUNCA deve sair do painel admin
        console.log('🚫 Admin deve permanecer no painel admin');
        
    } catch (error) {
        console.error('❌ Erro na verificação de admin:', error);
        setTimeout(() => {
            window.location.replace('auth.html');
        }, 1000);
    }
}

// Carregar dados do painel admin
async function loadAdminData() {
    try {
        // Carregar estatísticas
        await loadStats();
        
        // Carregar lista de usuários
        await loadUsers();
        
        // Carregar configurações do sistema
        await loadSystemSettings();
        
    } catch (error) {
        console.error('Erro ao carregar dados do admin:', error);
        showError('Erro ao carregar dados do painel');
    }
}

// Carregar estatísticas
async function loadStats() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        let totalBalance = 0;
        let activeUsers = 0;
        let promoters = 0;
        let highestId = 100000; // ID inicial
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            users.push(userData);
            
            if (userData.balance) {
                totalBalance += userData.balance;
            }
            
            if (userData.status === 'active') {
                activeUsers++;
            }
            
            if (userData.role === 'promoter') {
                promoters++;
            }
            
            // Verificar maior ID
            if (userData.numericId && userData.numericId > highestId) {
                highestId = userData.numericId;
            }
        });
        
        // Atualizar estatísticas na UI
        document.getElementById('totalUsers').textContent = users.length;
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('totalBalance').textContent = `R$ ${totalBalance.toFixed(2)}`;
        document.getElementById('totalPromoters').textContent = promoters;
        
        // Mostrar informação sobre IDs
        console.log(`📊 Estatísticas: ${users.length} usuários, maior ID: ${highestId}`);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Carregar lista de usuários
async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            userData.uid = doc.id;
            users.push(userData);
        });
        
        // Ordenar por data de registro (mais recentes primeiro)
        users.sort((a, b) => {
            const dateA = a.registrationDate ? new Date(a.registrationDate) : new Date(0);
            const dateB = b.registrationDate ? new Date(b.registrationDate) : new Date(0);
            return dateB - dateA;
        });
        
        displayUsers(users);
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showError('Erro ao carregar lista de usuários');
    }
}

// Exibir usuários na tabela
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Nenhum usuário encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.numericId || user.uid}</td>
            <td>${user.fullName || 'N/A'}</td>
            <td>${user.email || 'N/A'}</td>
            <td>R$ ${(user.balance || 0).toFixed(2)}</td>
            <td>
                <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${user.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-small btn-primary" onclick="editUser('${user.uid}')">
                        Editar
                    </button>
                    <button class="btn btn-small btn-success" onclick="addBalanceToUser('${user.uid}', '${user.fullName}')">
                        + Saldo
                    </button>
                    ${user.role !== 'promoter' ? `
                        <button class="btn btn-small btn-warning" onclick="makePromoter('${user.uid}', '${user.fullName}')">
                            Promotor
                        </button>
                    ` : ''}
                    <button class="btn btn-small btn-danger" onclick="toggleUserStatus('${user.uid}', '${user.status}')">
                        ${user.status === 'active' ? 'Desativar' : 'Ativar'}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Configurar event listeners
function setupEventListeners() {
    // Busca de usuários
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', (e) => {
            searchUsers(e.target.value);
        });
    }
    
    // Modal
    const modal = document.getElementById('confirmModal');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.onclick = closeModal;
    
    window.onclick = (event) => {
        if (event.target === modal) {
            closeModal();
        }
    };
}

// Buscar usuários
async function searchUsers(query) {
    if (!query.trim()) {
        await loadUsers();
        return;
    }
    
    try {
        const usersSnapshot = await db.collection('users').get();
        const users = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            userData.uid = doc.id;
            
            // Buscar por ID, nome, email
            const searchText = `${userData.numericId} ${userData.fullName} ${userData.email}`.toLowerCase();
            if (searchText.includes(query.toLowerCase())) {
                users.push(userData);
            }
        });
        
        displayUsers(users);
        
    } catch (error) {
        console.error('Erro na busca de usuários:', error);
    }
}

// Adicionar saldo
async function addBalance() {
    const userId = document.getElementById('addBalanceUserId').value.trim();
    const amount = parseFloat(document.getElementById('addBalanceAmount').value);
    const reason = document.getElementById('addBalanceReason').value.trim();
    
    if (!userId || !amount || amount <= 0) {
        showError('Por favor, preencha todos os campos corretamente');
        return;
    }
    
    try {
        // Encontrar o usuário pelo ID numérico ou UID
        const usersSnapshot = await db.collection('users').get();
        let targetUser = null;
        let targetUid = null;
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.numericId == userId || doc.id === userId) {
                targetUser = userData;
                targetUid = doc.id;
            }
        });
        
        if (!targetUser) {
            showError('Usuário não encontrado');
            return;
        }
        
        // Atualizar saldo
        const newBalance = (targetUser.balance || 0) + amount;
        await db.collection('users').doc(targetUid).update({
            balance: newBalance
        });
        
        // Registrar transação
        await logTransaction(targetUid, 'admin_add', amount, {
            reason: reason,
            adminId: auth.currentUser.uid,
            previousBalance: targetUser.balance || 0
        });
        
        showSuccess(`Saldo adicionado com sucesso! Novo saldo: R$ ${newBalance.toFixed(2)}`);
        
        // Limpar campos
        document.getElementById('addBalanceUserId').value = '';
        document.getElementById('addBalanceAmount').value = '';
        document.getElementById('addBalanceReason').value = '';
        
        // Recarregar dados
        await loadAdminData();
        
    } catch (error) {
        console.error('Erro ao adicionar saldo:', error);
        showError('Erro ao adicionar saldo');
    }
}

// Adicionar saldo para usuário específico (da tabela)
function addBalanceToUser(uid, userName) {
    document.getElementById('addBalanceUserId').value = uid;
    document.getElementById('addBalanceAmount').focus();
    
    // Scroll para a seção de adicionar saldo
    document.querySelector('.section-card:nth-child(2)').scrollIntoView({
        behavior: 'smooth'
    });
}

// Criar promotor
async function createPromoter() {
    const userId = document.getElementById('promoterUserId').value.trim();
    const name = document.getElementById('promoterName').value.trim();
    const email = document.getElementById('promoterEmail').value.trim();
    
    if (!userId || !name || !email) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    try {
        // Verificar se o usuário existe
        const usersSnapshot = await db.collection('users').get();
        let targetUser = null;
        let targetUid = null;
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.numericId == userId || doc.id === userId) {
                targetUser = userData;
                targetUid = doc.id;
            }
        });
        
        if (!targetUser) {
            showError('Usuário não encontrado');
            return;
        }
        
        // Atualizar para promotor
        await db.collection('users').doc(targetUid).update({
            role: 'promoter',
            fullName: name,
            email: email,
            promoterData: {
                createdAt: new Date().toISOString(),
                createdBy: auth.currentUser.uid
            }
        });
        
        showSuccess('Promotor criado com sucesso!');
        
        // Limpar campos
        document.getElementById('promoterUserId').value = '';
        document.getElementById('promoterName').value = '';
        document.getElementById('promoterEmail').value = '';
        
        // Recarregar dados
        await loadAdminData();
        
    } catch (error) {
        console.error('Erro ao criar promotor:', error);
        showError('Erro ao criar promotor');
    }
}

// Tornar usuário promotor (da tabela)
async function makePromoter(uid, userName) {
    if (confirm(`Tem certeza que deseja tornar ${userName} um promotor?`)) {
        try {
            await db.collection('users').doc(uid).update({
                role: 'promoter',
                promoterData: {
                    createdAt: new Date().toISOString(),
                    createdBy: auth.currentUser.uid
                }
            });
            
            showSuccess('Usuário promovido a promotor com sucesso!');
            await loadAdminData();
            
        } catch (error) {
            console.error('Erro ao tornar promotor:', error);
            showError('Erro ao tornar promotor');
        }
    }
}

// Alternar status do usuário
async function toggleUserStatus(uid, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'ativar' : 'desativar';
    
    if (confirm(`Tem certeza que deseja ${action} este usuário?`)) {
        try {
            await db.collection('users').doc(uid).update({
                status: newStatus
            });
            
            showSuccess(`Usuário ${action} com sucesso!`);
            await loadAdminData();
            
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            showError('Erro ao alterar status do usuário');
        }
    }
}

// Editar usuário
function editUser(uid) {
    // Implementar modal de edição
    alert('Funcionalidade de edição será implementada em breve');
}

// Carregar configurações do sistema
async function loadSystemSettings() {
    try {
        // Carregar configurações principais
        const settingsDoc = await db.collection('systemSettings').doc('main').get();
        
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            document.getElementById('initialBalance').value = settings.initialBalance || 0.00;
            document.getElementById('systemStatus').value = settings.systemStatus || 'online';
        }
        
        // Carregar contador de usuários
        const counterDoc = await db.collection('systemSettings').doc('userCounter').get();
        
        if (counterDoc.exists) {
            const counterData = counterDoc.data();
            document.getElementById('nextUserId').value = counterData.nextUserId || 100001;
        } else {
            document.getElementById('nextUserId').value = 100001;
        }
        
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

// Atualizar configurações do sistema
async function updateSystemSettings() {
    const initialBalance = parseFloat(document.getElementById('initialBalance').value);
    const systemStatus = document.getElementById('systemStatus').value;
    
    try {
        await db.collection('systemSettings').doc('main').set({
            initialBalance: initialBalance,
            systemStatus: systemStatus,
            updatedAt: new Date().toISOString(),
            updatedBy: auth.currentUser.uid
        });
        
        showSuccess('Configurações atualizadas com sucesso!');
        
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        showError('Erro ao atualizar configurações');
    }
}

// Redefinir contador de usuários
async function resetUserCounter() {
    if (confirm('Tem certeza que deseja redefinir o contador de usuários? Isso afetará apenas novos registros.')) {
        try {
            const newStartValue = parseInt(prompt('Digite o novo valor inicial (ex: 100001):', '100001')) || 100001;
            
            await db.collection('systemSettings').doc('userCounter').set({
                nextUserId: newStartValue,
                resetAt: new Date().toISOString(),
                resetBy: auth.currentUser.uid
            });
            
            showSuccess(`Contador redefinido para ${newStartValue}!`);
            await loadSystemSettings(); // Recarregar configurações
            
        } catch (error) {
            console.error('Erro ao redefinir contador:', error);
            showError('Erro ao redefinir contador');
        }
    }
}

// Registrar transação
async function logTransaction(userId, type, amount, details = {}) {
    try {
        await db.collection('transactions').add({
            userId: userId,
            type: type,
            amount: amount,
            details: details,
            timestamp: new Date().toISOString(),
            adminId: auth.currentUser.uid
        });
    } catch (error) {
        console.error('Erro ao registrar transação:', error);
    }
}

// Funções de utilidade
function showSuccess(message) {
    const statusArea = document.getElementById('statusArea');
    if (statusArea) {
        statusArea.style.display = 'block';
        statusArea.innerHTML = `<div style="background: rgba(0, 255, 136, 0.2); color: #00ff88; padding: 10px; border-radius: 8px; border: 1px solid #00ff88;">${message}</div>`;
        
        setTimeout(() => {
            statusArea.style.display = 'none';
        }, 5000);
    }
}

function showError(message) {
    const statusArea = document.getElementById('statusArea');
    if (statusArea) {
        statusArea.style.display = 'block';
        statusArea.innerHTML = `<div style="background: rgba(255, 107, 107, 0.2); color: #ff6b6b; padding: 10px; border-radius: 8px; border: 1px solid #ff6b6b;">${message}</div>`;
        
        setTimeout(() => {
            statusArea.style.display = 'none';
        }, 5000);
    }
}

function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// Verificar status de autenticação manualmente
async function checkAuthStatus() {
    try {
        const user = auth.currentUser;
        if (!user) {
            showError('❌ Nenhum usuário logado');
            return;
        }
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (!userData) {
            showError('❌ Dados do usuário não encontrados');
            return;
        }
        
        if (userData.role === 'admin') {
            showSuccess(`✅ Admin logado: ${userData.fullName} (${user.email})`);
        } else {
            showError(`❌ Usuário não é admin (role: ${userData.role})`);
        }
        
    } catch (error) {
        showError(`❌ Erro na verificação: ${error.message}`);
    }
}

// Limpar dados de autenticação
function clearAuth() {
    localStorage.clear();
    auth.signOut();
    showSuccess('✅ Dados limpos. Faça login novamente.');
}

// Função para forçar admin a permanecer no painel
function forceAdminStay() {
    console.log('🔒 Forçando admin a permanecer no painel admin');
    
    // Se tentar navegar para index.html, redirecionar de volta para admin
    if (window.location.pathname.includes('index.html')) {
        console.log('🚫 Tentativa de acessar jogo bloqueada, redirecionando para admin');
        window.location.replace('admin.html');
        return;
    }
    
    // Verificar se é admin e está tentando sair do painel
    const currentUser = auth.currentUser;
    if (currentUser) {
        // Verificar role do usuário
        db.collection('users').doc(currentUser.uid).get().then(doc => {
            const userData = doc.data();
            if (userData && userData.role === 'admin') {
                // Se é admin e está tentando acessar jogo, bloquear
                if (window.location.pathname.includes('index.html')) {
                    window.location.replace('admin.html');
                }
            }
        });
    }
}

// Funções globais para uso no HTML
window.addBalance = addBalance;
window.createPromoter = createPromoter;
window.updateSystemSettings = updateSystemSettings;
window.editUser = editUser;
window.addBalanceToUser = addBalanceToUser;
window.makePromoter = makePromoter;
window.toggleUserStatus = toggleUserStatus;
window.checkAuthStatus = checkAuthStatus;
window.clearAuth = clearAuth;
window.forceAdminStay = forceAdminStay;
window.resetUserCounter = resetUserCounter; 