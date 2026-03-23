import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// iOS/Android Keyboard Fix - Prevent automatic scrolling
if (typeof window !== 'undefined') {
  // Use VisualViewport API for better keyboard handling
  if (window.visualViewport) {
    let pendingUpdate = false;
    
    const viewportHandler = () => {
      if (pendingUpdate) return;
      pendingUpdate = true;
      
      requestAnimationFrame(() => {
        pendingUpdate = false;
        // Keep the page from scrolling when keyboard appears
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          // The visual viewport has changed (keyboard appeared/disappeared)
          // Don't scroll the page
          document.documentElement.style.setProperty('--keyboard-height', 
            `${window.innerHeight - window.visualViewport.height}px`);
        }
      });
    };
    
    window.visualViewport.addEventListener('resize', viewportHandler);
    window.visualViewport.addEventListener('scroll', viewportHandler);
  }
  
  // Fallback for older browsers - prevent scroll on focus
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      // Prevent default scroll behavior
      e.target.addEventListener('focus', (evt) => {
        evt.preventDefault();
      }, { once: true, passive: false });
    }
  }, { capture: true });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
