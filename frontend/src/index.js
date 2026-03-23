import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// iOS Keyboard Fix - Prevent viewport resize
if (typeof window !== 'undefined') {
  // Handle iOS Safari keyboard
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    // Prevent viewport resize when keyboard opens
    document.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        document.body.classList.add('keyboard-open');
        // Scroll the input into view after a short delay
        setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    });

    document.addEventListener('focusout', () => {
      document.body.classList.remove('keyboard-open');
      // Reset scroll position
      window.scrollTo(0, 0);
    });
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
