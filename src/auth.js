
// ============================================================
// AUTENTICACIÓN DE CREARTE BY CONFECCIONARTE
// Firebase Authentication
// ============================================================

import { initializeApp, getApps, getApp } from 'firebase/app';

import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  applyActionCode
} from 'firebase/auth';

// ============================================================
// 1. CONFIGURACIÓN DE FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBto76CL6z3R3ov-kZQhkkc6dnjEEFQWao",
  authDomain: "crearte-by-confeccionart.firebaseapp.com",
  projectId: "crearte-by-confeccionart",
  storageBucket: "crearte-by-confeccionart.firebasestorage.app",
  messagingSenderId: "581387720024",
  measurementId: "G-PM07VM0DSH"
};

// Código de invitación. Déjalo vacío para permitir registro libre.
export const CODIGO_INVITACION = '';

// Tiempo de espera para reenviar el correo.
export const SEGUNDOS_REENVIO = 60;

// ============================================================
// 2. DIRECCIÓN DE REDIRECCIÓN
// ============================================================

// Después de verificar el correo, el usuario regresará al login.
const configuracionVerificacion = {
  url: `${window.location.origin}/verificacion`,
  handleCodeInApp: true
};

// ============================================================
// 3. UTILIDADES
// ============================================================

const LAST_EMAIL_KEY = 'crearte_ultimo_correo';

export const leerUltimoCorreo = () => {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) || '';
  } catch {
    return '';
  }
};

const guardarUltimoCorreo = (correo) => {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, correo);
  } catch {
    // No se pudo guardar el correo.
  }
};

const emailValido = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const MSG_SIN_CONFIG =
  'Firebase aún no está configurado. Revisa firebaseConfig en auth.js.';

let _auth = null;

const obtenerAuth = () => {
  if (_auth) return _auth;

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }

  const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

  try {
    _auth = initializeAuth(app, {
      persistence: inMemoryPersistence
    });
  } catch {
    _auth = getAuth(app);
  }

  return _auth;
};

// ============================================================
// 4. TRADUCCIÓN DE ERRORES
// ============================================================

const traducirError = (e) => {
  console.error(e);

  switch (e && e.code) {
    case 'auth/email-already-in-use':
      return 'Ese correo ya tiene una cuenta. Ingresa con tu contraseña.';

    case 'auth/invalid-email':
      return 'Escribe un correo válido.';

    case 'auth/weak-password':
      return 'La contraseña debe tener mínimo 6 caracteres.';

    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Correo o contraseña incorrectos.';

    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';

    case 'auth/network-request-failed':
      return 'Sin conexión a internet. Revisa tu red e inténtalo de nuevo.';

    case 'auth/operation-not-allowed':
      return 'Activa el acceso con correo y contraseña en Firebase Authentication.';

    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase. Agrégalo en Dominios autorizados.';

    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
    case 'auth/configuration-not-found':
      return 'La configuración de Firebase no es correcta. Revisa firebaseConfig en auth.js.';

    default:
      return 'No se pudo completar la acción. Intenta de nuevo.';
  }
};

const nombreDe = (user) => {
  return user.displayName || (user.email || '').split('@')[0];
};

// ============================================================
// 5. SESIÓN
// ============================================================

// La sesión vive solo en memoria.
export const sesionActual = () => null;

export const cerrarSesion = async () => {
  const auth = obtenerAuth();

  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  }
};

// ============================================================
// 6. REGISTRO DE USUARIOS
// ============================================================

export const iniciarRegistro = async ({
  nombre,
  email,
  clave,
  codigo
}) => {
  const correo = String(email || '').trim().toLowerCase();

  if (!nombre || !nombre.trim()) {
    return { ok: false, error: 'Escribe tu nombre.' };
  }

  if (!emailValido(correo)) {
    return { ok: false, error: 'Escribe un correo válido.' };
  }

  if (!clave || clave.length < 6) {
    return {
      ok: false,
      error: 'La contraseña debe tener mínimo 6 caracteres.'
    };
  }

  if (CODIGO_INVITACION && codigo !== CODIGO_INVITACION) {
    return {
      ok: false,
      error: 'El código de invitación no es correcto.'
    };
  }

  const auth = obtenerAuth();

  if (!auth) {
    return { ok: false, error: MSG_SIN_CONFIG };
  }

  let cred;

  try {
    cred = await createUserWithEmailAndPassword(
      auth,
      correo,
      clave
    );
  } catch (e) {
    return { ok: false, error: traducirError(e) };
  }

  guardarUltimoCorreo(correo);

  try {
    await updateProfile(cred.user, {
      displayName: nombre.trim()
    });
  } catch (e) {
    console.error(e);
  }

  try {
    // Envía el correo con la configuración de redirección.
    await sendEmailVerification(
      cred.user,
      configuracionVerificacion
    );
  } catch (e) {
    console.error('Error sendEmailVerification:', e.code, e.message);

    return {
      ok: true,
      pendiente: { email: correo },
      aviso: 'La cuenta se creó, pero no se pudo enviar el correo. Pulsa Reenviar correo.'
    };
  }

  return {
    ok: true,
    pendiente: { email: correo }
  };
};

// ============================================================
// 7. PROCESAR VERIFICACIÓN DEL CORREO
// ============================================================

// Esta función se ejecuta cuando el usuario llega a /verificacion.
export const procesarVerificacion = async () => {
  const auth = obtenerAuth();

  if (!auth) {
    return {
      ok: false,
      error: MSG_SIN_CONFIG
    };
  }

  const parametros = new URLSearchParams(window.location.search);

  const codigo = parametros.get('oobCode');
  const modo = parametros.get('mode');

  if (modo !== 'verifyEmail' || !codigo) {
    return {
      ok: false,
      error: 'El enlace de verificación no es válido.'
    };
  }

  try {
    // Firebase confirma la verificación del correo.
    await applyActionCode(auth, codigo);

    return {
      ok: true,
      mensaje: '¡Tu correo fue verificado correctamente!'
    };
  } catch (e) {
    console.error(e);

    return {
      ok: false,
      error: 'El enlace expiró, no es válido o ya fue utilizado.'
    };
  }
};

// ============================================================
// 8. COMPROBAR VERIFICACIÓN
// ============================================================

export const comprobarVerificacion = async () => {
  const auth = obtenerAuth();

  if (!auth) {
    return { ok: false, error: MSG_SIN_CONFIG };
  }

  const user = auth.currentUser;

  if (!user) {
    return {
      ok: false,
      error: 'La sesión de verificación se cerró. Ingresa con tu correo y contraseña.',
      reiniciar: true
    };
  }

  try {
    await user.reload();
  } catch (e) {
    return {
      ok: false,
      error: traducirError(e)
    };
  }

  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    return {
      ok: false,
      error: 'Aún no aparece verificado. Abre el enlace del correo y vuelve a intentarlo.'
    };
  }

  const usuario = {
    email: auth.currentUser.email,
    nombre: nombreDe(auth.currentUser)
  };

  await cerrarSesion();

  return {
    ok: true,
    usuario
  };
};

// ============================================================
// 9. REENVIAR CORREO DE VERIFICACIÓN
// ============================================================

export const reenviarVerificacion = async () => {
  const auth = obtenerAuth();

  if (!auth) {
    return { ok: false, error: MSG_SIN_CONFIG };
  }

  if (!auth.currentUser) {
    return {
      ok: false,
      error: 'La sesión se cerró. Ingresa con tu correo y contraseña.',
      reiniciar: true
    };
  }

  try {
    await sendEmailVerification(
      auth.currentUser,
      configuracionVerificacion
    );

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: traducirError(e)
    };
  }
};

export const cancelarVerificacion = cerrarSesion;

// ============================================================
// 10. INICIAR SESIÓN
// ============================================================

export const iniciarSesion = async ({ email, clave }) => {
  const correo = String(email || '').trim().toLowerCase();

  if (!emailValido(correo)) {
    return {
      ok: false,
      error: 'Escribe un correo válido.'
    };
  }

  if (!clave) {
    return {
      ok: false,
      error: 'Escribe tu contraseña.'
    };
  }

  const auth = obtenerAuth();

  if (!auth) {
    return { ok: false, error: MSG_SIN_CONFIG };
  }

  let cred;

  try {
    cred = await signInWithEmailAndPassword(
      auth,
      correo,
      clave
    );
  } catch (e) {
    return {
      ok: false,
      error: traducirError(e)
    };
  }

  guardarUltimoCorreo(correo);

  // No permite ingresar si el correo no está verificado.
  if (!cred.user.emailVerified) {
    return {
      ok: false,
      noVerificado: true,
      error: 'Tu correo aún no está verificado.'
    };
  }

  return {
    ok: true,
    usuario: {
      email: cred.user.email,
      nombre: nombreDe(cred.user)
    }
  };
};

// ============================================================
// 11. RECUPERAR CONTRASEÑA
// ============================================================

export const recuperarClave = async (email) => {
  const correo = String(email || '').trim().toLowerCase();

  if (!emailValido(correo)) {
    return {
      ok: false,
      error: 'Escribe tu correo arriba para recuperar la contraseña.'
    };
  }

  const auth = obtenerAuth();

  if (!auth) {
    return { ok: false, error: MSG_SIN_CONFIG };
  }

  try {
    await sendPasswordResetEmail(auth, correo);

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: traducirError(e)
    };
  }
};
