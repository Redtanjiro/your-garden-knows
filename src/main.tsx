import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { GardenProvider } from './data/store';
import { ToastProvider } from './ui/common';
import '@fontsource/inter-tight/400.css';
import '@fontsource/inter-tight/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles.css';

// GitHub Pages serves 404.html (a copy of index.html) for deep links, so the router takes over.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <ToastProvider>
        <GardenProvider>
          <App />
        </GardenProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
