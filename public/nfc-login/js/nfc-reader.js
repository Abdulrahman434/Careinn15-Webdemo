class NFCReader {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isPolling = false;
    this.pollingInterval = null;
    
    // Callbacks
    this.onStatusChange = null;
    this.onCardDetected = null;
    this.onError = null;
  }

  // --- PARRA Protocol Helpers ---

  /**
   * Calculates the XOR checksum for PARRA frames.
   * Total XOR of all bytes including the checksum byte must equal 0.
   */
  calculateXOR(bytes) {
    let result = 0;
    for (const b of bytes) {
      result ^= b;
    }
    return result;
  }

  /**
   * Build a complete PARRA frame.
   * Frame Signature: 0x50 ACK
   * Length: 2 bytes (High, Low) representing the length of CMD + Data.
   */
  buildFrame(cmd, data = []) {
    const header = 0x50;
    const lengthRaw = 1 + data.length; // 1 byte CMD + data
    const lenH = (lengthRaw >> 8) & 0xFF;
    const lenL = lengthRaw & 0xFF;
    
    const frameWithoutXor = [header, lenH, lenL, cmd, ...data];
    const xor = this.calculateXOR(frameWithoutXor);
    
    return new Uint8Array([...frameWithoutXor, xor]);
  }

  /**
   * Parse a PARRA frame.
   */
  parseFrame(bytes) {
    if (bytes.length < 5) {
      return { success: false, error: 'Frame too short' };
    }
    
    const startByte = bytes[0];
    
    // XOR validation
    const xorCheck = this.calculateXOR(bytes);
    if (xorCheck !== 0) {
      return { success: false, error: 'XOR checksum mismatch' };
    }
    
    if (startByte === 0xF0) {
      // Error Frame
      const errorCode = bytes[3];
      return { success: false, isErrorResponse: true, errorCode };
    }
    
    if (startByte === 0x50) {
      // Success Frame
      const cmd = bytes[3];
      const data = bytes.slice(4, bytes.length - 1); // remove header, len, cmd, and xor
      return { success: true, cmd, data, raw: bytes };
    }
    
    return { success: false, error: 'Unknown start byte' };
  }

  // --- Serial Connection ---

  async connect() {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' });
      
      if (this.onStatusChange) this.onStatusChange('Connected. Ready to scan.');
      
      // Start listening loop in background
      this.listenToPort();
      
      return true;
    } catch (err) {
      if (this.onError) this.onError('Failed to connect to NFC reader: ' + err.message);
      if (this.onStatusChange) this.onStatusChange('Disconnected');
      return false;
    }
  }

  async listenToPort() {
    while (this.port && this.port.readable) {
      const reader = this.port.readable.getReader();
      this.reader = reader;
      try {
        let buffer = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            // Very simple framing: normally you'd parse length to wait for full packet.
            // For this demo, assuming chunks arrive somewhat entirely or parsing full buffer.
            buffer.push(...value);
            
            // Check if we have a full frame. Wait until we at least have length to know how many bytes.
            if (buffer.length >= 4) {
              const lenH = buffer[1];
              const lenL = buffer[2];
              const expectedTotalLength = 3 + lenH * 256 + lenL + 1; // 1(Header) + 2(Len) + var(Cmd+Data) + 1(XOR)
              
              if (buffer.length >= expectedTotalLength) {
                const completeFrame = buffer.slice(0, expectedTotalLength);
                buffer = buffer.slice(expectedTotalLength);
                this.handleResponse(new Uint8Array(completeFrame));
              }
            }
          }
        }
      } catch (error) {
        console.error("Serial read error:", error);
      } finally {
        reader.releaseLock();
      }
    }
  }

  async sendCommand(commandArray) {
    if (!this.port || !this.port.writable) return;
    try {
      const writer = this.port.writable.getWriter();
      await writer.write(commandArray);
      writer.releaseLock();
    } catch (e) {
      console.error("Write error", e);
    }
  }

  // --- Specific Commands ---

  /**
   * Command 0x22: Activate Card and Read UID
   * Standard frame: 50 00 02 22 10 52 32
   */
  async triggerRead() {
    const req = this.buildFrame(0x22, [0x10, 0x52]);
    await this.sendCommand(req);
  }

  startPolling() {
    if (this.isPolling) return;
    this.isPolling = true;
    if (this.onStatusChange) this.onStatusChange('Ready - Tap your card');
    
    this.pollingInterval = setInterval(() => {
      this.triggerRead();
    }, 500);
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  handleResponse(bytes) {
    const parsed = this.parseFrame(bytes);
    
    if (parsed.isErrorResponse) {
      // 0xB1 is NO_CARD. Ignore during polling.
      if (parsed.errorCode !== 0xB1) {
        console.warn('Reader Error:', parsed.errorCode.toString(16));
        if (parsed.errorCode === 0xB2 || parsed.errorCode === 0xB3) {
           if (this.onError) this.onError('Card read error. Please tap again.');
        }
      }
      return;
    }

    if (!parsed.success) return;

    // Success response to 0x22 Activate Command
    if (parsed.cmd === 0x22) {
      // Data bytes after cmd: [ATQ_L] [ATQ_H] [SAK] [UID_LEN] [UID...]
      const rawFrame = parsed.raw;
      const uidLenIndex = 7; // index 7
      
      if (rawFrame.length > uidLenIndex) {
        const uidLen = rawFrame[uidLenIndex];
        const uidBytes = rawFrame.slice(8, 8 + uidLen);
        
        const uidHex = Array.from(uidBytes)
          .map(b => b.toString(16).padStart(2, '0').toUpperCase())
          .join('');
          
        this.stopPolling();
        
        if (this.onStatusChange) this.onStatusChange('Reading...');
        
        // Let UI/Auth handle the card
        if (this.onCardDetected) {
          this.onCardDetected(uidHex);
        }
      }
    }
  }

  // --- Feedback Commands ---

  async playSuccessBeep() {
    // 50 00 02 02 03 02 56
    const req = new Uint8Array([0x50, 0x00, 0x02, 0x02, 0x03, 0x02, 0x56]);
    await this.sendCommand(req);
  }

  async playErrorBeep() {
    // 50 00 02 02 0A 01 5A
    const req = new Uint8Array([0x50, 0x00, 0x02, 0x02, 0x0A, 0x01, 0x5A]);
    await this.sendCommand(req);
  }

  async flashGreenLED() {
    // 50 00 02 03 03 02 57
    const req = new Uint8Array([0x50, 0x00, 0x02, 0x03, 0x03, 0x02, 0x57]);
    await this.sendCommand(req);
  }
}
