// lobby-firebase.js
document.addEventListener('DOMContentLoaded', () => {
  const userIdEl      = document.getElementById('userIdDisplayLobby');
  const balanceEl     = document.getElementById('saldoDisplayLobby');

  // Verifica token & numericId
  const token = localStorage.getItem('crashGameAuthToken');
  const numericId = localStorage.getItem('crashGameUserId');
  if (!token || !numericId) {
    window.location.href = 'index.html';
    return;
  }

  // Exibe
  userIdEl.textContent  = `ID do Usuário: ${numericId}`;
  const bal = parseFloat(localStorage.getItem('crashGamePlayerBalance')) || 0;
  balanceEl.textContent = bal.toFixed(2);
});

// Função de navegação
function irParaJogo() {
  window.location.href = 'game.html';
}
