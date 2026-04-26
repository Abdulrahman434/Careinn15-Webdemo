const CONFIG = {
  AUTHORIZED_UID: "043F1BFA577080",
  AUTHORIZED_PASSWORD: "dallah"
};

class AuthSystem {
  constructor(nfcReader) {
    this.nfcReader = nfcReader;
    
    // Wire up reader callback
    if (this.nfcReader) {
      this.nfcReader.onCardDetected = this.handleCardTap.bind(this);
    }
  }

  async handleCardTap(uid) {
    if (uid === CONFIG.AUTHORIZED_UID) {
      await this.loginSuccess(uid);
    } else {
      await this.loginFailure();
    }
  }

  async handlePassword(password) {
    if (password === CONFIG.AUTHORIZED_PASSWORD) {
      await this.loginSuccess("MANUAL_LOGIN");
    } else {
      await this.loginFailure(true);
    }
  }

  async loginSuccess(uid) {
    if (this.nfcReader && uid !== "MANUAL_LOGIN") {
      this.nfcReader.onStatusChange('Success!');
      await this.nfcReader.playSuccessBeep();
      await this.nfcReader.flashGreenLED();
    }
    
    // Store simple session
    sessionStorage.setItem('patient_id', uid);
    
    // Redirect to home after a brief delay so they see success/hear beep
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 1000);
  }

  async loginFailure(isPassword = false) {
    if (!isPassword && this.nfcReader) {
      this.nfcReader.onStatusChange('Error: Card not recognized');
      await this.nfcReader.playErrorBeep();
      
      // Resume polling after error
      setTimeout(() => {
        this.nfcReader.startPolling();
      }, 2000);
    }
    
    // Dispatch event for UI
    document.dispatchEvent(new CustomEvent('auth-error', {
      detail: { isPassword }
    }));
  }
}
