// auth-simple-direct.js - Sistema de Autenticação Simples e Direto
console.log('auth-simple-direct.js carregado');

// Função global para login
window.fazerLogin = async function() {
    console.log('fazerLogin chamado');
    
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
        // Verificar se Firebase está disponível
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase não está carregado');
        }
        
        console.log('1. Login no Firebase Auth...');
        const cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
        console.log('✅ Login realizado:', cred.user.uid);
        
        console.log('2. Obtendo token...');
        const token = await cred.user.getIdToken();
        console.log('✅ Token obtido');
        
        console.log('3. Buscando dados no Firestore...');
        const userDoc = await firebase.firestore().collection('users').doc(cred.user.uid).get();
        
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
            firebaseUid: cred.user.uid
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
            window.location.href = 'game.html';
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
    
    const name = document.getElementById('registerFullName')?.value?.trim() || '';
    const email = document.getElementById('registerEmail')?.value?.trim().toLowerCase() || '';
    const cpf = document.getElementById('registerCpf')?.value?.replace(/\D/g,'') || '';
    const pass = document.getElementById('registerPassword')?.value || '';
    const confirm = document.getElementById('registerConfirmPassword')?.value || '';
    const authMessage = document.getElementById('authMessage');
    
    console.log('Dados do registro:', { name, email, cpf: cpf.substring(0, 3) + '***' });
    
    if (!name || !email || !cpf || !pass || !confirm) {
        if (authMessage) {
            authMessage.className = 'auth-message error';
            authMessage.textContent = 'Preencha todos os campos!';
        }
        return;
    }
    
    if (cpf.length !== 11) {
        if (authMessage) {
            authMessage.className = 'auth-message error';
            authMessage.textContent = 'CPF deve ter 11 dígitos!';
        }
        return;
    }
    
    if (pass.length < 6) {
        if (authMessage) {
            authMessage.className = 'auth-message error';
            authMessage.textContent = 'Senha mínimo 6 caracteres.';
        }
        return;
    }
    
    if (pass !== confirm) {
        if (authMessage) {
            authMessage.className = 'auth-message error';
            authMessage.textContent = 'Senhas não coincidem!';
        }
        return;
    }
    
    if (authMessage) {
        authMessage.className = 'auth-message';
        authMessage.textContent = 'Criando conta...';
    }
    
    try {
        // Verificar se Firebase está disponível
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase não está carregado');
        }
        
        console.log('1. Criando conta no Firebase Auth...');
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        console.log('✅ Conta criada:', cred.user.uid);
        
        console.log('2. Obtendo saldo inicial...');
        let initialBalance = 0.00;
        try {
            const settingsDoc = await firebase.firestore().collection('systemSettings').doc('main').get();
            if (settingsDoc.exists) {
                initialBalance = settingsDoc.data().initialBalance || 0.00;
            }
        } catch (error) {
            console.warn('Erro ao obter saldo inicial:', error);
        }
        
        console.log('3. Obtendo próximo ID...');
        let nextUserId = 100001;
        try {
            const counterDoc = await firebase.firestore().collection('systemSettings').doc('userCounter').get();
            if (counterDoc.exists) {
                nextUserId = counterDoc.data().nextUserId || 100001;
            } else {
                await firebase.firestore().collection('systemSettings').doc('userCounter').set({
                    nextUserId: 100001,
                    createdAt: new Date().toISOString()
                });
            }
            await firebase.firestore().collection('systemSettings').doc('userCounter').update({
                nextUserId: nextUserId + 1,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.warn('Erro ao obter contador:', error);
        }
        
        console.log('4. Salvando dados no Firestore...');
        const userData = {
            numericId: nextUserId,
            fullName: name,
            email: email,
            cpf: cpf,
            balance: initialBalance,
            role: 'player',
            status: 'active',
            registrationDate: new Date().toISOString(),
            firebaseUid: cred.user.uid
        };
        
        await firebase.firestore().collection('users').doc(cred.user.uid).set(userData);
        console.log('✅ Dados salvos no Firestore');
        
        console.log('5. Login automático...');
        const loginCred = await firebase.auth().signInWithEmailAndPassword(email, pass);
        const loginToken = await loginCred.user.getIdToken();
        
        console.log('6. Salvando dados no localStorage...');
        const gameData = {
            userId: nextUserId,
            fullName: name,
            balance: initialBalance,
            role: 'player',
            firebaseUid: cred.user.uid
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
            window.location.href = 'game.html';
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

console.log('auth-simple-direct.js: Funções globais criadas');
console.log('auth-simple-direct.js: fazerLogin existe:', typeof window.fazerLogin);
console.log('auth-simple-direct.js: fazerRegistro existe:', typeof window.fazerRegistro); 