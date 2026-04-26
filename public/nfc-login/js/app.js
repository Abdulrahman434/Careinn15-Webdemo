document.addEventListener('DOMContentLoaded', () => {
  // Check for Web Serial API support
  if (!('serial' in navigator)) {
    const errorMsg = document.getElementById('error-msg');
    if (errorMsg) {
      errorMsg.textContent = 'Web Serial API is not supported in this browser. Please use Chrome or Edge Desktop.';
      errorMsg.style.display = 'block';
    }
    const connectBtn = document.getElementById('connect-nfc');
    if (connectBtn) connectBtn.disabled = true;
  }

  const reader = new NFCReader();
  const auth = new AuthSystem(reader);
  
  // Login Page Elements
  const connectBtn = document.getElementById('connect-nfc');
  const statusIndicator = document.getElementById('status-text');
  const tapZone = document.getElementById('tap-zone');
  
  const pwInput = document.getElementById('password-input');
  const pwBtn = document.getElementById('login-btn');
  const demoBtn = document.getElementById('demo-btn');
  const errorBox = document.getElementById('error-msg');

  if (connectBtn) {
    reader.onStatusChange = (status) => {
      statusIndicator.textContent = status;
      if (status.includes('Ready')) {
        tapZone.classList.add('ready');
        connectBtn.style.display = 'none';
      } else if (status.includes('Error')) {
        tapZone.classList.remove('ready');
        tapZone.classList.add('error');
        setTimeout(() => tapZone.classList.remove('error'), 2000);
      } else if (status.includes('Success')) {
        tapZone.classList.remove('ready');
        tapZone.classList.add('success');
      }
    };

    connectBtn.addEventListener('click', async () => {
      errorBox.style.display = 'none';
      const connected = await reader.connect();
      if (connected) {
        reader.startPolling();
      }
    });
  }

  // Password fallback
  if (pwBtn && pwInput) {
    pwBtn.addEventListener('click', () => {
      errorBox.style.display = 'none';
      auth.handlePassword(pwInput.value);
    });
    pwInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        errorBox.style.display = 'none';
        auth.handlePassword(pwInput.value);
      }
    });
  }

  // Demo Mode
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      errorBox.style.display = 'none';
      // Simulate reading the authorized card
      if (reader.onStatusChange) reader.onStatusChange('Reading...');
      setTimeout(() => {
        auth.handleCardTap(window.CONFIG ? window.CONFIG.AUTHORIZED_UID : "043F1BFA577080");
      }, 500);
    });
  }

  // Handle Auth Errors for UI displays
  document.addEventListener('auth-error', (e) => {
    if (errorBox) {
      if (e.detail.isPassword) {
        errorBox.textContent = 'Incorrect password.';
      } else {
        errorBox.textContent = 'Card not recognized.';
      }
      errorBox.style.display = 'block';
    }
  });
});
