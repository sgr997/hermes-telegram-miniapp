import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Telegram Mini App viewport setup
const tg = (window as any).Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  const applyViewport = () => {
    const h = tg.viewportStableHeight || window.innerHeight;
    document.documentElement.style.setProperty("--tg-viewport-height", `${h}px`);
  };
  applyViewport();
  tg.onEvent?.("viewportChanged", applyViewport);
  window.addEventListener("resize", applyViewport);
}

createRoot(document.getElementById("root")!).render(<App />);
