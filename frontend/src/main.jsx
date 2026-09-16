import React from 'react'
import ReactDOM from 'react-dom/client'
// Sets axios.defaults.baseURL from VITE_API_URL (required on Vercel)
import './api'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
