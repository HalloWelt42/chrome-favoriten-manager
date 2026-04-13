/**
 * FavGrid Spendenseite
 */
function init() {
  // Ko-fi
  if (DONATE_CONFIG.kofi) {
    document.getElementById('kofi-btn').href = DONATE_CONFIG.kofi;
  }
  
  // Crypto
  Object.keys(DONATE_CONFIG.crypto).forEach(coin => {
    const data = DONATE_CONFIG.crypto[coin];
    const addrEl = document.getElementById(coin + '-address');
    const qrEl = document.getElementById(coin + '-qr');
    
    if (addrEl) addrEl.textContent = data.address;
    if (qrEl && data.qrFile) {
      const img = document.createElement('img');
      img.src = data.qrFile;
      img.alt = data.label + ' QR Code';
      qrEl.textContent = '';
      qrEl.appendChild(img);
    }
  });
  
  // Tab switching
  document.querySelectorAll('.crypto-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.crypto-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.crypto-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('crypto-' + tab.dataset.crypto).classList.add('active');
    });
  });
  
  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const coin = btn.dataset.coin;
      const address = DONATE_CONFIG.crypto[coin].address;
      navigator.clipboard.writeText(address).then(() => {
        const textEl = btn.querySelector('.copy-text');
        const original = textEl.textContent;
        textEl.textContent = (typeof t === 'function') ? t('copied') : 'Kopiert!';
        setTimeout(() => textEl.textContent = original, 2000);
      });
    });
  });
}

init();
