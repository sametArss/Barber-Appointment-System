import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import 'leaflet/dist/leaflet.css';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      theme="dark"
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: 'bg-slate-900 border border-slate-800 text-slate-100',
          title: 'text-slate-100 font-medium',
          description: 'text-slate-400',
        },
      }}
    />
  </StrictMode>,
);
