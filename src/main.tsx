
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// Back button logic moved to App.tsx for better control


createRoot(document.getElementById("root")!).render(<App />);
  