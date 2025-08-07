// auth-firebase.js
document.addEventListener('DOMContentLoaded', () => {
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

  // Verificar se estamos em uma página com formulários de autenticação
  if (!loginForm || !registerForm) {
    console.log('auth-firebase.js: Elementos de formulário não encontrados, saindo...');
    return;
  }

  // Configurar eventos apenas se os elementos existirem
  if (showRegisterLink) {
    showRegisterLink.onclick = e => {
      e.preventDefault();
      loginForm.style.display    = 'none';
      registerForm.style.display = 'block';
      if (authMessage) authMessage.textContent = '';
    };
  }

  if (showLoginLink) {
    showLoginLink.onclick = e => {
      e.preventDefault();
      registerForm.style.display = 'none';
      loginForm.style.display    = 'block';
      if (authMessage) authMessage.textContent = '';
    };
  }

  function showError(err) {
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
    if (!authMessage) {
      console.log('authMessage não encontrado, sucesso:', message);
      return;
    }
    authMessage.className = 'auth-message success';
    authMessage.textContent = message;
  }

  // Configurar eventos de botões apenas se existirem
  if (registerBtn) {
    registerBtn.onclick = async () => {
      const name    = regName ? regName.value.trim() : '';
      const email   = regEmail ? regEmail.value.trim().toLowerCase() : '';
      const cpf     = regCpf ? regCpf.value.replace(/\D/g,'') : '';
      const pass    = regPass ? regPass.value : '';
      const confirm = regConfirm ? regConfirm.value : '';
      
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
      console.log('=== INICIANDO CADASTRO ===');
      console.log('Dados do cadastro:', { name, email, cpf: cpf.substring(0, 3) + '***' });
      
      // Primeiro, criar conta no Firebase Auth
      console.log('1. Criando conta no Firebase Auth...');
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      console.log('✅ Conta criada no Firebase Auth:', cred.user.uid);
      
      // Obter saldo inicial das configurações do sistema
      console.log('2. Obtendo saldo inicial...');
      let initialBalance = 0.00;
      try {
        const settingsDoc = await db.collection('systemSettings').doc('main').get();
        if (settingsDoc.exists) {
          initialBalance = settingsDoc.data().initialBalance || 0.00;
          console.log('✅ Saldo inicial obtido:', initialBalance);
        } else {
          console.log('⚠️ Configurações do sistema não encontradas, usando saldo padrão');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao obter configurações do sistema, usando saldo padrão:', error);
      }
      
      // Obter próximo ID sequencial
      console.log('3. Obtendo próximo ID sequencial...');
      let nextUserId = 100001; // ID inicial
      
      try {
          // Verificar se existe contador no sistema
          const counterDoc = await db.collection('systemSettings').doc('userCounter').get();
          
          if (counterDoc.exists) {
              nextUserId = counterDoc.data().nextUserId || 100001;
              console.log('✅ Próximo ID obtido:', nextUserId);
          } else {
              console.log('⚠️ Contador não encontrado, criando inicial...');
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
          console.log('✅ Contador atualizado');
          
      } catch (error) {
          console.warn('⚠️ Erro ao obter contador de usuários, usando ID padrão:', error);
      }
      
      // Criar dados do usuário no Firestore
      console.log('4. Salvando dados no Firestore...');
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
      console.log('✅ Dados salvos no Firestore:', userData);

                    // Após cadastro bem-sucedido, fazer login automático
      console.log('5. Realizando login automático...');
      try {
        const loginCred = await auth.signInWithEmailAndPassword(email, pass);
        const loginToken = await loginCred.user.getIdToken();
        console.log('✅ Login automático realizado');
        
        // Buscar dados do usuário no Firestore
        console.log('6. Buscando dados do usuário no Firestore...');
        const loginSnap = await db.collection('users').doc(loginCred.user.uid).get();
        const loginData = loginSnap.exists ? loginSnap.data() : {};

        const loginUserId = loginData.numericId || loginCred.user.uid;
        const loginFullName = loginData.fullName || name;
        const loginBalance = loginData.balance || 0;
        const loginRole = loginData.role || 'player';

        console.log('✅ Dados do usuário obtidos:', { loginUserId, loginFullName, loginBalance, loginRole });

        // Usar o AuthManager para salvar dados
        console.log('7. Salvando dados via AuthManager...');
        authManager.saveAuthData(loginToken, loginUserId, loginFullName, loginBalance, loginRole);
        console.log('✅ Dados salvos via AuthManager');
          
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
                console.log('Chamando showLobby()...');
                showLobby();
              } else {
                console.log('showLobby não está disponível, redirecionando...');
                window.location.replace('index.html');
              }
            } else {
              // Se estiver em outra página, redirecionar para index.html
              window.location.replace('index.html');
            }
          }, 1500);
          
                 } catch (loginError) {
           console.error('Erro no login automático:', loginError);
           showSuccess('Cadastro realizado com sucesso! Faça login.');
           if (showLoginLink) setTimeout(() => showLoginLink.click(), 1500);
         }
       } catch(err) {
         showError(err);
       }
     };
   }

  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = loginEmail ? loginEmail.value.trim().toLowerCase() : '';
      const pass  = loginPassword ? loginPassword.value : '';
      
      if (authMessage) authMessage.className = 'auth-message';

      if (!email||!pass) {
        if (authMessage) authMessage.textContent = 'Email e senha são obrigatórios!';
        return;
      }

    try {
      const cred  = await auth.signInWithEmailAndPassword(email, pass);
      const token = await cred.user.getIdToken();
      const snap  = await db.collection('users').doc(cred.user.uid).get();
      const data  = snap.exists ? snap.data() : {};

      // Garantir que temos um userId válido
      const userId = data.numericId || cred.user.uid;
      const fullName = data.fullName || email.split('@')[0];
      const balance = data.balance || 0;
      const role = data.role || 'player';

      // Usar o AuthManager para salvar dados
      authManager.saveAuthData(token, userId, fullName, balance, role);

      console.log('Login bem-sucedido:', { userId, fullName, balance });
      
      // Redirecionar para o lobby
      window.location.href = 'index.html';
    } catch(err) {
      showError(err);
    }
  };
  }

  // Verificar se já está logado ao carregar a página
  auth.onAuthStateChanged(async (user) => {
    if (user && location.pathname.endsWith('index.html')) {
      try {
        const token = await user.getIdToken();
        const snap = await db.collection('users').doc(user.uid).get();
        const data = snap.exists ? snap.data() : {};

        const userId = data.numericId || user.uid;
        const fullName = data.fullName || user.email.split('@')[0];
        const balance = data.balance || 0;
        const role = data.role || 'player';

        // Usar o AuthManager para salvar dados
        authManager.saveAuthData(token, userId, fullName, balance, role);

        console.log('Usuário já logado, dados salvos automaticamente');
        // Não redirecionar - deixar a página index.html lidar com a exibição
      } catch (error) {
        console.error('Erro ao verificar estado de autenticação:', error);
      }
    }
  });
});

