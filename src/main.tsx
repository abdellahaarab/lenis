import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import './home.css'
import './commerce.css'
import App from './App.tsx'
import { LanguageProvider } from './i18n'
import { ThemeProvider } from './i18n/ThemeContext'

const router = createBrowserRouter([{
  path: '*',
  loader: async ({ request }) => {
    if (new URL(request.url).pathname.split('/').filter(Boolean).length === 4) await import('./pages/ProductDetailPage');
    return null;
  },
  HydrateFallback: () => null,
  element: <ThemeProvider><LanguageProvider><App /></LanguageProvider></ThemeProvider>
}]);
createRoot(document.getElementById('root')!).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
