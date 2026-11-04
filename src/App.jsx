import React, { useState, useMemo, useEffect } from 'react';
import Login from './login.jsx';
import Verificacion from './verificacion.jsx';
import { sesionActual, cerrarSesion } from './auth.js';
import { generarPdfAuditoria, nombreArchivoPdf } from './reportepdf.js';
import { guardarEnFirestore, cargarDeFirestore, eliminarDeFirestore, esAdmin } from './db.js';
const EMAILJS_SERVICE_ID  = 'service_31xahnu';
const EMAILJS_TEMPLATE_ID = 'template_nlyhaax';
const EMAILJS_PUBLIC_KEY  = 'luPQ8D0azYx7Upw6f';

const enviarEmailJS = (destino, asunto, htmlMensaje, nombreAuditor, emailAuditor) =>
  fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: destino,
        subject: asunto,
        message: htmlMensaje,
        from_name: nombreAuditor,
        reply_to: emailAuditor
      }
    })
  });

// --- TABLAS OFICIALES AQL (ISO 2859-1 / ANSI ASQ Z1.4) ---
const TABLA_I = [
  { min: 2, max: 8, 'S-1': 'A', 'S-2': 'A', 'S-3': 'A', 'S-4': 'A', 'I': 'A', 'II': 'A', 'III': 'B' },
  { min: 9, max: 15, 'S-1': 'A', 'S-2': 'A', 'S-3': 'A', 'S-4': 'A', 'I': 'A', 'II': 'B', 'III': 'C' },
  { min: 16, max: 25, 'S-1': 'A', 'S-2': 'A', 'S-3': 'B', 'S-4': 'B', 'I': 'B', 'II': 'C', 'III': 'D' },
  { min: 26, max: 50, 'S-1': 'A', 'S-2': 'B', 'S-3': 'B', 'S-4': 'C', 'I': 'C', 'II': 'D', 'III': 'E' },
  { min: 51, max: 90, 'S-1': 'B', 'S-2': 'B', 'S-3': 'C', 'S-4': 'C', 'I': 'C', 'II': 'E', 'III': 'F' },
  { min: 91, max: 150, 'S-1': 'B', 'S-2': 'B', 'S-3': 'C', 'S-4': 'D', 'I': 'D', 'II': 'F', 'III': 'G' },
  { min: 151, max: 280, 'S-1': 'B', 'S-2': 'C', 'S-3': 'D', 'S-4': 'E', 'I': 'E', 'II': 'G', 'III': 'H' },
  { min: 281, max: 500, 'S-1': 'B', 'S-2': 'C', 'S-3': 'D', 'S-4': 'E', 'I': 'F', 'II': 'H', 'III': 'J' },
  { min: 501, max: 1200, 'S-1': 'C', 'S-2': 'C', 'S-3': 'E', 'S-4': 'F', 'I': 'G', 'II': 'J', 'III': 'K' },
  { min: 1201, max: 3200, 'S-1': 'C', 'S-2': 'D', 'S-3': 'E', 'S-4': 'G', 'I': 'H', 'II': 'K', 'III': 'L' },
  { min: 3201, max: 10000, 'S-1': 'C', 'S-2': 'D', 'S-3': 'F', 'S-4': 'G', 'I': 'J', 'II': 'L', 'III': 'M' },
  { min: 10001, max: 35000, 'S-1': 'C', 'S-2': 'D', 'S-3': 'F', 'S-4': 'H', 'I': 'K', 'II': 'M', 'III': 'N' }
];

// Matriz maestra con resolución de flechas de muestreo para todos los niveles AQL
const AQL_PLANS = {
  A: { n: 2, plans: { '0.65': { ac: 0, re: 1, n: 20 }, '1.0': { ac: 0, re: 1, n: 13 }, '1.5': { ac: 0, re: 1, n: 8 }, '2.5': { ac: 0, re: 1, n: 5 }, '4.0': { ac: 0, re: 1, n: 3 }, '6.5': { ac: 0, re: 1, n: 2 } } },
  B: { n: 3, plans: { '0.65': { ac: 0, re: 1, n: 20 }, '1.0': { ac: 0, re: 1, n: 13 }, '1.5': { ac: 0, re: 1, n: 8 }, '2.5': { ac: 0, re: 1, n: 5 }, '4.0': { ac: 0, re: 1, n: 3 }, '6.5': { ac: 0, re: 1, n: 2 } } },
  C: { n: 5, plans: { '0.65': { ac: 0, re: 1, n: 20 }, '1.0': { ac: 0, re: 1, n: 13 }, '1.5': { ac: 0, re: 1, n: 8 }, '2.5': { ac: 0, re: 1, n: 5 }, '4.0': { ac: 0, re: 1, n: 3 }, '6.5': { ac: 1, re: 2, n: 8 } } },
  D: { n: 8, plans: { '0.65': { ac: 0, re: 1, n: 20 }, '1.0': { ac: 0, re: 1, n: 13 }, '1.5': { ac: 0, re: 1, n: 8 }, '2.5': { ac: 0, re: 1, n: 5 }, '4.0': { ac: 1, re: 2, n: 13 }, '6.5': { ac: 1, re: 2, n: 8 } } },
  E: { n: 13, plans: { '0.65': { ac: 0, re: 1, n: 20 }, '1.0': { ac: 0, re: 1, n: 13 }, '1.5': { ac: 0, re: 1, n: 8 }, '2.5': { ac: 1, re: 2, n: 20 }, '4.0': { ac: 1, re: 2, n: 13 }, '6.5': { ac: 2, re: 3, n: 13 } } },
  F: { n: 20, plans: { '0.65': { ac: 0, re: 1, n: 20 }, '1.0': { ac: 0, re: 1, n: 13 }, '1.5': { ac: 1, re: 2, n: 32 }, '2.5': { ac: 1, re: 2, n: 20 }, '4.0': { ac: 2, re: 3, n: 20 }, '6.5': { ac: 3, re: 4, n: 20 } } },
  G: { n: 32, plans: { '0.65': { ac: 0, re: 1, n: 20 }, '1.0': { ac: 1, re: 2, n: 50 }, '1.5': { ac: 1, re: 2, n: 32 }, '2.5': { ac: 2, re: 3, n: 32 }, '4.0': { ac: 3, re: 4, n: 32 }, '6.5': { ac: 5, re: 6, n: 32 } } },
  H: { n: 50, plans: { '0.65': { ac: 1, re: 2, n: 80 }, '1.0': { ac: 1, re: 2, n: 50 }, '1.5': { ac: 2, re: 3, n: 50 }, '2.5': { ac: 3, re: 4, n: 50 }, '4.0': { ac: 5, re: 6, n: 50 }, '6.5': { ac: 7, re: 8, n: 50 } } },
  J: { n: 80, plans: { '0.65': { ac: 1, re: 2, n: 80 }, '1.0': { ac: 2, re: 3, n: 80 }, '1.5': { ac: 3, re: 4, n: 80 }, '2.5': { ac: 5, re: 6, n: 80 }, '4.0': { ac: 7, re: 8, n: 80 }, '6.5': { ac: 10, re: 11, n: 80 } } },
  K: { n: 125, plans: { '0.65': { ac: 2, re: 3, n: 125 }, '1.0': { ac: 3, re: 4, n: 125 }, '1.5': { ac: 5, re: 6, n: 125 }, '2.5': { ac: 7, re: 8, n: 125 }, '4.0': { ac: 10, re: 11, n: 125 }, '6.5': { ac: 14, re: 15, n: 125 } } },
  L: { n: 200, plans: { '0.65': { ac: 3, re: 4, n: 200 }, '1.0': { ac: 5, re: 6, n: 200 }, '1.5': { ac: 7, re: 8, n: 200 }, '2.5': { ac: 10, re: 11, n: 200 }, '4.0': { ac: 14, re: 15, n: 200 }, '6.5': { ac: 21, re: 22, n: 200 } } },
  M: { n: 315, plans: { '0.65': { ac: 5, re: 6, n: 315 }, '1.0': { ac: 7, re: 8, n: 315 }, '1.5': { ac: 10, re: 11, n: 315 }, '2.5': { ac: 14, re: 15, n: 315 }, '4.0': { ac: 21, re: 22, n: 315 }, '6.5': { ac: 21, re: 22, n: 200 } } },
  N: { n: 500, plans: { '0.65': { ac: 7, re: 8, n: 500 }, '1.0': { ac: 10, re: 11, n: 500 }, '1.5': { ac: 14, re: 15, n: 500 }, '2.5': { ac: 21, re: 22, n: 500 }, '4.0': { ac: 21, re: 22, n: 315 }, '6.5': { ac: 21, re: 22, n: 200 } } },
  P: { n: 800, plans: { '0.65': { ac: 10, re: 11, n: 800 }, '1.0': { ac: 14, re: 15, n: 800 }, '1.5': { ac: 21, re: 22, n: 800 }, '2.5': { ac: 21, re: 22, n: 500 }, '4.0': { ac: 21, re: 22, n: 315 }, '6.5': { ac: 21, re: 22, n: 200 } } },
  Q: { n: 1250, plans: { '0.65': { ac: 14, re: 15, n: 1250 }, '1.0': { ac: 21, re: 22, n: 1250 }, '1.5': { ac: 21, re: 22, n: 800 }, '2.5': { ac: 21, re: 22, n: 500 }, '4.0': { ac: 21, re: 22, n: 315 }, '6.5': { ac: 21, re: 22, n: 200 } } },
  R: { n: 2000, plans: { '0.65': { ac: 21, re: 22, n: 2000 }, '1.0': { ac: 21, re: 22, n: 1250 }, '1.5': { ac: 21, re: 22, n: 800 }, '2.5': { ac: 21, re: 22, n: 500 }, '4.0': { ac: 21, re: 22, n: 315 }, '6.5': { ac: 21, re: 22, n: 200 } } }
};

const normAql = (val) => {
  if (!val) return '';
  const s = String(val).replace(',', '.').trim();
  if (s === '1') return '1.0';
  if (s === '4') return '4.0';
  return s;
};

const STORAGE_KEY = 'auditorias_textil_local_db';

function Auditoria({ usuario, onLogout }) {
  const [historialAuditorias, setHistorialAuditorias] = useState([]);
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [registroVisualizar, setRegistroVisualizar] = useState(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [emailDestinatarios, setEmailDestinatarios] = useState([]);
  const [mensajeAdicional, setMensajeAdicional] = useState("");
  const [adjuntarPdf, setAdjuntarPdf] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState(null);
  const [archivosExtra, setArchivosExtra] = useState([]);

  const initialFormData = {
    empresa: '',
    referencia: '',
    loteNum: '',
    tamañoLote: '',
    nivelInspeccion: '',
    aqlMayores: '',
    aqlMenores: '',
    criticosAcRe: 0
  };
  const [formData, setFormData] = useState(initialFormData);

  const initialAuditResults = {
    defectos: { criticos: 0, mayores: 0, menores: 0 },
    segundas: { tela: 0, confeccion: 0, proceso: 0 },
    comentarios: '',
    fotos: []
  };
  const [auditResults, setAuditResults] = useState(initialAuditResults);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  useEffect(() => {
    // Cargar desde localStorage primero (rápido)
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) setHistorialAuditorias(JSON.parse(data));
    } catch (e) { console.error(e); }
    // Luego sincronizar con Firestore
    cargarDeFirestore(usuario.email).then(registros => {
      if (registros.length > 0) {
        setHistorialAuditorias(registros);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(registros)); } catch (_) {}
      }
    });
  }, []);

  const limpiarFormulario = () => {
    setFormData(initialFormData);
    setAuditResults(initialAuditResults);
    setEmailDestinatarios([]);
    setMensajeAdicional("");
    triggerToast("Formulario reiniciado en ceros");
  };

  // Cálculo en tiempo real del Plan de Muestreo AQL
  const planMuestreo = useMemo(() => {
    const cleanLoteStr = String(formData.tamañoLote || '').replace(/\./g, '').replace(/,/g, '').trim();
    const lote = parseInt(cleanLoteStr, 10);
    const nivel = formData.nivelInspeccion;
    
    if (isNaN(lote) || lote <= 1 || !nivel) {
      return {
        letra: '--',
        nMayores: '--',
        nMenores: '--',
        muestraTotal: '--',
        acMayores: '--',
        reMayores: '--',
        acMenores: '--',
        reMenores: '--'
      };
    }

    const filaTabla = TABLA_I.find(r => lote >= r.min && lote <= r.max);
    const letra = filaTabla 
      ? (filaTabla[nivel] || 'A') 
      : (lote > 35000 ? (nivel === 'I' ? 'K' : nivel === 'III' ? 'P' : 'N') : 'A');

    const letraData = AQL_PLANS[letra] || AQL_PLANS['F'];
    let baseN = letraData.n || 20;

    let acMay = '--';
    let reMay = '--';
    let nMay = baseN;
    const aqlMayKey = normAql(formData.aqlMayores);
    if (aqlMayKey && letraData.plans && letraData.plans[aqlMayKey]) {
      const pMay = letraData.plans[aqlMayKey];
      acMay = pMay.ac;
      reMay = pMay.re;
      if (pMay.n) nMay = pMay.n;
    }

    let acMen = '--';
    let reMen = '--';
    let nMen = baseN;
    const aqlMenKey = normAql(formData.aqlMenores);
    if (aqlMenKey && letraData.plans && letraData.plans[aqlMenKey]) {
      const pMen = letraData.plans[aqlMenKey];
      acMen = pMen.ac;
      reMen = pMen.re;
      if (pMen.n) nMen = pMen.n;
    }

    const nCalculada = Math.min(lote, Math.max(nMay, nMen));

    return {
      letra, 
      nMayores: nMay, 
      nMenores: nMen, 
      muestraTotal: nCalculada,
      acMayores: acMay, 
      reMayores: reMay, 
      acMenores: acMen, 
      reMenores: reMen
    };
  }, [formData.tamañoLote, formData.nivelInspeccion, formData.aqlMayores, formData.aqlMenores]);

  // Decisión Final
  const decisionFinal = useMemo(() => {
    if (planMuestreo.letra === '--') {
      return { estado: 'ESPERANDO', texto: 'Esperando datos del lote', clase: 'text-slate-400 bg-slate-100 border-slate-200' };
    }

    const { criticos, mayores, menores } = auditResults.defectos;
    const limiteCriticos = parseInt(formData.criticosAcRe, 10) || 0;

    const falloCriticos = criticos > limiteCriticos;
    const falloMayores = typeof planMuestreo.reMayores === 'number' && mayores >= planMuestreo.reMayores;
    const falloMenores = typeof planMuestreo.reMenores === 'number' && menores >= planMuestreo.reMenores;

    if (falloCriticos || falloMayores || falloMenores) {
      const motivos = [];
      if (falloCriticos) motivos.push('Críticos');
      if (falloMayores) motivos.push('Mayores');
      if (falloMenores) motivos.push('Menores');
      return {
        estado: 'RECHAZADO',
        texto: `RECHAZADO · ${motivos.join(', ')}`,
        clase: 'text-rose-700 bg-rose-50 border-rose-300'
      };
    }

    if (typeof planMuestreo.acMayores === 'number') {
      return {
        estado: 'APROBADO',
        texto: 'APROBADO · Lote Conforme',
        clase: 'text-emerald-700 bg-emerald-50 border-emerald-300'
      };
    }

    return { estado: 'PENDIENTE', texto: 'Configure AQL para dictaminar', clase: 'text-amber-700 bg-amber-50 border-amber-300' };
  }, [planMuestreo, auditResults.defectos, formData.criticosAcRe]);

  const totalSegundas = (auditResults.segundas.confeccion || 0) + (auditResults.segundas.tela || 0) + (auditResults.segundas.proceso || 0);
  const porcentajeSegundas = useMemo(() => {
    const lote = parseInt(formData.tamañoLote, 10);
    if (!lote || lote <= 0) return '0.00%';
    return ((totalSegundas / lote) * 100).toFixed(2) + '%';
  }, [totalSegundas, formData.tamañoLote]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAuditChange = (categoria, campo, valor) => {
    setAuditResults(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [campo]: Math.max(0, parseInt(valor, 10) || 0)
      }
    }));
  };

  // --- FOTOS DE EVIDENCIA (desde archivos / galería / cámara) ---
  // Convierte la imagen a base64 y la comprime para no llenar el localStorage
  const comprimirImagen = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const MAX = 700;
          const escala = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({
            id: Date.now() + Math.random(),
            nombre: file.name,
            src: canvas.toDataURL('image/jpeg', 0.6)
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handleFotos = async (e) => {
    const archivos = Array.from(e.target.files || []);
    if (archivos.length === 0) return;
    try {
      const nuevas = await Promise.all(archivos.map(comprimirImagen));
      setAuditResults(prev => ({ ...prev, fotos: [...prev.fotos, ...nuevas] }));
      triggerToast(`${nuevas.length} foto(s) adjuntada(s)`);
    } catch (err) {
      console.error(err);
      triggerToast("No se pudo cargar la imagen");
    }
    e.target.value = ''; // permite volver a elegir la misma foto
  };

  const quitarFoto = (id) => {
    setAuditResults(prev => ({ ...prev, fotos: prev.fotos.filter(f => f.id !== id) }));
  };

  // Guardado directo en la base de datos interna de la aplicación (localStorage)
  const guardarAuditoria = (correoInfo = null) => {
    if (!formData.empresa || !formData.referencia || !formData.tamañoLote) {
      triggerToast("Completa al menos Empresa, Referencia y Tamaño de Lote");
      return false;
    }

    const nuevoRegistro = {
      id: Date.now(),
      auditor: usuario.email,
      empresa: formData.empresa,
      referencia: formData.referencia,
      loteNum: formData.loteNum,
      tamañoLote: Number(formData.tamañoLote) || 0,
      nivelInspeccion: formData.nivelInspeccion,
      aqlMayores: formData.aqlMayores,
      aqlMenores: formData.aqlMenores,
      criticosAcRe: Number(formData.criticosAcRe) || 0,
      planMuestreo,
      defectos: auditResults.defectos,
      segundas: {
        ...auditResults.segundas,
        total: totalSegundas,
        porcentaje: porcentajeSegundas
      },
      decision: decisionFinal,
      comentarios: auditResults.comentarios,
      fotos: auditResults.fotos,
      correo: correoInfo || { enviado: false, destinatario: 'Sin envío' },
      fecha: new Date().toLocaleDateString('es-CO', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    };

    const nuevaLista = [nuevoRegistro, ...historialAuditorias];

    // Primero intentamos guardar; si la memoria está llena, no se pierde nada
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaLista));
    } catch (e) {
      console.error(e);
      triggerToast("Memoria llena: reduce el número de fotos o elimina registros antiguos");
      return false;
    }

    setHistorialAuditorias(nuevaLista);
    // Guardar también en Firestore
    guardarEnFirestore({ ...nuevoRegistro, fotos: auditResults.fotos })
      .then(() => triggerToast("¡Auditoría guardada en la base de datos!"))
      .catch(() => triggerToast("¡Auditoría guardada localmente!"));
    return nuevoRegistro;
  };

  const eliminarRegistro = (id) => {
    const item = historialAuditorias.find(x => x.id === id);
    const filtrados = historialAuditorias.filter(x => x.id !== id);
    setHistorialAuditorias(filtrados);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrados)); } catch (_) {}
    if (item?._firestoreId) eliminarDeFirestore(item._firestoreId);
    if (registroVisualizar && registroVisualizar.id === id) setRegistroVisualizar(null);
    triggerToast("Registro eliminado de la base de datos");
  };

  // Descarga un archivo (Blob/File) en el equipo
  const descargarBlob = (blob, nombre) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  // PDF individual (mismo reporte del Excel, con las fotos de evidencia)
  const descargarPdfIndividual = async (registro) => {
    try {
      triggerToast("Generando PDF...");
      const bytes = await generarPdfAuditoria(registro);
      descargarBlob(new Blob([bytes], { type: 'application/pdf' }), nombreArchivoPdf(registro));
      triggerToast("PDF descargado");
    } catch (e) {
      console.error(e);
      triggerToast("No se pudo generar el PDF");
    }
  };

  // Archivos que la persona elige desde su equipo para adjuntar al correo
  const handleArchivosExtra = (e) => {
    const nuevos = Array.from(e.target.files || []);
    if (nuevos.length) setArchivosExtra(prev => [...prev, ...nuevos]);
    e.target.value = '';
  };

  const quitarArchivoExtra = (idx) => {
    setArchivosExtra(prev => prev.filter((_, i) => i !== idx));
  };

  const esMovil = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleEnviarCorreo = async () => {
    const destino = emailDestinatarios.length > 0 ? emailDestinatarios.join(',') : "10ALNORTESAS@GMAIL.COM";
    const mensaje = mensajeAdicional.trim();
    const esAprobado = decisionFinal?.estado === 'APROBADO';

    const asunto = `Reporte Auditoría · ${formData.empresa} · Lote ${formData.loteNum || 'S/N'} · ${decisionFinal?.estado || ''}`;

    const htmlCorreo = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

        <!-- HEADER LOGO -->
        <tr>
          <td style="background:#000000;padding:24px 32px;text-align:center;">
            <span style="font-size:32px;font-weight:900;color:#FFD600;letter-spacing:-1px;">CRE</span><span style="font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-1px;">ARTE</span><br>
            <span style="font-size:12px;color:#9ca3af;font-style:italic;font-family:Georgia,serif;">by confeccionarte</span>
          </td>
        </tr>

        <!-- DICTAMEN BANNER -->
        <tr>
          <td style="background:${esAprobado ? '#dcfce7' : '#fee2e2'};padding:20px 32px;text-align:center;border-bottom:3px solid ${esAprobado ? '#16a34a' : '#dc2626'};">
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${esAprobado ? '#166534' : '#991b1b'};">Dictamen de Calidad</p>
            <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:${esAprobado ? '#15803d' : '#b91c1c'};">&#x2714; ${decisionFinal?.texto || decisionFinal?.estado}</p>
          </td>
        </tr>

        <!-- MENSAJE ADICIONAL -->
        ${mensaje ? `
        <tr>
          <td style="padding:24px 32px 0;">
            <div style="background:#fefce8;border-left:4px solid #FFD600;border-radius:8px;padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;color:#92400e;">Mensaje del auditor</p>
              <p style="margin:0;font-size:14px;color:#1c1917;line-height:1.6;">${mensaje.replace(/\n/g, '<br>')}</p>
            </div>
          </td>
        </tr>` : ''}

        <!-- DATOS DEL LOTE -->
        <tr>
          <td style="padding:24px 32px 0;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">&#x1F4CB; Datos del Lote</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
              <tr style="background:#f8fafc;">
                <td style="padding:10px 16px;font-size:12px;color:#64748b;font-weight:600;width:40%;">Empresa</td>
                <td style="padding:10px 16px;font-size:13px;color:#0f172a;font-weight:700;">${formData.empresa || '—'}</td>
              </tr>
              <tr style="background:#ffffff;">
                <td style="padding:10px 16px;font-size:12px;color:#64748b;font-weight:600;">Referencia</td>
                <td style="padding:10px 16px;font-size:13px;color:#0f172a;font-weight:700;">${formData.referencia || '—'}</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="padding:10px 16px;font-size:12px;color:#64748b;font-weight:600;">Número de Lote</td>
                <td style="padding:10px 16px;font-size:13px;color:#0f172a;font-weight:700;">${formData.loteNum || 'S/N'}</td>
              </tr>
              <tr style="background:#ffffff;">
                <td style="padding:10px 16px;font-size:12px;color:#64748b;font-weight:600;">Tamaño del Lote</td>
                <td style="padding:10px 16px;font-size:13px;color:#4338ca;font-weight:700;">${formData.tamañoLote} unidades</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="padding:10px 16px;font-size:12px;color:#64748b;font-weight:600;">Muestra (n)</td>
                <td style="padding:10px 16px;font-size:13px;color:#0f172a;font-weight:700;">${planMuestreo.muestraTotal}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- DEFECTOS -->
        <tr>
          <td style="padding:20px 32px 0;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">&#x26A0; Defectos Encontrados</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:33%;padding:0 4px 0 0;">
                  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;text-align:center;">
                    <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;color:#dc2626;">Críticos</p>
                    <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:#b91c1c;">${auditResults.defectos.criticos}</p>
                  </div>
                </td>
                <td style="width:33%;padding:0 2px;">
                  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px;text-align:center;">
                    <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;color:#ea580c;">Mayores</p>
                    <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:#c2410c;">${auditResults.defectos.mayores}</p>
                  </div>
                </td>
                <td style="width:33%;padding:0 0 0 4px;">
                  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px;text-align:center;">
                    <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;color:#ca8a04;">Menores</p>
                    <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:#a16207;">${auditResults.defectos.menores}</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER AUDITOR -->
        <tr>
          <td style="padding:24px 32px 32px;">
            <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Enviado por</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0f172a;">${usuario.nombre}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${usuario.email}</p>
              <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">${new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    setEnviando(true);
    try {
      const res = await enviarEmailJS(destino, asunto, htmlCorreo, usuario.nombre, usuario.email);
      const texto = await res.text();
      console.log('EmailJS status:', res.status, texto);
    } catch (e) {
      console.error('EmailJS error:', e);
    }
    setArchivosExtra([]);
    setEmailDestinatarios([]);
    setMensajeAdicional("");
    setEnviando(false);
    setIsEmailModalOpen(false);
    setCorreoEnviado(true);
    setTimeout(() => setCorreoEnviado(false), 5000);
  };

  const cargarRegistro = (item) => {
    setFormData({
      empresa: item.empresa || '',
      referencia: item.referencia || '',
      loteNum: item.loteNum || '',
      tamañoLote: item.tamañoLote ? String(item.tamañoLote) : '',
      nivelInspeccion: item.nivelInspeccion || '',
      aqlMayores: item.aqlMayores || '',
      aqlMenores: item.aqlMenores || '',
      criticosAcRe: item.criticosAcRe || 0
    });
    setAuditResults({
      defectos: item.defectos || { criticos: 0, mayores: 0, menores: 0 },
      segundas: item.segundas || { tela: 0, confeccion: 0, proceso: 0 },
      comentarios: item.comentarios || '',
      fotos: item.fotos || []
    });
    setIsHistorialOpen(false);
    triggerToast("Auditoría Lote #" + (item.loteNum || 'S/N') + " cargada en formulario");
  };

  // Motor de descarga individual a Microsoft Excel (.xls con formato y colores)
  const descargarExcelIndividual = (registro) => {
    const nombreLote = registro.loteNum ? String(registro.loteNum).replace(/[^a-zA-Z0-9]/g, '_') : 'SN';
    const empresa = (registro.empresa || 'Empresa').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Auditoria_${empresa}_Lote_${nombreLote}.xls`;

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Auditoría Final</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          .titulo { background-color: #312E81; color: #FFFFFF; font-size: 14pt; font-weight: bold; text-align: center; height: 35px; }
          .seccion { background-color: #4F46E5; color: #FFFFFF; font-weight: bold; font-size: 11pt; }
          .encabezado { background-color: #F1F5F9; font-weight: bold; width: 180px; }
          .aprobado { background-color: #DCFCE7; color: #166534; font-weight: bold; font-size: 12pt; text-align: center; }
          .rechazado { background-color: #FEE2E2; color: #991B1B; font-weight: bold; font-size: 12pt; text-align: center; }
          .destacado { color: #4338CA; font-weight: bold; }
          td, th { border: 1px solid #CBD5E1; padding: 6px 10px; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="4" class="titulo">REPORTE DE AUDITORÍA FINAL CONFECCIÓN</td></tr>
          <tr><td class="encabezado">FECHA Y HORA</td><td colspan="3">${registro.fecha || ''}</td></tr>
          <tr><td colspan="4"></td></tr>
          <tr><td colspan="4" class="seccion">DATOS DEL LOTE</td></tr>
          <tr>
            <td class="encabezado">Empresa</td><td>${registro.empresa || ''}</td>
            <td class="encabezado">Referencia</td><td>${registro.referencia || ''}</td>
          </tr>
          <tr>
            <td class="encabezado">Número de Lote</td><td>${registro.loteNum || ''}</td>
            <td class="encabezado">Tamaño del Lote</td><td class="destacado">${registro.tamañoLote || 0}</td>
          </tr>
          <tr>
            <td class="encabezado">Nivel de Inspección</td><td>${registro.nivelInspeccion || ''}</td>
            <td class="encabezado">Críticos: Ac / Re</td><td>${registro.criticosAcRe ?? 0}</td>
          </tr>
          <tr>
            <td class="encabezado">AQL Mayores</td><td>${registro.aqlMayores || ''}</td>
            <td class="encabezado">AQL Menores</td><td>${registro.aqlMenores || ''}</td>
          </tr>
          <tr><td colspan="4"></td></tr>
          <tr><td colspan="4" class="seccion">PLAN DE MUESTREO (NORMA ISO 2859-1)</td></tr>
          <tr>
            <td class="encabezado">Letra de Código</td><td class="destacado">${registro.planMuestreo?.letra || '--'}</td>
            <td class="encabezado">Muestra (n)</td><td class="destacado">${registro.planMuestreo?.muestraTotal || '--'}</td>
          </tr>
          <tr>
            <td class="encabezado">Ac Mayores</td><td style="color:#059669;font-weight:bold;">${registro.planMuestreo?.acMayores ?? '--'}</td>
            <td class="encabezado">Re Mayores</td><td style="color:#DC2626;font-weight:bold;">${registro.planMuestreo?.reMayores ?? '--'}</td>
          </tr>
          <tr>
            <td class="encabezado">Ac Menores</td><td style="color:#059669;font-weight:bold;">${registro.planMuestreo?.acMenores ?? '--'}</td>
            <td class="encabezado">Re Menores</td><td style="color:#DC2626;font-weight:bold;">${registro.planMuestreo?.reMenores ?? '--'}</td>
          </tr>
          <tr><td colspan="4"></td></tr>
          <tr><td colspan="4" class="seccion">RESULTADO DE LA AUDITORÍA (DEFECTOS)</td></tr>
          <tr>
            <td class="encabezado">Críticos</td><td style="color:#DC2626;font-weight:bold;">${registro.defectos?.criticos ?? 0}</td>
            <td class="encabezado">Mayores</td><td style="color:#EA580C;font-weight:bold;">${registro.defectos?.mayores ?? 0}</td>
          </tr>
          <tr>
            <td class="encabezado">Menores</td><td style="color:#CA8A04;font-weight:bold;">${registro.defectos?.menores ?? 0}</td>
            <td class="encabezado">Total Defectos</td><td style="font-weight:bold;">${(registro.defectos?.criticos || 0) + (registro.defectos?.mayores || 0) + (registro.defectos?.menores || 0)}</td>
          </tr>
          <tr>
            <td class="encabezado">DECISIÓN FINAL</td>
            <td colspan="3" class="${registro.decision?.estado === 'APROBADO' ? 'aprobado' : 'rechazado'}">
              ${registro.decision?.texto || registro.decision?.estado || 'PENDIENTE'}
            </td>
          </tr>
          <tr><td colspan="4"></td></tr>
          <tr><td colspan="4" class="seccion">CLASIFICACIÓN DE SEGUNDAS</td></tr>
          <tr>
            <td class="encabezado">Por Confección</td><td>${registro.segundas?.confeccion ?? 0}</td>
            <td class="encabezado">Por Tela</td><td>${registro.segundas?.tela ?? 0}</td>
          </tr>
          <tr>
            <td class="encabezado">Por Proceso</td><td>${registro.segundas?.proceso ?? 0}</td>
            <td class="encabezado">Total Segundas</td><td class="destacado">${registro.segundas?.total ?? 0}</td>
          </tr>
          <tr>
            <td class="encabezado">Porcentaje Segundas</td>
            <td colspan="3" style="font-weight:bold;color:#4F46E5;">${registro.segundas?.porcentaje || '0.00%'}</td>
          </tr>
          <tr><td colspan="4"></td></tr>
          <tr><td colspan="4" class="seccion">OBSERVACIONES</td></tr>
          <tr>
            <td class="encabezado">Comentarios</td>
            <td colspan="3">${registro.comentarios || 'Sin observaciones registradas'}</td>
          </tr>
          <tr>
            <td class="encabezado">Fotos Adjuntas</td><td>${registro.fotos?.length ?? 0}</td>
            <td class="encabezado">Destinatario Correo</td><td>${registro.correo?.destinatario || '10ALNORTESAS@GMAIL.COM'}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast("Descargando reporte en Excel...");
  };

  // Exportar todas las auditorías juntas en una sola hoja consolidada
  const descargarTodasEnExcel = () => {
    if (historialAuditorias.length === 0) {
      triggerToast("No hay registros en la base de datos para exportar");
      return;
    }

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          th { background-color: #312E81; color: #FFFFFF; font-weight: bold; border: 1px solid #1E1B4B; padding: 6px; }
          td { border: 1px solid #CBD5E1; padding: 6px; }
          .aprobado { background-color: #DCFCE7; color: #166534; font-weight: bold; }
          .rechazado { background-color: #FEE2E2; color: #991B1B; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Fecha</th><th>Empresa</th><th>Referencia</th><th>Lote</th><th>Tamaño</th>
              <th>Nivel</th><th>AQL May</th><th>AQL Men</th><th>Letra</th><th>Muestra (n)</th>
              <th>Ac/Re May</th><th>Ac/Re Men</th><th>Críticos</th><th>Mayores</th><th>Menores</th>
              <th>Dictamen</th><th>Seg. Confección</th><th>Seg. Tela</th><th>Seg. Proceso</th>
              <th>Total Segundas</th><th>% Segundas</th><th>Fotos</th><th>Comentarios</th><th>Destinatario Correo</th>
            </tr>
          </thead>
          <tbody>
            ${historialAuditorias.map(item => `
              <tr>
                <td>${item.id}</td><td>${item.fecha || ''}</td><td>${item.empresa || ''}</td>
                <td>${item.referencia || ''}</td><td>${item.loteNum || ''}</td><td>${item.tamañoLote || 0}</td>
                <td>${item.nivelInspeccion || ''}</td><td>${item.aqlMayores || ''}</td><td>${item.aqlMenores || ''}</td>
                <td>${item.planMuestreo?.letra || ''}</td><td>${item.planMuestreo?.muestraTotal || ''}</td>
                <td>${item.planMuestreo?.acMayores ?? ''}/${item.planMuestreo?.reMayores ?? ''}</td>
                <td>${item.planMuestreo?.acMenores ?? ''}/${item.planMuestreo?.reMenores ?? ''}</td>
                <td>${item.defectos?.criticos ?? 0}</td><td>${item.defectos?.mayores ?? 0}</td><td>${item.defectos?.menores ?? 0}</td>
                <td class="${item.decision?.estado === 'APROBADO' ? 'aprobado' : 'rechazado'}">${item.decision?.texto || item.decision?.estado}</td>
                <td>${item.segundas?.confeccion ?? 0}</td><td>${item.segundas?.tela ?? 0}</td><td>${item.segundas?.proceso ?? 0}</td>
                <td>${item.segundas?.total ?? 0}</td><td>${item.segundas?.porcentaje || '0%'}</td>
                <td>${item.fotos?.length ?? 0}</td>
                <td>${item.comentarios || ''}</td><td>${item.correo?.destinatario || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Consolidado_Auditorias_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast("Descargando consolidado en Excel...");
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col relative antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Notificación Toast Flotante */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] sm:w-auto max-w-md bg-slate-900 text-white px-4 sm:px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[60] border border-slate-700">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ENCABEZADO */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-3 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col items-start leading-none">
            <div className="flex items-center">
              <span className="text-2xl font-black" style={{ color: '#FFD600' }}>CRE</span>
              <span className="text-2xl font-black text-black">ARTE</span>
            </div>
            <span className="text-[10px] italic text-zinc-400 -mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>by confeccionarte</span>
          </div>
          <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
          <p className="hidden sm:block text-[11px] text-slate-500 font-medium truncate">
            Auditoría Final Confección · Muestreo AQL
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Botones de escritorio (en móvil van en la barra inferior) */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsHistorialOpen(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border border-slate-300 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 5h16M9 4v16"/></svg>
              <span>Base de Datos ({historialAuditorias.length})</span>
            </button>

            <button
              type="button"
              onClick={() => guardarAuditoria()}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer shadow-emerald-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              <span>Guardar en BD</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEmailModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-200 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <span>Enviar Correo</span>
            </button>
          </div>

          {/* Usuario y salir */}
          <div className="flex items-center gap-2 sm:pl-3 sm:border-l sm:border-slate-200">
            <div className="hidden md:block text-right leading-tight">
              <p className="text-xs font-bold text-slate-800 max-w-[160px] truncate">{usuario.nombre}</p>
              <p className="text-[11px] text-slate-500 max-w-[160px] truncate">{usuario.email}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-28 sm:pb-8 space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>Fecha de auditoría: <strong>{new Date().toLocaleDateString('es-CO')}</strong></span>
          <button 
            type="button"
            onClick={limpiarFormulario}
            className="text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
          >
            + Nueva Auditoría en Blanco
          </button>
        </div>

        {/* 1. DATOS DEL LOTE */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/80 px-4 sm:px-6 py-3.5 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Datos del Lote
            </h2>
            <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-semibold">
              Diligenciable / Seleccionable
            </span>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            <div className="space-y-1.5 col-span-2 lg:col-span-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Empresa</label>
              <select 
                name="empresa" 
                value={formData.empresa} 
                onChange={handleFormChange}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
              >
                <option value="">-- Seleccionar Empresa --</option>
                <option value="10 AL NORTE">10 AL NORTE</option>
                <option value="GRIS VERDE">GRIS VERDE</option>
                <option value="VIVETEXTIL">VIVETEXTIL</option>
                <option value="GREENT">GREENT</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Referencia</label>
              <input 
                type="text" 
                name="referencia" 
                placeholder="Ej. 543678"
                value={formData.referencia} 
                onChange={handleFormChange}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Número de Lote</label>
              <input 
                type="text" 
                name="loteNum" 
                placeholder="Ej. 123456"
                value={formData.loteNum} 
                onChange={handleFormChange}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-indigo-700 uppercase">Tamaño Lote (Unidades)</label>
              <input 
                type="number" 
                min="0"
                name="tamañoLote" 
                placeholder="0"
                value={formData.tamañoLote} 
                onChange={handleFormChange}
                className="w-full bg-indigo-50/70 border border-indigo-200 text-indigo-950 font-bold text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Nivel de Inspección</label>
              <select 
                name="nivelInspeccion" 
                value={formData.nivelInspeccion} 
                onChange={handleFormChange}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
              >
                <option value="">-- Seleccionar --</option>
                <option value="I">I (Económico)</option>
                <option value="II">II (Normal Estándar)</option>
                <option value="III">III (Riguroso)</option>
                <option value="S-1">S-1 (Especial)</option>
                <option value="S-2">S-2 (Especial)</option>
                <option value="S-3">S-3 (Especial)</option>
                <option value="S-4">S-4 (Especial)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">AQL Mayores</label>
              <select 
                name="aqlMayores" 
                value={formData.aqlMayores} 
                onChange={handleFormChange}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
              >
                <option value="">-- Seleccionar --</option>
                <option value="0.65">0.65</option>
                <option value="1.0">1.0</option>
                <option value="1.5">1.5</option>
                <option value="2.5">2.5</option>
                <option value="4.0">4.0</option>
                <option value="6.5">6.5</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">AQL Menores</label>
              <select 
                name="aqlMenores" 
                value={formData.aqlMenores} 
                onChange={handleFormChange}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none cursor-pointer"
              >
                <option value="">-- Seleccionar --</option>
                <option value="0.65">0.65</option>
                <option value="1.0">1.0</option>
                <option value="1.5">1.5</option>
                <option value="2.5">2.5</option>
                <option value="4.0">4.0</option>
                <option value="6.5">6.5</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Críticos: Ac / Re</label>
              <input 
                type="number" 
                min="0"
                name="criticosAcRe" 
                value={formData.criticosAcRe} 
                onChange={handleFormChange}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* 2. PLAN DE MUESTREO (AUTOMÁTICO) */}
        <section className="bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden border border-slate-800">
          <div className="bg-slate-950 px-4 sm:px-6 py-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              Plan de Muestreo
            </h2>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-semibold">
              Cálculo Automático
            </span>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Letra Código</p>
              <p className="text-2xl font-black text-indigo-400">{planMuestreo.letra}</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-xl border-2 border-indigo-500/50">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Muestra (n)</p>
              <p className="text-2xl font-black text-white">{planMuestreo.muestraTotal}</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Ac Mayores</p>
              <p className="text-2xl font-black text-emerald-400">{planMuestreo.acMayores}</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">Re Mayores</p>
              <p className="text-2xl font-black text-rose-400">{planMuestreo.reMayores}</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Ac Menores</p>
              <p className="text-2xl font-black text-emerald-400">{planMuestreo.acMenores}</p>
            </div>
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
              <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">Re Menores</p>
              <p className="text-2xl font-black text-rose-400">{planMuestreo.reMenores}</p>
            </div>
          </div>
        </section>

        {/* 3. RESULTADOS DE LA AUDITORÍA & SEGUNDAS */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/80 px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Resultado de la Auditoría y Clasificación
              </h2>
              <p className="text-xs text-slate-500">Resumen de defectos y evaluación de calidad</p>
            </div>

            <button 
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer shadow-indigo-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              <span>Editar Hallazgos</span>
            </button>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${decisionFinal.clase}`}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2">Decisión de Auditoría</p>
              <p className="text-xl font-black">{decisionFinal.texto}</p>
              <p className="text-xs mt-3 opacity-80">
                Críticos: {auditResults.defectos.criticos} | Mayores: {auditResults.defectos.mayores} | Menores: {auditResults.defectos.menores}
              </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
                Prendas Defectuosas
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Críticos:</span>
                  <span className="font-bold text-rose-600 text-base">{auditResults.defectos.criticos}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Mayores:</span>
                  <span className="font-bold text-orange-600 text-base">{auditResults.defectos.mayores}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Menores:</span>
                  <span className="font-bold text-yellow-600 text-base">{auditResults.defectos.menores}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">
                Clasificación de Segundas
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Por Confección:</span>
                  <span className="font-bold text-slate-800">{auditResults.segundas.confeccion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Por Tela:</span>
                  <span className="font-bold text-slate-800">{auditResults.segundas.tela}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Por Proceso:</span>
                  <span className="font-bold text-slate-800">{auditResults.segundas.proceso}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                  <span className="text-indigo-900">Total / Porcentaje:</span>
                  <span className="text-indigo-600">{totalSegundas} ({porcentajeSegundas})</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* BARRA INFERIOR SOLO MÓVIL */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 grid grid-cols-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <button type="button" onClick={() => setIsHistorialOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-slate-600 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 5h16M9 4v16"/></svg>
          <span className="text-[11px] font-semibold">Registros ({historialAuditorias.length})</span>
        </button>
        <button type="button" onClick={() => guardarAuditoria()} className="flex flex-col items-center gap-1 py-2.5 text-emerald-700 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
          <span className="text-[11px] font-semibold">Guardar</span>
        </button>
        <button type="button" onClick={() => setIsEmailModalOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-indigo-700 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          <span className="text-[11px] font-semibold">Correo</span>
        </button>
      </nav>

      {/* --- PESTAÑA LATERAL DESPLEGABLE (DRAWER) --- */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <aside 
        className={`fixed top-0 right-0 h-[100dvh] w-full sm:w-[420px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-200 ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Editar Hallazgos</h2>
            <p className="text-xs text-slate-400">Ingreso manual de defectos y segundas</p>
          </div>
          <button 
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2 flex justify-between items-center">
              <span>Defectos Encontrados</span>
              <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                Muestra (n): {planMuestreo.muestraTotal}
              </span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-sm font-semibold text-rose-700">Críticos</span>
                <input 
                  type="number" 
                  min="0"
                  value={auditResults.defectos.criticos}
                  onChange={(e) => handleAuditChange('defectos', 'criticos', e.target.value)}
                  className="w-24 bg-white border border-slate-300 text-center font-bold text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-sm font-semibold text-orange-700">Mayores</span>
                <input 
                  type="number" 
                  min="0"
                  value={auditResults.defectos.mayores}
                  onChange={(e) => handleAuditChange('defectos', 'mayores', e.target.value)}
                  className="w-24 bg-white border border-slate-300 text-center font-bold text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-sm font-semibold text-yellow-700">Menores</span>
                <input 
                  type="number" 
                  min="0"
                  value={auditResults.defectos.menores}
                  onChange={(e) => handleAuditChange('defectos', 'menores', e.target.value)}
                  className="w-24 bg-white border border-slate-300 text-center font-bold text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Clasificación de Segundas
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Por Confección</span>
                <input 
                  type="number" 
                  min="0"
                  value={auditResults.segundas.confeccion}
                  onChange={(e) => handleAuditChange('segundas', 'confeccion', e.target.value)}
                  className="w-24 bg-white border border-slate-300 text-center font-bold text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Por Tela</span>
                <input 
                  type="number" 
                  min="0"
                  value={auditResults.segundas.tela}
                  onChange={(e) => handleAuditChange('segundas', 'tela', e.target.value)}
                  className="w-24 bg-white border border-slate-300 text-center font-bold text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Por Proceso</span>
                <input 
                  type="number" 
                  min="0"
                  value={auditResults.segundas.proceso}
                  onChange={(e) => handleAuditChange('segundas', 'proceso', e.target.value)}
                  className="w-24 bg-white border border-slate-300 text-center font-bold text-sm rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
              Comentarios y Evidencias
            </h3>
            <textarea 
              rows="3"
              placeholder="Escribe comentarios u observaciones de la auditoría..."
              value={auditResults.comentarios}
              onChange={(e) => setAuditResults(prev => ({ ...prev, comentarios: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />

            {/* Adjuntar fotos desde archivos / galería / cámara */}
            <label className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 border border-slate-300 cursor-pointer">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Adjuntar Foto ({auditResults.fotos.length})</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFotos}
                className="hidden"
              />
            </label>

            {auditResults.fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {auditResults.fotos.map(foto => (
                  <div key={foto.id} className="relative">
                    <img
                      src={foto.src}
                      alt={foto.nombre}
                      className="w-full h-20 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => quitarFoto(foto.id)}
                      title="Quitar foto"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button 
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md cursor-pointer"
          >
            Guardar y Cerrar
          </button>
        </div>
      </aside>

      {/* --- PANEL MODAL: BASE DE DATOS / HISTORIAL --- */}
      {isHistorialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsHistorialOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 z-10">
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 5h16M9 4v16"/></svg>
                <div>
                  <h3 className="font-bold text-base leading-tight">Base de Datos de Auditorías</h3>
                  <p className="text-xs text-slate-400">{historialAuditorias.length} registros guardados en esta aplicación</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {historialAuditorias.length > 0 && (
                  <button 
                    type="button"
                    onClick={descargarTodasEnExcel}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                    title="Descargar todos los registros juntos en Excel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span className="hidden sm:inline">Exportar Todo (Excel)</span>
                  </button>
                )}

                <button 
                  type="button"
                  onClick={() => setIsHistorialOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
              {historialAuditorias.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  <p className="text-sm font-semibold text-slate-600">Aún no hay auditorías registradas en la base de datos.</p>
                  <p className="text-xs">Diligencia los datos del lote y haz clic en <strong>"Guardar en BD"</strong> o <strong>"Enviar Correo"</strong>.</p>
                </div>
              ) : (
                historialAuditorias.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{item.empresa || 'Sin Empresa'}</span>
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">Ref: {item.referencia || 'S/N'}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">Lote: {item.loteNum || 'S/N'}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">
                        {item.fecha} · Tamaño: <strong>{item.tamañoLote} uds</strong> · Muestra (n): <strong>{item.planMuestreo?.muestraTotal || '--'}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        item.decision?.estado === 'APROBADO' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {item.decision?.estado || 'PENDIENTE'}
                      </span>

                      {/* Botón Ver (Ojito) */}
                      <button 
                        type="button"
                        onClick={() => setRegistroVisualizar(item)}
                        title="Ver detalle completo de la auditoría"
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Ver</span>
                      </button>

                      {/* Botón Descargar en Excel */}
                      <button 
                        type="button"
                        onClick={() => descargarExcelIndividual(item)}
                        title="Descargar este registro en Excel"
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Excel</span>
                      </button>

                      {/* Botón Cargar en Formulario */}
                      <button 
                        type="button"
                        onClick={() => cargarRegistro(item)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        Cargar
                      </button>

                      {/* Botón Eliminar Registro */}
                      <button 
                        type="button"
                        onClick={() => eliminarRegistro(item.id)}
                        title="Eliminar registro"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                type="button"
                onClick={() => setIsHistorialOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DETALLADO DEL OJITO (VISUALIZADOR COMPLETO CON DESCARGA A EXCEL) --- */}
      {registroVisualizar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setRegistroVisualizar(null)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del Visor */}
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Detalle de Auditoría</h3>
                  <p className="text-xs text-slate-400">
                    Lote #{registroVisualizar.loteNum || 'S/N'} · {registroVisualizar.fecha}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => descargarPdfIndividual(registroVisualizar)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  <span className="hidden sm:inline">Descargar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>

                <button 
                  type="button"
                  onClick={() => descargarExcelIndividual(registroVisualizar)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  <span className="hidden sm:inline">Descargar en Excel</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setRegistroVisualizar(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Contenido Completo del Registro */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              
              {/* Banner de Decisión Final */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left ${
                registroVisualizar.decision?.estado === 'APROBADO'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">Dictamen de Calidad</span>
                  <span className="text-lg font-black">{registroVisualizar.decision?.texto || registroVisualizar.decision?.estado}</span>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  registroVisualizar.decision?.estado === 'APROBADO' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {registroVisualizar.decision?.estado}
                </span>
              </div>

              {/* 1. Datos Generales del Lote */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  1. Información del Lote
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block font-medium">Empresa:</span>
                    <span className="font-bold text-slate-900 text-sm">{registroVisualizar.empresa || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Referencia:</span>
                    <span className="font-bold text-slate-900 text-sm">{registroVisualizar.referencia || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Número de Lote:</span>
                    <span className="font-bold text-slate-900 text-sm">{registroVisualizar.loteNum || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Tamaño del Lote:</span>
                    <span className="font-bold text-indigo-700 text-sm">{registroVisualizar.tamañoLote} unidades</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Nivel de Inspección:</span>
                    <span className="font-bold text-slate-800">{registroVisualizar.nivelInspeccion || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">AQL Mayores:</span>
                    <span className="font-bold text-slate-800">{registroVisualizar.aqlMayores || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">AQL Menores:</span>
                    <span className="font-bold text-slate-800">{registroVisualizar.aqlMenores || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Críticos Ac / Re:</span>
                    <span className="font-bold text-slate-800">{registroVisualizar.criticosAcRe}</span>
                  </div>
                </div>
              </div>

              {/* 2. Plan de Muestreo Calculado */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                  2. Plan de Muestreo Calculado (AQL)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center">
                  <div className="bg-slate-900 text-white p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Letra</span>
                    <span className="text-xl font-black text-indigo-400">{registroVisualizar.planMuestreo?.letra || '--'}</span>
                  </div>
                  <div className="bg-slate-900 text-white p-3 rounded-xl border border-indigo-500/50">
                    <span className="text-[10px] text-slate-400 uppercase block font-bold">Muestra (n)</span>
                    <span className="text-xl font-black text-white">{registroVisualizar.planMuestreo?.muestraTotal || '--'}</span>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-emerald-700 uppercase block font-bold">Ac Mayores</span>
                    <span className="text-xl font-black text-emerald-600">{registroVisualizar.planMuestreo?.acMayores ?? '--'}</span>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-rose-700 uppercase block font-bold">Re Mayores</span>
                    <span className="text-xl font-black text-rose-600">{registroVisualizar.planMuestreo?.reMayores ?? '--'}</span>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-emerald-700 uppercase block font-bold">Ac Menores</span>
                    <span className="text-xl font-black text-emerald-600">{registroVisualizar.planMuestreo?.acMenores ?? '--'}</span>
                  </div>
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-rose-700 uppercase block font-bold">Re Menores</span>
                    <span className="text-xl font-black text-rose-600">{registroVisualizar.planMuestreo?.reMenores ?? '--'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Hallazgos y Segundas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h5 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3">Defectos Encontrados</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="font-semibold text-rose-700">Críticos:</span>
                      <span className="font-bold text-sm text-rose-700">{registroVisualizar.defectos?.criticos ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="font-semibold text-orange-700">Mayores:</span>
                      <span className="font-bold text-sm text-orange-700">{registroVisualizar.defectos?.mayores ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="font-semibold text-amber-700">Menores:</span>
                      <span className="font-bold text-sm text-amber-700">{registroVisualizar.defectos?.menores ?? 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h5 className="text-xs font-bold uppercase text-slate-700 border-b pb-2 mb-3">Clasificación de Segundas</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-600 font-medium">Por Confección:</span>
                      <span className="font-bold text-sm text-slate-900">{registroVisualizar.segundas?.confeccion ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-600 font-medium">Por Tela:</span>
                      <span className="font-bold text-sm text-slate-900">{registroVisualizar.segundas?.tela ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="text-slate-600 font-medium">Por Proceso:</span>
                      <span className="font-bold text-sm text-slate-900">{registroVisualizar.segundas?.proceso ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 font-bold text-indigo-900">
                      <span>Total Segundas:</span>
                      <span>{registroVisualizar.segundas?.total ?? 0} ({registroVisualizar.segundas?.porcentaje || '0.00%'})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Comentarios, Fotos y Correo */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Comentarios / Observaciones:</span>
                  <p className="text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200">
                    {registroVisualizar.comentarios || 'Sin observaciones registradas.'}
                  </p>
                </div>

                {registroVisualizar.fotos?.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {registroVisualizar.fotos.map(foto => (
                      <img
                        key={foto.id}
                        src={foto.src}
                        alt={foto.nombre}
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-slate-500">
                  <span>Fotos de evidencia adjuntas: <strong>{registroVisualizar.fotos?.length ?? 0}</strong></span>
                  {registroVisualizar.correo?.destinatario && (
                    <span className="text-indigo-700 font-medium">
                      Destinatario: <strong>{registroVisualizar.correo.destinatario}</strong>
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Pie del Visor */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
              <button 
                type="button"
                onClick={() => {
                  cargarRegistro(registroVisualizar);
                  setRegistroVisualizar(null);
                }}
                className="px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cargar en Formulario
              </button>

              <button 
                type="button"
                onClick={() => setRegistroVisualizar(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- OVERLAY CONFIRMACIÓN CORREO ENVIADO --- */}
      {correoEnviado && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white border-4 border-emerald-400 rounded-3xl shadow-2xl px-10 py-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-400 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-2xl font-black text-emerald-700">¡Enviado!</p>
            <p className="text-sm text-slate-500">El correo fue enviado correctamente</p>
          </div>
        </div>
      )}

      {/* --- MODAL CENTRADO DE ENVÍO DE CORREO --- */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
            onClick={() => { setIsEmailModalOpen(false); setCorreoEnviado(false); setArchivosExtra([]); }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92dvh] overflow-hidden flex flex-col border border-slate-200 z-10">
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                <h3 className="font-bold text-base">Enviar Reporte de Auditoría</h3>
              </div>
              <button type="button" onClick={() => { setIsEmailModalOpen(false); setCorreoEnviado(false); setArchivosExtra([]); }} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Destinatario</label>
                <input
                  type="email"
                  placeholder="Escribe un correo..."
                  value={emailDestinatarios.filter(e => !['analista.calidad@crearte-sas.com','produccion.creartesas@gmail.com','walter.quintana@crearte-sas.com','integracion.crearte@gmail.com'].includes(e)).join('')}
                  onChange={(e) => {
                    const presets = ['analista.calidad@crearte-sas.com','produccion.creartesas@gmail.com','walter.quintana@crearte-sas.com','integracion.crearte@gmail.com'];
                    const val = e.target.value;
                    setEmailDestinatarios(prev => [...prev.filter(x => presets.includes(x)), ...(val ? [val] : [])]);
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">O selecciona contactos</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    { nombre: 'Yaqueline Cano', cargo: 'Analista de Calidad', email: 'analista.calidad@crearte-sas.com' },
                    { nombre: 'Jasbleidy González', cargo: 'Producción', email: 'produccion.creartesas@gmail.com' },
                    { nombre: 'Walter Quintana', cargo: 'Dirección', email: 'walter.quintana@crearte-sas.com' },
                    { nombre: 'Integración Crearte', cargo: 'Integración', email: 'integracion.crearte@gmail.com' },
                  ].map((c) => {
                    const sel = emailDestinatarios.includes(c.email);
                    return (
                      <button
                        key={c.email}
                        type="button"
                        onClick={() => setEmailDestinatarios(prev => sel ? prev.filter(x => x !== c.email) : [...prev, c.email])}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          sel ? 'border-[#FFD600] bg-yellow-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          sel ? 'bg-[#FFD600] text-black' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {c.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-bold text-slate-800">{c.nombre}</span>
                          <span className="text-slate-400 text-xs"> · {c.cargo}</span>
                          <p className="text-xs text-slate-400 truncate">{c.email}</p>
                        </div>
                        {sel && (
                          <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mensaje Adicional</label>
                <textarea
                  rows="3"
                  placeholder="Escribe comentarios específicos para el destinatario..."
                  value={mensajeAdicional}
                  onChange={(e) => setMensajeAdicional(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="w-full flex items-center gap-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 p-3 rounded-xl cursor-pointer transition-colors">
                  <svg className="w-5 h-5 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  <span className="text-sm font-semibold text-slate-700">Adjuntar archivo</span>
                  <input type="file" multiple onChange={handleArchivosExtra} className="hidden" />
                </label>
                {archivosExtra.length > 0 && (
                  <ul className="space-y-1">
                    {archivosExtra.map((f, i) => (
                      <li key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                        <span className="truncate text-slate-700 font-medium">{f.name}</span>
                        <button type="button" onClick={() => quitarArchivoExtra(i)} className="ml-2 text-rose-500 hover:text-rose-700 font-bold shrink-0 cursor-pointer">×</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button type="button" onClick={() => setIsEmailModalOpen(false)} className="px-4 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors cursor-pointer">Cancelar</button>
              <button type="button" onClick={handleEnviarCorreo} disabled={enviando} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow flex items-center gap-2 cursor-pointer disabled:opacity-60">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                <span>{enviando ? 'Enviando...' : 'Guardar y enviar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(() => sesionActual());

  useEffect(() => {
    document.title = 'Crearte By Confeccionarte';
  }, []);

  const salir = () => {
    cerrarSesion();
    setUsuario(null);
  };

  if (window.location.pathname === '/verificacion') return <Verificacion />;
  if (!usuario) return <Login onAuth={setUsuario} />;
  return <Auditoria usuario={usuario} onLogout={salir} />;
}