# NFC Patient Portal Login

A web-based NFC login system designed to work with a USB NFC reader via the Web Serial API (PARRA protocol).

## Getting Started

1. Set up a local web server (e.g., using `live-server`, `python -m http.server`, etc.). The Web Serial API requires a secure context (HTTPS) or `localhost`.
2. Open `index.html` in a supported browser.

## Browser Support
- **Supported:** Google Chrome, Microsoft Edge, Opera (Desktop versions).
- **Not Supported:** Safari, Mozilla Firefox (Web Serial API is not implemented in these browsers).

## Hardware Setup
1. Connect your PARRA NFC Reader to your computer via USB.
2. Click the **"Connect NFC Reader"** button on the login page.
3. Your browser will prompt you to select a serial port. Look for a device resembling "USB Serial Device" or similar and click "Connect".

## Authentication
- **Registered NFC UID:** `043F1BFA577080`
- **Manual Password Fallback:** `dallah`

*Note: For production environments, the UID check should be moved to a backend service matching the UID against a secure patient database. This demo performs the check in the frontend for illustrative purposes.*

## Adding More Cards
To register a new NFC card into the local demo system:
1. Open `js/auth.js`.
2. Locate the `CONFIG.AUTHORIZED_UID` value.
3. Tap your new card (you can view its UID in the browser console logs or use the demo to extract it).
4. Replace the old UID with your new UID string (no spaces, all caps).

## Demo Mode
If you do not have hardware available to test this interface, click the **"Demo Mode: Simulate NFC Tap"** button located at the bottom right corner of the login screen to simulate a successful tag read.
