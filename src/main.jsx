// React aporta el modo estricto de desarrollo y la función para montar la aplicación.
import React from 'react'
import ReactDOM from 'react-dom/client'
// App administra el acceso y el flujo de auditorías.
import App from './App.jsx'
// Tailwind y las reglas globales se cargan una vez desde el punto de entrada.
import './index.css'

// Busca el contenedor raíz declarado en index.html y crea en él la raíz de React.
// StrictMode ayuda a detectar patrones problemáticos durante el desarrollo.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* El componente principal resuelve qué pantalla mostrar. */}
    <App />
  </React.StrictMode>,
)