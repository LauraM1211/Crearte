import { getApps, getApp, initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyA1__VruS3tHvNpeMpg6g50-5NyNmcMXlQ",
  authDomain: "crearte-by-confeccionart-6febe.firebaseapp.com",
  projectId: "crearte-by-confeccionart-6febe",
  storageBucket: "crearte-by-confeccionart-6febe.firebasestorage.app",
  messagingSenderId: "608899242887",
  appId: "1:608899242887:web:25e01fd0c8ed0007225122",
  measurementId: "G-PFW5CGDXXQ"
};

export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);
