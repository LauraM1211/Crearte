// Operaciones de acceso a la colección Firestore que almacena las auditorías.
// La interfaz usa estas funciones sin conocer los detalles de las consultas.
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
// Todas las consultas usan la instancia común de Firebase configurada por el proyecto.
import { app } from './firebase.js';

// Cuenta que la interfaz trata como administradora al cargar los registros.
// La autorización real debe estar definida además en las reglas de Firestore.
const EMAILS_HISTORIAL_COMPARTIDO = new Set([
  'grupocontable2130@gmail.com',
  'analista.calidad@crearte-sas.com'
]);

// Cliente Firestore asociado a la aplicación Firebase.
const db = getFirestore(app);

// Compara correos sin distinguir espacios externos ni mayúsculas.
export const esAdmin = (email) =>
  EMAILS_HISTORIAL_COMPARTIDO.has(String(email || '').trim().toLowerCase());

// Añade una auditoría en la colección y devuelve el ID generado por Firestore.
export const guardarEnFirestore = async (registro) => {
  // Las imágenes quedan en el almacenamiento local; Firestore recibe solo sus metadatos.
  const { fotos, ...sinFotos } = registro;
  const doc_ = { ...sinFotos, cantidadFotos: fotos?.length || 0 };
  // addDoc crea un documento nuevo sin sobrescribir otros registros.
  const ref = await addDoc(collection(db, 'auditorias'), doc_);
  return ref.id;
};

// Ordena las auditorías por su ID descendente y aplica el filtro de usuario cuando corresponde.
export const cargarDeFirestore = async (emailUsuario) => {
  try {
    let q;
    if (esAdmin(emailUsuario)) {
      // La cuenta administradora consulta toda la colección.
      q = query(collection(db, 'auditorias'), orderBy('id', 'desc'));
    } else {
      // Las demás cuentas solo solicitan documentos cuyo campo auditor coincide con su correo.
      q = query(
        collection(db, 'auditorias'),
        where('auditor', '==', emailUsuario),
        orderBy('id', 'desc')
      );
    }
    // Ejecuta la consulta y conserva el ID del documento para operaciones posteriores.
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), _firestoreId: d.id }));
  } catch (e) {
    console.error('Error cargando Firestore:', e);
    throw e;
  }
};

// Elimina de la colección un documento usando el ID remoto agregado al cargarlo.
export const eliminarDeFirestore = async (firestoreId) => {
  try {
    // doc(db, colección, ID) identifica el documento exacto que se borra.
    await deleteDoc(doc(db, 'auditorias', firestoreId));
  } catch (e) {
    // El fallo queda registrado en consola; el llamador no recibe un resultado de error.
    console.error('Error eliminando de Firestore:', e);
  }
};
