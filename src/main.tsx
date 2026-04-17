import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const container = document.getElementById("root")!;
createRoot(container).render(<App />);

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
