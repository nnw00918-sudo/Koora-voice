import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// iOS Keyboard Fix - Prevent ALL automatic scrolling
if (typeof window !== 'undefined') {
  let lastScrollTop = 0;
  let isInputFocused = false;
  
  // When input is focused, lock the scroll position
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      isInputFocused = true;
      lastScrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      
      // Lock body position
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lastScrollTop}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
  });
  
  // When input loses focus, restore scroll
  document.addEventListener('focusout', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      isInputFocused = false;
      
      // Unlock body position
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      
      // Restore scroll position
      window.scrollTo(0, lastScrollTop);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
