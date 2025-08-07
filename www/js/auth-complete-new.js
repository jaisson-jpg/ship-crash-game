// auth-complete-new.js - Sistema de Autenticação Completo e Organizado
console.log('auth-complete-new.js carregado');

// Definir funções imediatamente para garantir disponibilidade
window.fazerLogin = async function() {
    console.log('fazerLogin chamado');
    
    // Aguardar Firebase estar pronto
    await waitForFirebase();
    
    const email = document.getElementById('loginEmail')?.value?.trim().toLowerCase() || '';
    const pass = document.getElementById('loginPassword')?.value || '';
    const authMessage = document.getElementById('authMessage');
    
    console.log('Dados do login:', { email, pass: pass.substring(0, 3) + '***' });
    
    if (!email || !pass) {
        if (authMessage) {
            authMessage.className = 'auth-message error';
            authMessage.textContent = 'Email e senha são obrigatórios!';
        }
        return;
    }
    
    if (authMessage) {
        authMessage.className = 'auth-message';
        authMessage.textContent = 'Fazendo login...';
    }
    
    try {
        console.log('1. Login no Firebase Auth...');
        const auth = firebase.auth();
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        console.log('✅ Login realizado:', cred.user.uid);
        
        console.log('2. Obtendo token...');
        const token = await cred.user.getIdToken();
        console.log('✅ Token obtido');
        
        console.log('3. Buscando dados no Firestore...');
        const db = firebase.firestore();
        const userDoc = await db.collection('users').doc(cred.user.uid).get();
        
        if (!userDoc.exists) {
            throw new Error('Usuário não encontrado no banco de dados');
        }
        
        const userData = userDoc.data();
        console.log('✅ Dados do Firestore:', userData);
        
        // Salvar dados no localStorage para o jogo
        const gameData = {
            userId: userData.numericId || cred.user.uid,
            fullName: userData.fullName || email.split('@')[0],
            balance: userData.balance || 0,
            role: userData.role || 'player',
            firebaseUid: cred.user.uid,
            status: userData.status || 'active'
        };
        
        localStorage.setItem('crashGameAuthToken', 'authenticated');
        localStorage.setItem('crashGameLoggedInUser', JSON.stringify(gameData));
        localStorage.setItem('crashGameUserId', gameData.userId);
        localStorage.setItem('crashGamePlayerBalance', gameData.balance);
        
        console.log('4. Dados salvos no localStorage:', gameData);
        
        if (authMessage) {
            authMessage.className = 'auth-message success';
            authMessage.textContent = 'Login realizado com sucesso!';
        }
        
        console.log('5. Redirecionando para o jogo...');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
        
    } catch(err) {
        console.error('Erro no login:', err);
        
        if (authMessage) {
            authMessage.className = 'auth-message error';
            
            if (err.code === 'auth/user-not-found') {
                authMessage.textContent = 'Usuário não encontrado.';
            } else if (err.code === 'auth/wrong-password') {
                authMessage.textContent = 'Senha incorreta.';
            } else if (err.code === 'auth/network-request-failed') {
                authMessage.textContent = 'Erro de conexão. Verifique sua internet.';
            } else if (err.code === 'auth/invalid-login-credentials') {
                authMessage.textContent = 'Email ou senha incorretos.';
            } else {
                authMessage.textContent = err.message;
            }
        }
    }
};

// Função global para registro
window.fazerRegistro = async function() {
    console.log('fazerRegistro chamado');
    
    // Aguardar Firebase estar pronto
    await waitForFirebase();
    
    const name = document.getElementById('registerFullName')?.value?.trim() || '';
    const email = document.getElementById('registerEmail')?.value?.trim().toLowerCase() || '';
    const cpf = document.getElementById('registerCpf')?.value?.trim() || '';
    const pass = document.getElementById('registerPassword')?.value || '';
    const confirmPass = document.getElementById('registerConfirmPassword')?.value || '';
    const authMessage = document.getElementById('authMessage');
    
    console.log('Dados do registro:', { name, email, cpf, pass: pass.substring(0, 3) + '***' });
    
    if (!name || !email || !cpf || !pass || !confirmPass) {
        if (authMessage) {
            authMessage.className = 'auth-message error';
            authMessage.textContent = 'Todos os campos são obrigatórios!';
        }
        return;
    }
    
    if (pass !== confirmPass) {
        if (authMessage) {
            authMessage.className = 'auth-message error';
            authMessage.textContent = 'As senhas não coincidem!';
        }
        return;
    }
    
    if (pass.length < 6) {
        if (authMessage) {
            authMessage.className = 'auth-message error';
            authMessage.textContent = 'A senha deve ter pelo menos 6 caracteres!';
        }
        return;
    }
    
    if (authMessage) {
        authMessage.className = 'auth-message';
        authMessage.textContent = 'Criando conta...';
    }
    
    try {
        console.log('1. Criando usuário no Firebase Auth...');
        const auth = firebase.auth();
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        console.log('✅ Usuário criado:', cred.user.uid);
        
        console.log('2. Obtendo próximo ID numérico...');
        const db = firebase.firestore();
        const counterDoc = await db.collection('systemSettings').doc('userCounter').get();
        let nextUserId = 100001;
        
        if (counterDoc.exists) {
            nextUserId = counterDoc.data().nextUserId || 100001;
        }
        
        console.log('3. Atualizando contador...');
        await db.collection('systemSettings').doc('userCounter').update({ 
            nextUserId: nextUserId + 1,
            totalUsers: firebase.firestore.FieldValue.increment(1),
            updatedAt: new Date().toISOString()
        });
        
        console.log('4. Obtendo saldo inicial...');
        let initialBalance = 0.00;
        try {
            const settingsDoc = await db.collection('systemSettings').doc('main').get();
            if (settingsDoc.exists) {
                initialBalance = settingsDoc.data().initialBalance || 0.00;
            }
        } catch (error) {
            console.warn('Erro ao obter saldo inicial:', error);
        }
        
        console.log('5. Salvando dados completos no Firestore...');
        const userData = {
            // Dados básicos
            numericId: nextUserId,
            fullName: name,
            email: email,
            cpf: cpf,
            balance: initialBalance,
            role: 'player',
            status: 'active',
            
            // Dados de registro
            registrationDate: new Date().toISOString(),
            lastLoginDate: new Date().toISOString(),
            firebaseUid: cred.user.uid,
            
            // Dados de jogo
            totalGamesPlayed: 0,
            totalBetsPlaced: 0,
            totalWinnings: 0.00,
            totalLosses: 0.00,
            highestWin: 0.00,
            highestMultiplier: 0.00,
            
            // Dados de transações
            totalRecharges: 0,
            totalWithdrawals: 0,
            totalRechargeAmount: 0.00,
            totalWithdrawalAmount: 0.00,
            
            // Dados de notificações
            notifications: {
                rechargeNotifications: true,
                withdrawalNotifications: true,
                gameNotifications: true,
                emailNotifications: false,
                pushNotifications: false
            },
            
            // Dados de segurança
            accountVerified: false,
            emailVerified: false,
            lastPasswordChange: new Date().toISOString(),
            
            // Dados de atividade
            isOnline: true,
            lastActivity: new Date().toISOString(),
            loginCount: 1,
            
            // Dados de preferências
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo',
            theme: 'dark',
            
            // Dados de sistema
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'user-registration'
        };
        
        await db.collection('users').doc(cred.user.uid).set(userData);
        console.log('✅ Dados salvos no Firestore');
        
        console.log('6. Login automático...');
        const loginCred = await auth.signInWithEmailAndPassword(email, pass);
        const loginToken = await loginCred.user.getIdToken();
        
        console.log('7. Salvando dados no localStorage...');
        const gameData = {
            userId: nextUserId,
            fullName: name,
            balance: initialBalance,
            role: 'player',
            firebaseUid: cred.user.uid,
            status: 'active'
        };
        
        localStorage.setItem('crashGameAuthToken', 'authenticated');
        localStorage.setItem('crashGameLoggedInUser', JSON.stringify(gameData));
        localStorage.setItem('crashGameUserId', gameData.userId);
        localStorage.setItem('crashGamePlayerBalance', gameData.balance);
        
        console.log('✅ Dados salvos no localStorage:', gameData);
        
        if (authMessage) {
            authMessage.className = 'auth-message success';
            authMessage.textContent = 'Conta criada com sucesso! Redirecionando...';
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch(err) {
        console.error('Erro no registro:', err);
        
        if (authMessage) {
            authMessage.className = 'auth-message error';
            
            if (err.code === 'auth/email-already-in-use') {
                authMessage.textContent = 'Este e-mail já está em uso.';
            } else if (err.code === 'auth/network-request-failed') {
                authMessage.textContent = 'Erro de conexão. Verifique sua internet.';
            } else {
                authMessage.textContent = err.message;
            }
        }
    }
};

// Aguardar Firebase estar pronto
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
            resolve();
        } else {
            console.log('Aguardando Firebase carregar...');
            setTimeout(() => waitForFirebase().then(resolve), 100);
        }
    });
}

// Função para verificar se o usuário está logado
window.verificarLogin = function() {
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
        console.log('Usuário logado:', currentUser.uid);
        return true;
    }
    return false;
};

// Função para fazer logout
window.fazerLogout = async function() {
    try {
        await firebase.auth().signOut();
        
        // Limpar localStorage
        localStorage.removeItem('crashGameAuthToken');
        localStorage.removeItem('crashGameLoggedInUser');
        localStorage.removeItem('crashGameUserId');
        localStorage.removeItem('crashGamePlayerBalance');
        
        console.log('Logout realizado com sucesso');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro no logout:', error);
    }
};

console.log('auth-complete-new.js: Funções globais criadas imediatamente');

// Verificar se as funções foram criadas corretamente
setTimeout(() => {
    console.log('auth-complete-new.js: Verificação final - fazerLogin existe:', typeof window.fazerLogin);
    console.log('auth-complete-new.js: Verificação final - fazerRegistro existe:', typeof window.fazerRegistro);
    
    if (typeof window.fazerLogin === 'function' && typeof window.fazerRegistro === 'function') {
        console.log('auth-complete-new.js: ✅ Todas as funções foram criadas com sucesso!');
    } else {
        console.error('auth-complete-new.js: ❌ Erro: Funções não foram criadas corretamente!');
    }
}, 1000); 