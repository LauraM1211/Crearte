// Genera el reporte de auditoría en PDF (mismo contenido del Excel + fotos de evidencia).
// Requiere:  npm install pdf-lib
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const M = 36;
const W = PAGE_W - M * 2;

const color = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

// Paleta Crearte: amarillo y negro
const C = {
  amarillo: '#FACC15',
  indigo: '#111111',        // color de acento para valores (negro)
  indigoDark: '#000000',    // fondo del encabezado
  indigoSoft: '#FACC15',    // subtítulos sobre fondo negro (amarillo)
  ink: '#0F172A', slate600: '#475569', slate500: '#64748B',
  slate200: '#E2E8F0', slate100: '#F1F5F9', slate50: '#F8FAFC', white: '#FFFFFF',
  emerald: '#059669', emeraldBg: '#DCFCE7', emeraldTx: '#166534',
  rose: '#DC2626', roseBg: '#FEE2E2', roseTx: '#991B1B',
  orange: '#EA580C', amber: '#CA8A04', amberBg: '#FEF3C7', amberTx: '#92400E'
};

// Helvetica del PDF solo soporta WinAnsi: se limpian caracteres raros (emojis, flechas, etc.)
const ESPECIALES = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const limpiar = (t) =>
  Array.from(
    String(t ?? '')
      .replace(/[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
      .replace(/[\r\t]/g, ' ')
  )
    .map((ch) => {
      const c = ch.codePointAt(0);
      if (ch === '\n') return ch;
      if ((c >= 32 && c <= 126) || (c >= 160 && c <= 255) || ESPECIALES.includes(ch)) return ch;
      return '?';
    })
    .join('');

const ajustar = (t, font, size, maxW) => {
  let s = limpiar(t).replace(/\n/g, ' ');
  if (font.widthOfTextAtSize(s, size) <= maxW) return s;
  while (s.length > 1 && font.widthOfTextAtSize(s + '...', size) > maxW) s = s.slice(0, -1);
  return s + '...';
};

const partir = (texto, font, size, maxW) => {
  const lineas = [];
  limpiar(texto).split('\n').forEach((par) => {
    if (!par.trim()) { lineas.push(''); return; }
    let actual = '';
    par.split(' ').forEach((palabra) => {
      let pal = palabra;
      while (font.widthOfTextAtSize(pal, size) > maxW) {
        let i = pal.length;
        while (i > 1 && font.widthOfTextAtSize(pal.slice(0, i), size) > maxW) i--;
        if (actual) { lineas.push(actual); actual = ''; }
        lineas.push(pal.slice(0, i));
        pal = pal.slice(i);
      }
      const prueba = actual ? actual + ' ' + pal : pal;
      if (font.widthOfTextAtSize(prueba, size) <= maxW) actual = prueba;
      else { lineas.push(actual); actual = pal; }
    });
    lineas.push(actual);
  });
  return lineas;
};

export const nombreArchivoPdf = (registro) => {
  const limpio = (v, def) => (String(v || def)).replace(/[^a-zA-Z0-9]/g, '_');
  return `Auditoria_${limpio(registro.empresa, 'Empresa')}_Lote_${limpio(registro.loteNum, 'SN')}.pdf`;
};

export async function generarPdfAuditoria(registro) {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Reporte de Auditoría - Crearte By Confeccionarte');
  pdf.setAuthor('Crearte By Confeccionarte');
  const f = await pdf.embedFont(StandardFonts.Helvetica);
  const b = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page;
  let y;

  const texto = (t, x, yy, { font = f, size = 10, col = C.ink } = {}) =>
    page.drawText(limpiar(t), { x, y: yy, size, font, color: color(col) });

  const textoDerecha = (t, xr, yy, opts = {}) => {
    const font = opts.font || f;
    const size = opts.size || 10;
    texto(t, xr - font.widthOfTextAtSize(limpiar(t), size), yy, opts);
  };

  const textoCentro = (t, xc, yy, opts = {}) => {
    const font = opts.font || f;
    const size = opts.size || 10;
    texto(t, xc - font.widthOfTextAtSize(limpiar(t), size) / 2, yy, opts);
  };

  const caja = (x, yy, w, h, fill, borde) =>
    page.drawRectangle({
      x, y: yy, width: w, height: h,
      color: fill ? color(fill) : undefined,
      borderColor: borde ? color(borde) : undefined,
      borderWidth: borde ? 0.6 : 0
    });

  const nuevaPagina = (primera) => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    if (primera) {
      caja(0, PAGE_H - 66, PAGE_W, 66, C.indigoDark);
      caja(0, PAGE_H - 70, PAGE_W, 4, C.amarillo); // franja amarilla
      texto('Crearte By Confeccionarte', M, PAGE_H - 30, { font: b, size: 19, col: C.white });
      texto('Reporte de Auditoría Final Confección', M, PAGE_H - 49, { size: 10.5, col: C.indigoSoft });
      textoDerecha(registro.fecha || '', PAGE_W - M, PAGE_H - 30, { size: 9, col: C.indigoSoft });
      textoDerecha(`Lote #${registro.loteNum || 'S/N'}`, PAGE_W - M, PAGE_H - 49, { font: b, size: 10.5, col: C.white });
      y = PAGE_H - 70 - 20;
    } else {
      caja(0, PAGE_H - 28, PAGE_W, 28, C.indigoDark);
      caja(0, PAGE_H - 31, PAGE_W, 3, C.amarillo); // franja amarilla
      texto('Crearte By Confeccionarte  ·  Reporte de auditoría (continuación)', M, PAGE_H - 18, { size: 9, col: C.white });
      y = PAGE_H - 31 - 18;
    }
  };

  const asegurar = (h) => {
    if (y - h < M + 24) nuevaPagina(false);
  };

  // Barra de sección: fondo amarillo con texto negro
  const seccion = (titulo) => {
    asegurar(70);
    caja(M, y - 18, W, 18, C.amarillo);
    texto(titulo, M + 8, y - 13, { font: b, size: 10, col: C.indigoDark });
    y -= 18 + 6;
  };

  // filas de 2 pares etiqueta/valor: [[l1, v1, colorOpcional], [l2, v2, colorOpcional]]
  const filasClaveValor = (filas) => {
    const lw = W * 0.2;
    const vw = W * 0.3;
    filas.forEach((fila) => {
      asegurar(22);
      fila.forEach((celda, idx) => {
        if (!celda) return;
        const vwCelda = fila.length === 1 ? W - lw : vw;
        const x = M + idx * (lw + vw);
        caja(x, y - 20, lw, 20, C.slate100, C.slate200);
        caja(x + lw, y - 20, vwCelda, 20, C.white, C.slate200);
        texto(ajustar(celda[0], b, 8, lw - 10), x + 6, y - 13.5, { font: b, size: 8, col: C.slate600 });
        texto(ajustar(celda[1], f, 10, vwCelda - 12), x + lw + 6, y - 14, { size: 10, col: celda[2] || C.ink });
      });
      y -= 20;
    });
    y -= 10;
  };

  const cajasDato = (items, alto = 46) => {
    asegurar(alto + 10);
    const gap = 6;
    const bw = (W - gap * (items.length - 1)) / items.length;
    items.forEach((it, idx) => {
      const x = M + idx * (bw + gap);
      caja(x, y - alto, bw, alto, it.bg || C.slate100, it.borde || C.slate200);
      textoCentro(it.label, x + bw / 2, y - 14, { font: b, size: 7.5, col: it.labelCol || C.slate600 });
      textoCentro(String(it.valor), x + bw / 2, y - 37, { font: b, size: 18, col: it.col || C.ink });
    });
    y -= alto + 10;
  };

  // ---------------- CONTENIDO ----------------
  nuevaPagina(true);

  const plan = registro.planMuestreo || {};
  const def = registro.defectos || {};
  const seg = registro.segundas || {};
  const dec = registro.decision || {};
  const totalDef = (def.criticos || 0) + (def.mayores || 0) + (def.menores || 0);

  seccion('DATOS DEL LOTE');
  filasClaveValor([
    [['Empresa', registro.empresa || '-'], ['Referencia', registro.referencia || '-']],
    [['Número de lote', registro.loteNum || '-'], ['Tamaño del lote', `${registro.tamañoLote || 0} uds`, C.indigo]],
    [['Nivel de inspección', registro.nivelInspeccion || '-'], ['Críticos Ac / Re', registro.criticosAcRe ?? 0]],
    [['AQL mayores', registro.aqlMayores || '-'], ['AQL menores', registro.aqlMenores || '-']]
  ]);

  seccion('PLAN DE MUESTREO (ISO 2859-1)');
  cajasDato([
    { label: 'LETRA CÓDIGO', valor: plan.letra ?? '--', bg: C.ink, borde: C.ink, col: C.amarillo, labelCol: '#94A3B8' },
    { label: 'MUESTRA (n)', valor: plan.muestraTotal ?? '--', bg: C.ink, borde: C.ink, col: C.white, labelCol: '#94A3B8' },
    { label: 'AC MAYORES', valor: plan.acMayores ?? '--', col: C.emerald },
    { label: 'RE MAYORES', valor: plan.reMayores ?? '--', col: C.rose },
    { label: 'AC MENORES', valor: plan.acMenores ?? '--', col: C.emerald },
    { label: 'RE MENORES', valor: plan.reMenores ?? '--', col: C.rose }
  ]);

  seccion('RESULTADO DE LA AUDITORÍA (DEFECTOS)');
  cajasDato([
    { label: 'CRÍTICOS', valor: def.criticos ?? 0, col: C.rose },
    { label: 'MAYORES', valor: def.mayores ?? 0, col: C.orange },
    { label: 'MENORES', valor: def.menores ?? 0, col: C.amber },
    { label: 'TOTAL DEFECTOS', valor: totalDef, col: C.ink }
  ]);

  // Banner de decisión final
  {
    asegurar(52);
    const aprobado = dec.estado === 'APROBADO';
    const pendiente = !aprobado && dec.estado !== 'RECHAZADO';
    const fill = aprobado ? C.emeraldBg : pendiente ? C.amberBg : C.roseBg;
    const tx = aprobado ? C.emeraldTx : pendiente ? C.amberTx : C.roseTx;
    caja(M, y - 42, W, 42, fill, tx);
    textoCentro('DECISIÓN FINAL', M + W / 2, y - 14, { font: b, size: 7.5, col: tx });
    textoCentro(ajustar(dec.texto || dec.estado || 'PENDIENTE', b, 14, W - 20), M + W / 2, y - 33, { font: b, size: 14, col: tx });
    y -= 42 + 12;
  }

  seccion('CLASIFICACIÓN DE SEGUNDAS');
  cajasDato([
    { label: 'POR CONFECCIÓN', valor: seg.confeccion ?? 0 },
    { label: 'POR TELA', valor: seg.tela ?? 0 },
    { label: 'POR PROCESO', valor: seg.proceso ?? 0 },
    { label: 'TOTAL SEGUNDAS', valor: seg.total ?? 0, col: C.indigo },
    { label: '% SEGUNDAS', valor: seg.porcentaje || '0.00%', col: C.indigo }
  ]);

  seccion('OBSERVACIONES');
  {
    const lineas = partir(registro.comentarios || 'Sin observaciones registradas.', f, 10, W - 20);
    const alto = 14;
    let idx = 0;
    while (idx < lineas.length) {
      asegurar(alto * 2 + 14);
      const disponibles = Math.floor((y - (M + 24) - 12) / alto);
      const n = Math.max(1, Math.min(disponibles, lineas.length - idx));
      const h = n * alto + 12;
      caja(M, y - h, W, h, C.slate50, C.slate200);
      for (let k = 0; k < n; k++) {
        texto(lineas[idx + k], M + 10, y - 6 - 10 - k * alto, { size: 10, col: C.slate600 });
      }
      y -= h + 6;
      idx += n;
    }
    y -= 4;
  }

  const fotos = registro.fotos || [];
  filasClaveValor([
    [['Auditor', registro.auditor || '-'], ['Fecha y hora', registro.fecha || '-']],
    [['Destinatario', registro.correo?.destinatario || 'Sin envío']]
  ]);

  // ---------------- FOTOS DE EVIDENCIA ----------------
  if (fotos.length > 0) asegurar(280);
  seccion(`EVIDENCIA FOTOGRÁFICA (${fotos.length})`);

  if (fotos.length === 0) {
    texto('No se adjuntaron fotos en esta auditoría.', M, y - 12, { size: 10, col: C.slate500 });
    y -= 22;
  } else {
    const imagenes = [];
    for (let i = 0; i < fotos.length; i++) {
      try {
        const src = fotos[i].src || '';
        const base64 = src.split(',')[1];
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const esPng = src.slice(0, 30).includes('png');
        const img = esPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        imagenes.push({ img, nombre: fotos[i].nombre || `foto_${i + 1}`, n: i + 1 });
      } catch (e) {
        console.warn('No se pudo incluir una foto en el PDF', e);
      }
    }

    const gap = 12;
    const cw = (W - gap) / 2;
    const maxH = 210;

    for (let i = 0; i < imagenes.length; i += 2) {
      const fila = imagenes.slice(i, i + 2).map((it) => {
        const esc = Math.min(cw / it.img.width, maxH / it.img.height);
        return { ...it, w: it.img.width * esc, h: it.img.height * esc };
      });
      const altoFila = Math.max(...fila.map((x) => x.h)) + 30;
      asegurar(altoFila);

      fila.forEach((it, col) => {
        const xCelda = M + col * (cw + gap);
        const x = xCelda + (cw - it.w) / 2;
        page.drawImage(it.img, { x, y: y - it.h, width: it.w, height: it.h });
        page.drawRectangle({ x, y: y - it.h, width: it.w, height: it.h, borderColor: color(C.slate200), borderWidth: 0.8 });
        textoCentro(ajustar(`Foto ${it.n} - ${it.nombre}`, f, 8, cw - 6), xCelda + cw / 2, y - it.h - 13, { size: 8, col: C.slate500 });
      });
      y -= altoFila;
    }
  }

  // ---------------- PIE DE PÁGINA ----------------
  const paginas = pdf.getPages();
  paginas.forEach((p, idx) => {
    page = p;
    page.drawLine({ start: { x: M, y: 34 }, end: { x: PAGE_W - M, y: 34 }, thickness: 0.5, color: color(C.slate200) });
    texto(
      ajustar(`Crearte By Confeccionarte  ·  Auditor: ${registro.auditor || '-'}  ·  ${registro.fecha || ''}`, f, 8, W - 90),
      M, 22, { size: 8, col: C.slate500 }
    );
    textoDerecha(`Página ${idx + 1} de ${paginas.length}`, PAGE_W - M, 22, { size: 8, col: C.slate500 });
  });

  return pdf.save();
}