import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ---- Global error capture (helps Safari Web Inspector + on-screen overlay) ----
function showFatalOverlay(message: string) {
  try {
    const existing = document.getElementById("__fatal_overlay");
    if (existing) {
      existing.textContent = message;
      return;
    }
    const div = document.createElement("div");
    div.id = "__fatal_overlay";
    div.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:99999;max-height:50vh;overflow:auto;" +
      "background:rgba(220,38,38,0.95);color:#fff;font:12px -apple-system,monospace;" +
      "padding:12px 14px;white-space:pre-wrap;line-height:1.4;";
    div.textContent = message;
    document.body.appendChild(div);
  } catch {
    /* noop */
  }
}

window.addEventListener("error", (e) => {
  const msg = `[error] ${e.message}\n${(e.error && e.error.stack) || e.filename + ":" + e.lineno}`;
  // eslint-disable-next-line no-console
  console.error("[GlobalError]", msg);
  showFatalOverlay(msg);
});

window.addEventListener("unhandledrejection", (e) => {
  const reason = (e.reason && (e.reason.stack || e.reason.message)) || String(e.reason);
  const msg = `[unhandledrejection] ${reason}`;
  // eslint-disable-next-line no-console
  console.error("[GlobalRejection]", msg);
  showFatalOverlay(msg);
});

const container = document.getElementById("root")!;

// eslint-disable-next-line no-console
console.log("[main] starting React render", { href: location.href, ts: Date.now() });

try {
  createRoot(container).render(<App />);
  // eslint-disable-next-line no-console
  console.log("[main] React render() returned", { ts: Date.now() });
} catch (err: any) {
  showFatalOverlay(`[render-fatal] ${err?.stack || err?.message || String(err)}`);
  throw err;
}

// Remove the boot screen as soon as React has painted the first frame.
// Two rAFs guarantee we run AFTER the first commit on iOS WKWebView.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const boot = document.getElementById("__boot");
    if (!boot) return;
    boot.classList.add("__boot-hide");
    window.setTimeout(() => {
      boot.parentNode?.removeChild(boot);
    }, 300);
  });
});
