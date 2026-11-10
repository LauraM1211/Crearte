
// Este módulo concentra las operaciones de cuenta para que los componentes de interfaz
// no tengan que llamar directamente a Firebase Authentication.

// Importa la inicialización, persistencia en memoria, registro, acceso,
// recuperación de clave, edición del perfil y cierre de sesión de Firebase.
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
// Usa la misma instancia de Firebase que emplea Firestore en el resto de la aplicación.
import { app } from './firebase.js';

// Si contiene un valor, el registro exige que el usuario escriba exactamente ese código.
// Al estar vacío, iniciarRegistro permite crear cuentas sin invitación.
export const CODIGO_INVITACION = '';

// Clave de almacenamiento local que recuerda solo el correo, nunca la contraseña.
const LAST_EMAIL_KEY = 'crearte_ultimo_correo';

// Lee el último correo utilizado; localStorage puede no estar disponible en ciertos contextos.
export const leerUltimoCorreo = () => {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) || '';
  } catch {
    return '';
  }
};

// Guarda el correo para precargarlo la próxima vez que se muestre el formulario de acceso.
const guardarUltimoCorreo = (correo) => {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, correo);
  } catch {
    // No se pudo guardar el correo.
  }
};

// Comprueba el formato general del correo antes de llamar a Firebase.
const emailValido = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Mensaje compartido cuando no se puede obtener una instancia de autenticación utilizable.
const MSG_SIN_CONFIG =
  'Firebase aún no está configurado. Revisa firebaseConfig en auth.js.';

// Caché del objeto Auth para reutilizar la instancia durante la vida de la página.
let _auth = null;

// Inicializa Auth con persistencia en memoria o recupera la instancia existente.
const obtenerAuth = () => {
  if (_auth) return _auth;

  try {
    // La sesión se pierde al cerrar o recargar la página; no queda persistida en el navegador.
    _auth = initializeAuth(app, {
      persistence: inMemoryPersistence
    });
  } catch {
    // Firebase puede haber inicializado Auth previamente; en ese caso se recupera esa instancia.
    _auth = getAuth(app);
  }

  return _auth;
};

// Registra el error técnico y devuelve un mensaje entendible para mostrar en el formulario.
const traducirError = (e) => {
  console.error(e);

  // Algunos errores de clave inválida traen un código más específico.
  if (e && typeof e.code === 'string' && e.code.startsWith('auth/api-key-not-valid')) {
    return 'La clave de Firebase no es válida. Revisa la configuración del proyecto Firebase.';
  }

  // Convierte los códigos conocidos de Firebase en instrucciones en español.
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
      // Si existe un código no contemplado, lo conserva para facilitar el diagnóstico.
      if (e && typeof e.code === 'string') {
        return `Firebase rechazó el acceso (${e.code}).`;
      }
      return 'No se pudo completar la acción. Intenta de nuevo.';
  }
};

// Obtiene el nombre visible del perfil o usa la parte anterior a @ como alternativa.
const nombreDe = (user) => {
  return user.displayName || (user.email || '').split('@')[0];
};

// La sesión vive en Firebase Auth en memoria; esta función no restaura un usuario al recargar.
export const sesionActual = () => null;

// Cierra la sesión actual. Los fallos se dejan en consola para diagnóstico.
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

// Valida y crea una cuenta nueva; devuelve un objeto { ok, usuario/error } para la interfaz.
export const iniciarRegistro = async ({
  nombre,
  email,
  clave,
  codigo
}) => {
  // Normaliza el correo para evitar diferencias por espacios o mayúsculas.
  const correo = String(email || '').trim().toLowerCase();

  // Valida por orden los campos obligatorios antes de comunicarse con el servicio.
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

  // El código solo se exige si CODIGO_INVITACION fue configurado con un valor.
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

  // cred contiene el usuario que Firebase devuelve al crear la cuenta.
  let cred;

  try {
    // Crea la cuenta en el proveedor de correo y contraseña de Firebase.
    cred = await createUserWithEmailAndPassword(
      auth,
      correo,
      clave
    );
  } catch (e) {
    return { ok: false, error: traducirError(e) };
  }

  // Recuerda el correo incluso si la actualización opcional del perfil no funciona.
  guardarUltimoCorreo(correo);

  try {
    // Asigna el nombre indicado para que la aplicación lo muestre como identidad del auditor.
    await updateProfile(cred.user, {
      displayName: nombre.trim()
    });
  } catch (e) {
    console.error(e);
  }

  try {
    // El registro crea la cuenta pero devuelve al usuario a la pantalla de ingreso.
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

// Valida las credenciales e inicia sesión; el resultado exitoso contiene email y nombre.
export const iniciarSesion = async ({ email, clave }) => {
  // Normaliza el email igual que durante el registro.
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
    // Firebase verifica las credenciales y abre la sesión en memoria.
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

  // Facilita el próximo acceso sin guardar la contraseña.
  guardarUltimoCorreo(correo);

  return {
    ok: true,
    usuario: {
      email: cred.user.email,
      nombre: nombreDe(cred.user)
    }
  };
};

// Solicita a Firebase que envíe el flujo de restablecimiento al correo indicado.
export const recuperarClave = async (email) => {
  // Se aplican las mismas reglas de formato y normalización que al ingresar.
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
    // Firebase gestiona el envío del enlace; aquí solo se devuelve el resultado a la interfaz.
    await sendPasswordResetEmail(auth, correo);

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: traducirError(e)
    };
  }
};
