
import { createRoot } from "react-dom/client";
import GamesRouter from "./app/GamesRouter.tsx";
import { ThemeProvider } from "./app/components/ThemeContext";
import "./styles/index.css";

// Back button logic moved to App.tsx for better control


createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <GamesRouter />
  </ThemeProvider>
);

// Register service worker for offline caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        console.log('[SW] Registered:', reg.scope);
      })
      .catch(err => {
        console.warn('[SW] Registration failed:', err);
      });
  });
}
