import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MonteCarloDashboard from './components/MonteCarloDashboard.jsx';
import MonteCarloIntegral from './components/MonteCarloIntegral.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MonteCarloDashboard/>
    <MonteCarloIntegral/>
  </StrictMode>
)