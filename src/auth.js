
// ============================================================
// AUTENTICACIÓN DE CREARTE BY CONFECCIONARTE
// Firebase Authentication
// ============================================================

import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from 'firebase/auth';
import { app } from './firebase.js';

// Código de invitación. Déjalo vacío para permitir registro libre.
export const CODIGO_INVITACION = '';

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

  if (e && typeof e.code === 'string' && e.code.startsWith('auth/api-key-not-valid')) {
    return 'La clave de Firebase no es válida. Revisa la configuración del proyecto Firebase.';
  }

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

    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada. Contacta al administrador.';

    case 'auth/network-request-failed':
      return 'Sin conexión a internet. Revisa tu red e inténtalo de nuevo.';

    case 'auth/operation-not-allowed':
      return 'Activa el acceso con correo y contraseña en Firebase Authentication.';

    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase. Agrégalo en Dominios autorizados.';

    case 'auth/invalid-api-key':
    case 'auth/configuration-not-found':
      return 'La configuración de Firebase no es correcta. Revisa firebaseConfig en auth.js.';

    default:
      if (e && typeof e.code === 'string') {
        return `Firebase rechazó el acceso (${e.code}).`;
      }
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
    await signOut(auth);
  } catch (e) {
    return { ok: false, error: traducirError(e) };
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
// 7. INICIAR SESIÓN
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

  return {
    ok: true,
    usuario: {
      email: cred.user.email,
      nombre: nombreDe(cred.user)
    }
  };
};

// ============================================================
// 8. RECUPERAR CONTRASEÑA
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
