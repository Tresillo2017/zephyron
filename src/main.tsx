import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { initAnonymousId } from './hooks/useAnonymousId'
import { initAnalytics } from './lib/analytics'
import './index.css'
import App from './App'

// Initialize anonymous ID for API requests
initAnonymousId()

// Load analytics if user previously consented
initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
