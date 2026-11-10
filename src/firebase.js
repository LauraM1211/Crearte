// Funciones para consultar una aplicación Firebase ya inicializada o crearla si hace falta.
import { getApps, getApp, initializeApp } from 'firebase/app';

// Configuración del cliente web para conectar la aplicación con el proyecto Firebase.
// Estos valores identifican el proyecto; no sustituyen las reglas de seguridad del backend.
const firebaseConfig = {
  apiKey: "AIzaSyA1__VruS3tHvNpeMpg6g50-5NyNmcMXlQ",
  authDomain: "crearte-by-confeccionart-6febe.firebaseapp.com",
  projectId: "crearte-by-confeccionart-6febe",
  storageBucket: "crearte-by-confeccionart-6febe.firebasestorage.app",
  messagingSenderId: "608899242887",
  appId: "1:608899242887:web:25e01fd0c8ed0007225122",
  measurementId: "G-PFW5CGDXXQ"
};

// Evita inicializar Firebase más de una vez (por ejemplo, durante recargas de desarrollo).
// Si ya hay una instancia se reutiliza; de lo contrario se crea con la configuración anterior.
export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);
