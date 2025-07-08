import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Buffer } from 'buffer';
import process from 'process';
import { BrowserRouter } from "react-router-dom";

// Polyfill for Node.js globals required by simple-peer and dependencies
window.global = window;
window.Buffer = Buffer;
window.process = process;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);