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
import { app } from './firebase.js';

const ADMIN_EMAIL = 'grupocontable2130@gmail.com';

const db = getFirestore(app);

export const esAdmin = (email) =>
  String(email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

// Guarda una auditoría en Firestore
export const guardarEnFirestore = async (registro) => {
  // Eliminar fotos para no exceder límite de Firestore (1MB por doc)
  const { fotos, ...sinFotos } = registro;
  const doc_ = { ...sinFotos, cantidadFotos: fotos?.length || 0 };
  const ref = await addDoc(collection(db, 'auditorias'), doc_);
  return ref.id;
};

// Carga auditorías: admin ve todas, usuario normal solo las suyas
export const cargarDeFirestore = async (emailUsuario) => {
  try {
    let q;
    if (esAdmin(emailUsuario)) {
      q = query(collection(db, 'auditorias'), orderBy('id', 'desc'));
    } else {
      q = query(
        collection(db, 'auditorias'),
        where('auditor', '==', emailUsuario),
        orderBy('id', 'desc')
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), _firestoreId: d.id }));
  } catch (e) {
    console.error('Error cargando Firestore:', e);
    return [];
  }
};

// Elimina un documento de Firestore por su _firestoreId
export const eliminarDeFirestore = async (firestoreId) => {
  try {
    await deleteDoc(doc(db, 'auditorias', firestoreId));
  } catch (e) {
    console.error('Error eliminando de Firestore:', e);
  }
};
