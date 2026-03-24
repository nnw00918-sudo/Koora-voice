import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Fix iOS keyboard scroll issue
if (typeof window !== 'undefined') {
  // Lock scroll position when input is focused
  let scrollY = 0;
  
  const lockScroll = () => {
    scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
  };
  
  const unlockScroll = () => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, scrollY);
  };
  
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      lockScroll();
    }
  });
  
  document.addEventListener('focusout', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      setTimeout(unlockScroll, 100);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
