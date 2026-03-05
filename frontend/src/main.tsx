import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'

// Intercept all fetch('/api/...') calls and redirect to the backend.
// This fixes every relative /api/ URL in the app without touching each file.
const _BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const _originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    input = `${_BACKEND}${input}`;
  }
  return _originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
