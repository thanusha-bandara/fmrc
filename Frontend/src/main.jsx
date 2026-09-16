import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.jsx'

// One-time cleanup for browsers that installed a service worker before the download-caching
// fix (see vite.config.js) -- an old worker can keep controlling the page for a long time
// (browsers only recheck for updates occasionally), silently re-serving cached API responses
// like a stale PDF-download error even after the underlying bug is fixed. Runs once per
// browser, then gets out of the way; the page's own PWA registration re-installs a fresh
// worker right after.
(async () => {
  if (localStorage.getItem('sw_purged_v2')) return;
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // Not fatal -- worst case the old worker lingers a bit longer.
  } finally {
    localStorage.setItem('sw_purged_v2', '1');
  }
})();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)