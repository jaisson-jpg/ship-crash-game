// Sistema de Promotor - JavaScript
class PromotorSystem {
    constructor() {
        this.currentUser = null;
        this.transactions = [];
        this.isOnline = true;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadUserData();
        this.updateTime();
        this.setupEventListeners();
        this.loadTransactions();
        
        // Atualizar tempo a cada minuto
        setInterval(() => this.updateTime(), 60000);
    }

    checkAuth() {
        // Aguardar um pouco para o AuthManager inicializar
        setTimeout(() => {
            if (!authManager.isLoggedIn()) {
                console.log("PROMOTOR: Usuário não logado, redirecionando...");
                window.location.href = 'index.html';
                return;
            }

            this.currentUser = authManager.getCurrentUser();
            if (!this.currentUser) {
                console.log("PROMOTOR: Dados do usuário não encontrados, redirecionando...");
                window.location.href = 'index.html';
                return;
            }

            // Permitir acesso mesmo se não for promotor (para teste)
            if (this.currentUser.role !== 'promoter') {
                console.log("PROMOTOR: Usuário não é promotor, mas permitindo acesso para teste");
                // window.location.href = 'index.html';
            }
        }, 200);
    }

    loadUserData() {
        if (!this.currentUser) return;

        // Atualizar informações do usuário
        document.getElementById('userId').textContent = this.currentUser.userId;
        document.getElementById('userRole').textContent = this.currentUser.role || 'Assistente';
        document.getElementById('systemBalance').textContent = this.currentUser.balance || '0.00';
        document.getElementById('storeBalance').textContent = this.currentUser.storeBalance || '200.00';
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        document.getElementById('currentTime').textContent = timeString;
    }

    setupEventListeners() {
        // Toggle online/offline
        document.getElementById('onlineToggle').addEventListener('change', (e) => {
            this.isOnline = e.target.checked;
            this.updateOnlineStatus();
        });

        // Formulários
        document.getElementById('sellForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processSell();
        });

        document.getElementById('withdrawForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.processWithdraw();
        });
    }

    updateOnlineStatus() {
        const statusText = document.querySelector('.status-text');
        const statusIcon = document.querySelector('.status-icon');
        
        if (this.isOnline) {
            statusText.textContent = 'Online';
            statusText.style.color = '#28a745';
            statusIcon.textContent = '🛒';
        } else {
            statusText.textContent = 'Offline';
            statusText.style.color = '#dc3545';
            statusIcon.textContent = '⏸️';
        }
    }

    // Funções dos modais
    openSellModal() {
        document.getElementById('sellModal').style.display = 'block';
    }

    openWithdrawModal() {
        document.getElementById('withdrawModal').style.display = 'block';
    }

    openDetailsModal() {
        document.getElementById('detailsModal').style.display = 'block';
        this.loadTransactionDetails();
    }

    openDataModal() {
        this.showDataModal();
    }

    openShopModal() {
        this.showShopModal();
    }

    openDeductModal() {
        this.showDeductModal();
    }

    openContactModal() {
        this.showContactModal();
    }

    openCouponModal() {
        this.showCouponModal();
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // Processar venda
    processSell() {
        const clientId = document.getElementById('clientId').value;
        const amount = parseInt(document.getElementById('sellAmount').value);
        const price = parseFloat(document.getElementById('sellPrice').value);

        if (!clientId || !amount || !price) {
            alert('Preencha todos os campos!');
            return;
        }

        const transaction = {
            id: Date.now(),
            type: 'sell',
            clientId: clientId,
            amount: amount,
            price: price,
            total: amount * price,
            date: new Date().toISOString(),
            promoterId: this.currentUser.userId
        };

        this.transactions.push(transaction);
        this.saveTransactions();
        this.updateBalances(transaction.total);

        alert(`Venda realizada com sucesso!\nTotal: R$ ${transaction.total.toFixed(2)}`);
        this.closeModal('sellModal');
        document.getElementById('sellForm').reset();
    }

    // Processar saque
    processWithdraw() {
        const clientId = document.getElementById('withdrawClientId').value;
        const amount = parseInt(document.getElementById('withdrawAmount').value);
        const paymentMethod = document.getElementById('paymentMethod').value;

        if (!clientId || !amount || !paymentMethod) {
            alert('Preencha todos os campos!');
            return;
        }

        const transaction = {
            id: Date.now(),
            type: 'withdraw',
            clientId: clientId,
            amount: amount,
            paymentMethod: paymentMethod,
            date: new Date().toISOString(),
            promoterId: this.currentUser.userId
        };

        this.transactions.push(transaction);
        this.saveTransactions();

        alert(`Saque solicitado com sucesso!\nQuantidade: ${amount} fichas\nMétodo: ${paymentMethod}`);
        this.closeModal('withdrawModal');
        document.getElementById('withdrawForm').reset();
    }

    // Carregar detalhes das transações
    loadTransactionDetails() {
        const salesList = document.getElementById('salesList');
        const withdrawalsList = document.getElementById('withdrawalsList');

        const sales = this.transactions.filter(t => t.type === 'sell');
        const withdrawals = this.transactions.filter(t => t.type === 'withdraw');

        salesList.innerHTML = sales.length ? '' : '<p>Nenhuma venda encontrada</p>';
        withdrawalsList.innerHTML = withdrawals.length ? '' : '<p>Nenhum saque encontrado</p>';

        sales.forEach(sale => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <h4>Venda #${sale.id}</h4>
                <p><strong>Cliente:</strong> ${sale.clientId}</p>
                <p><strong>Quantidade:</strong> ${sale.amount} fichas</p>
                <p><strong>Valor por ficha:</strong> R$ ${sale.price.toFixed(2)}</p>
                <p><strong>Total:</strong> R$ ${sale.total.toFixed(2)}</p>
                <p><strong>Data:</strong> ${new Date(sale.date).toLocaleString('pt-BR')}</p>
            `;
            salesList.appendChild(item);
        });

        withdrawals.forEach(withdrawal => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <h4>Saque #${withdrawal.id}</h4>
                <p><strong>Cliente:</strong> ${withdrawal.clientId}</p>
                <p><strong>Quantidade:</strong> ${withdrawal.amount} fichas</p>
                <p><strong>Método:</strong> ${withdrawal.paymentMethod}</p>
                <p><strong>Data:</strong> ${new Date(withdrawal.date).toLocaleString('pt-BR')}</p>
            `;
            withdrawalsList.appendChild(item);
        });
    }

    // Tabs
    showTab(tabName) {
        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => tab.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));

        event.target.classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
    }

    // Salvar transações no localStorage
    saveTransactions() {
        localStorage.setItem('promotorTransactions', JSON.stringify(this.transactions));
    }

    // Carregar transações do localStorage
    loadTransactions() {
        const saved = localStorage.getItem('promotorTransactions');
        if (saved) {
            this.transactions = JSON.parse(saved);
        }
    }

    // Atualizar saldos
    updateBalances(amount) {
        const currentBalance = parseFloat(document.getElementById('systemBalance').textContent);
        const newBalance = currentBalance + amount;
        document.getElementById('systemBalance').textContent = newBalance.toFixed(4);
        
        // Atualizar no AuthManager
        authManager.updateBalance(newBalance);
    }

    // Modais adicionais (implementações básicas)
    showDataModal() {
        alert('Funcionalidade de Dados em desenvolvimento');
    }

    showShopModal() {
        alert('Funcionalidade de Loja em desenvolvimento');
    }

    showDeductModal() {
        alert('Funcionalidade de Deduzir Bilhete em desenvolvimento');
    }

    showContactModal() {
        alert('Funcionalidade de Alterar Contato em desenvolvimento');
    }

    showCouponModal() {
        alert('Funcionalidade de Enviar Cupom em desenvolvimento');
    }

    showIncreaseModal() {
        alert('Funcionalidade de Aumentar Dindin/Diamante em desenvolvimento');
    }
}

// Funções globais para os modais
function openSellModal() {
    promotorSystem.openSellModal();
}

function openWithdrawModal() {
    promotorSystem.openWithdrawModal();
}

function openDetailsModal() {
    promotorSystem.openDetailsModal();
}

function openDataModal() {
    promotorSystem.openDataModal();
}

function openShopModal() {
    promotorSystem.openShopModal();
}

function openDeductModal() {
    promotorSystem.openDeductModal();
}

function openContactModal() {
    promotorSystem.openContactModal();
}

function openCouponModal() {
    promotorSystem.openCouponModal();
}

function closeModal(modalId) {
    promotorSystem.closeModal(modalId);
}

function showTab(tabName) {
    promotorSystem.showTab(tabName);
}

function showIncreaseModal() {
    promotorSystem.showIncreaseModal();
}

// Inicializar sistema quando a página carregar
let promotorSystem;
document.addEventListener('DOMContentLoaded', () => {
    promotorSystem = new PromotorSystem();
});

// Fechar modais clicando fora
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
} 