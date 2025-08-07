// auth-firebase-index.js - Versão específica para index.html
console.log('auth-firebase-index.js carregado');

// Aguardar o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('auth-firebase-index.js: DOM carregado');
  
  // Aguardar um pouco para garantir que todos os scripts foram carregados
  setTimeout(() => {
    console.log('auth-firebase-index.js: Iniciando configuração');
    
    const loginForm        = document.getElementById('loginForm');
    const registerForm     = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showLoginLink    = document.getElementById('showLoginLink');
    const loginEmail       = document.getElementById('loginEmail');
    const loginPassword    = document.getElementById('loginPassword');
    const loginBtn         = document.getElementById('loginBtn');
    const regName          = document.getElementById('registerFullName');
    const regEmail         = document.getElementById('registerEmail');
    const regCpf           = document.getElementById('registerCpf');
    const regPass          = document.getElementById('registerPassword');
    const regConfirm       = document.getElementById('registerConfirmPassword');
    const registerBtn      = document.getElementById('registerBtn');
    const authMessage      = document.getElementById('authMessage');

    console.log('auth-firebase-index.js: Elementos encontrados:', {
      loginForm: !!loginForm,
      registerForm: !!registerForm,
      registerBtn: !!registerBtn,
      loginBtn: !!loginBtn,
      authMessage: !!authMessage
    });

    // Verificar se estamos em uma página com formulários de autenticação
    if (!loginForm || !registerForm) {
      console.log('auth-firebase-index.js: Elementos de formulário não encontrados, saindo...');
      console.log('auth-firebase-index.js: loginForm:', !!loginForm);
      console.log('auth-firebase-index.js: registerForm:', !!registerForm);
      return;
    }

    // Verificar se Firebase está disponível
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
      console.error('auth-firebase-index.js: Firebase não está disponível!');
      return;
    }

    console.log('auth-firebase-index.js: Firebase disponível, configurando eventos...');

    // Configurar eventos apenas se os elementos existirem
    // Nota: showRegisterLink e showLoginLink não existem no index.html
    // Os botões de alternância são configurados diretamente no HTML com onclick
    console.log('auth-firebase-index.js: Elementos de alternância não encontrados, usando funções globais');

    function showError(err) {
      console.error('auth-firebase-index.js: Erro:', err);
      if (!authMessage) {
        console.error('authMessage não encontrado, erro:', err);
        return;
      }
      authMessage.className = 'auth-message error';
      if (err.code === 'auth/email-already-in-use') {
        authMessage.textContent = 'Este e-mail já está em uso.';
      } else if (err.code==='auth/user-not-found' || err.code==='auth/wrong-password') {
        authMessage.textContent = 'Email ou senha inválidos.';
      } else {
        authMessage.textContent = err.message;
      }
    }

    function showSuccess(message) {
      console.log('auth-firebase-index.js: Sucesso:', message);
      if (!authMessage) {
        console.log('authMessage não encontrado, sucesso:', message);
        return;
      }
      authMessage.className = 'auth-message success';
      authMessage.textContent = message;
    }

    // Configurar eventos de botões apenas se existirem
    if (registerBtn) {
      console.log('auth-firebase-index.js: Configurando evento de registro');
      
      // Remover eventos anteriores para evitar duplicação
      registerBtn.onclick = null;
      
      registerBtn.onclick = async (e) => {
        e.preventDefault(); // Prevenir comportamento padrão
        console.log('auth-firebase-index.js: Botão de registro clicado');
        console.log('auth-firebase-index.js: Botão de registro clicado');
        
        const name    = regName ? regName.value.trim() : '';
        const email   = regEmail ? regEmail.value.trim().toLowerCase() : '';
        const cpf     = regCpf ? regCpf.value.replace(/\D/g,'') : '';
        const pass    = regPass ? regPass.value : '';
        const confirm = regConfirm ? regConfirm.value : '';
        
        console.log('auth-firebase-index.js: Dados do formulário:', { name, email, cpf: cpf.substring(0, 3) + '***' });
        
        if (authMessage) authMessage.className = 'auth-message';

        if (!name||!email||!cpf||!pass||!confirm) {
          if (authMessage) authMessage.textContent = 'Preencha todos os campos!';
          return;
        }
        if (cpf.length!==11) {
          if (authMessage) authMessage.textContent = 'CPF deve ter 11 dígitos!';
          return;
        }
        if (pass.length<6) {
          if (authMessage) authMessage.textContent = 'Senha mínimo 6 caracteres.';
          return;
        }
        if (pass!==confirm) {
          if (authMessage) authMessage.textContent = 'Senhas não coincidem!';
          return;
        }

        try {
          console.log('auth-firebase-index.js: === INICIANDO CADASTRO ===');
          console.log('auth-firebase-index.js: Dados do cadastro:', { name, email, cpf: cpf.substring(0, 3) + '***' });
          console.log('auth-firebase-index.js: Verificando se Firebase está disponível...');
          console.log('auth-firebase-index.js: auth disponível:', typeof auth !== 'undefined');
          console.log('auth-firebase-index.js: db disponível:', typeof db !== 'undefined');
          
          // Primeiro, criar conta no Firebase Auth
          console.log('auth-firebase-index.js: 1. Criando conta no Firebase Auth...');
          console.log('auth-firebase-index.js: Email:', email);
          console.log('auth-firebase-index.js: Senha:', pass.substring(0, 3) + '***');
          
          const cred = await auth.createUserWithEmailAndPassword(email, pass);
          console.log('auth-firebase-index.js: ✅ Conta criada no Firebase Auth:', cred.user.uid);
          
          // Obter saldo inicial das configurações do sistema
          console.log('auth-firebase-index.js: 2. Obtendo saldo inicial...');
          let initialBalance = 0.00;
          try {
            const settingsDoc = await db.collection('systemSettings').doc('main').get();
            if (settingsDoc.exists) {
              initialBalance = settingsDoc.data().initialBalance || 0.00;
              console.log('auth-firebase-index.js: ✅ Saldo inicial obtido:', initialBalance);
            } else {
              console.log('auth-firebase-index.js: ⚠️ Configurações do sistema não encontradas, usando saldo padrão');
            }
          } catch (error) {
            console.warn('auth-firebase-index.js: ⚠️ Erro ao obter configurações do sistema, usando saldo padrão:', error);
          }
          
          // Obter próximo ID sequencial
          console.log('auth-firebase-index.js: 3. Obtendo próximo ID sequencial...');
          let nextUserId = 100001; // ID inicial
          
          try {
              // Verificar se existe contador no sistema
              const counterDoc = await db.collection('systemSettings').doc('userCounter').get();
              
              if (counterDoc.exists) {
                  nextUserId = counterDoc.data().nextUserId || 100001;
                  console.log('auth-firebase-index.js: ✅ Próximo ID obtido:', nextUserId);
              } else {
                  console.log('auth-firebase-index.js: ⚠️ Contador não encontrado, criando inicial...');
                  // Criar contador inicial
                  await db.collection('systemSettings').doc('userCounter').set({
                      nextUserId: 100001,
                      createdAt: new Date().toISOString()
                  });
              }
              
              // Incrementar contador para próximo usuário
              await db.collection('systemSettings').doc('userCounter').update({
                  nextUserId: nextUserId + 1,
                  updatedAt: new Date().toISOString()
              });
              console.log('auth-firebase-index.js: ✅ Contador atualizado');
              
          } catch (error) {
              console.warn('auth-firebase-index.js: ⚠️ Erro ao obter contador de usuários, usando ID padrão:', error);
          }
          
          // Criar dados do usuário no Firestore
          console.log('auth-firebase-index.js: 4. Salvando dados no Firestore...');
          const userData = {
              numericId: nextUserId, // ID sequencial
              fullName: name,
              email: email,
              cpf: cpf,
              balance: initialBalance, // Saldo inicial das configurações do sistema
              role: 'player', // Pode ser 'player', 'promoter' ou 'admin'
              status: 'active',
              registrationDate: new Date().toISOString(),
              firebaseUid: cred.user.uid // Referência ao Firebase Auth
          };
          
          await db.collection('users').doc(cred.user.uid).set(userData);
          console.log('auth-firebase-index.js: ✅ Dados salvos no Firestore:', userData);

          // Após cadastro bem-sucedido, fazer login automático
          console.log('auth-firebase-index.js: 5. Realizando login automático...');
          try {
            const loginCred = await auth.signInWithEmailAndPassword(email, pass);
            const loginToken = await loginCred.user.getIdToken();
            console.log('auth-firebase-index.js: ✅ Login automático realizado');
            
            // Buscar dados do usuário no Firestore
            console.log('auth-firebase-index.js: 6. Buscando dados do usuário no Firestore...');
            const loginSnap = await db.collection('users').doc(loginCred.user.uid).get();
            const loginData = loginSnap.exists ? loginSnap.data() : {};

            const loginUserId = loginData.numericId || loginCred.user.uid;
            const loginFullName = loginData.fullName || name;
            const loginBalance = loginData.balance || 0;
            const loginRole = loginData.role || 'player';

            console.log('auth-firebase-index.js: ✅ Dados do usuário obtidos:', { loginUserId, loginFullName, loginBalance, loginRole });

            // Usar o AuthManager para salvar dados
            console.log('auth-firebase-index.js: 7. Salvando dados via AuthManager...');
            authManager.saveAuthData(loginToken, loginUserId, loginFullName, loginBalance, loginRole);
            console.log('auth-firebase-index.js: ✅ Dados salvos via AuthManager');
              
            showSuccess('Conta criada com sucesso! Redirecionando para o jogo...');
            
            // Limpar formulários
            if (typeof clearForms === 'function') {
              clearForms();
            }
            
            // Aguardar um pouco e redirecionar para o lobby
            setTimeout(() => {
              if (window.location.pathname.includes('index.html')) {
                // Se estiver na página index.html, mostrar o lobby
                if (typeof showLobby === 'function') {
                  console.log('auth-firebase-index.js: Chamando showLobby()...');
                  showLobby();
                } else {
                  console.log('auth-firebase-index.js: showLobby não está disponível, redirecionando...');
                  window.location.replace('index.html');
                }
              } else {
                // Se estiver em outra página, redirecionar para index.html
                window.location.replace('index.html');
              }
            }, 1500);
            
          } catch (loginError) {
            console.error('auth-firebase-index.js: Erro no login automático:', loginError);
            showSuccess('Cadastro realizado com sucesso! Faça login.');
            if (showLoginLink) setTimeout(() => showLoginLink.click(), 1500);
          }
        } catch(err) {
          console.error('auth-firebase-index.js: Erro no cadastro:', err);
          showError(err);
        }
      };
    }

    if (loginBtn) {
      console.log('auth-firebase-index.js: Configurando evento de login');
      loginBtn.onclick = async () => {
        console.log('auth-firebase-index.js: Botão de login clicado');
        
        const email = loginEmail ? loginEmail.value.trim().toLowerCase() : '';
        const pass  = loginPassword ? loginPassword.value : '';
        
        if (authMessage) authMessage.className = 'auth-message';

        if (!email||!pass) {
          if (authMessage) authMessage.textContent = 'Email e senha são obrigatórios!';
          return;
        }

        try {
          console.log('auth-firebase-index.js: Realizando login...');
          console.log('auth-firebase-index.js: Dados do login:', { email, pass: pass.substring(0, 3) + '***' });
          
          // Verificar conectividade antes de tentar login
          console.log('auth-firebase-index.js: Verificando conectividade...');
          try {
            await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
            console.log('auth-firebase-index.js: ✅ Conectividade básica OK');
          } catch (connectError) {
            console.error('auth-firebase-index.js: ❌ Problema de conectividade básica:', connectError);
            if (authMessage) {
              authMessage.className = 'auth-message error';
              authMessage.textContent = 'Problema de conectividade. Verifique sua internet.';
            }
            return;
          }
          
          // 1. Login no Firebase Auth com timeout
          console.log('auth-firebase-index.js: 1. Login no Firebase Auth...');
          const loginPromise = auth.signInWithEmailAndPassword(email, pass);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: Login demorou muito')), 10000)
          );
          
          const cred = await Promise.race([loginPromise, timeoutPromise]);
          console.log('auth-firebase-index.js: ✅ Login no Firebase Auth realizado:', cred.user.uid);
          
          // 2. Obter token com timeout
          console.log('auth-firebase-index.js: 2. Obtendo token...');
          const tokenPromise = cred.user.getIdToken();
          const tokenTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: Token demorou muito')), 10000)
          );
          
          const token = await Promise.race([tokenPromise, tokenTimeoutPromise]);
          console.log('auth-firebase-index.js: ✅ Token obtido');
          
          // 3. Buscar dados no Firestore com timeout
          console.log('auth-firebase-index.js: 3. Buscando dados no Firestore...');
          const firestorePromise = db.collection('users').doc(cred.user.uid).get();
          const firestoreTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: Firestore demorou muito')), 10000)
          );
          
          const snap = await Promise.race([firestorePromise, firestoreTimeoutPromise]);
          const data = snap.exists ? snap.data() : {};
          console.log('auth-firebase-index.js: ✅ Dados do Firestore:', data);

          // 4. Preparar dados para AuthManager
          const userId = data.numericId || cred.user.uid;
          const fullName = data.fullName || email.split('@')[0];
          const balance = data.balance || 0;
          const role = data.role || 'player';

          console.log('auth-firebase-index.js: 4. Dados preparados:', { userId, fullName, balance, role });

          // 5. Usar o AuthManager para salvar dados
          console.log('auth-firebase-index.js: 5. Salvando dados via AuthManager...');
          authManager.saveAuthData(token, userId, fullName, balance, role);
          console.log('auth-firebase-index.js: ✅ Dados salvos via AuthManager');

          // 6. Verificar se o login foi bem-sucedido
          console.log('auth-firebase-index.js: 6. Verificando se está logado...');
          const isLoggedIn = authManager.isLoggedIn();
          console.log('auth-firebase-index.js: Usuário logado:', isLoggedIn);
          
          if (isLoggedIn) {
            const currentUser = authManager.getCurrentUser();
            console.log('auth-firebase-index.js: Dados do usuário atual:', currentUser);
          }

          console.log('auth-firebase-index.js: Login bem-sucedido:', { userId, fullName, balance });
          
          // 7. Redirecionar para o lobby
          console.log('auth-firebase-index.js: 7. Redirecionando para index.html...');
          window.location.href = 'index.html';
        } catch(err) {
          console.error('auth-firebase-index.js: Erro detalhado no login:', err);
          console.error('auth-firebase-index.js: Código do erro:', err.code);
          console.error('auth-firebase-index.js: Mensagem do erro:', err.message);
          
          // Tratamento específico para diferentes tipos de erro
          if (err.code === 'auth/network-request-failed') {
            console.error('auth-firebase-index.js: ERRO DE REDE DETECTADO!');
            console.error('auth-firebase-index.js: Possíveis causas:');
            console.error('auth-firebase-index.js: 1. Problema de conectividade com a internet');
            console.error('auth-firebase-index.js: 2. Firebase temporariamente indisponível');
            console.error('auth-firebase-index.js: 3. Firewall ou proxy bloqueando');
            console.error('auth-firebase-index.js: 4. Configuração incorreta do Firebase');
            
            if (authMessage) {
              authMessage.className = 'auth-message error';
              authMessage.textContent = 'Erro de conexão. Verifique sua internet e tente novamente.';
            }
          } else if (err.code === 'auth/user-not-found') {
            console.error('auth-firebase-index.js: USUÁRIO NÃO ENCONTRADO!');
            if (authMessage) {
              authMessage.className = 'auth-message error';
              authMessage.textContent = 'Usuário não encontrado. Verifique o email.';
            }
          } else if (err.code === 'auth/wrong-password') {
            console.error('auth-firebase-index.js: SENHA INCORRETA!');
            if (authMessage) {
              authMessage.className = 'auth-message error';
              authMessage.textContent = 'Senha incorreta. Tente novamente.';
            }
          } else if (err.code === 'auth/invalid-email') {
            console.error('auth-firebase-index.js: EMAIL INVÁLIDO!');
            if (authMessage) {
              authMessage.className = 'auth-message error';
              authMessage.textContent = 'Email inválido. Verifique o formato.';
            }
          } else if (err.code === 'auth/too-many-requests') {
            console.error('auth-firebase-index.js: MUITAS TENTATIVAS!');
            if (authMessage) {
              authMessage.className = 'auth-message error';
              authMessage.textContent = 'Muitas tentativas. Aguarde um pouco e tente novamente.';
            }
          } else {
            console.error('auth-firebase-index.js: ERRO DESCONHECIDO!');
            showError(err);
          }
        }
      };
    }

    console.log('auth-firebase-index.js: Configuração concluída');
  }, 1000); // Aguardar 1 segundo para garantir que tudo foi carregado
}); 