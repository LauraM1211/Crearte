import React, { useState } from 'react';
import { procesarVerificacion } from './auth.js';

export default function Verificacion() {
  const [estado, setEstado] = useState('pendiente'); // 'pendiente' | 'ok' | 'error'
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const verificar = async () => {
    setCargando(true);
    const res = await procesarVerificacion();
    setCargando(false);
    if (res.ok) {
      setEstado('ok');
      setMensaje(res.mensaje);
    } else {
      setEstado('error');
      setMensaje(res.error);
    }
  };

  const irAlLogin = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center px-4 py-8 font-sans antialiased">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center leading-none">
            <span className="text-4xl font-black" style={{ color: '#FFD600' }}>CRE</span>
            <span className="text-4xl font-black text-black">ARTE</span>
          </div>
          <p className="text-sm italic mt-1.5 text-zinc-500" style={{ fontFamily: 'Georgia, serif' }}>by confeccionarte</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 space-y-5">
          <div className="text-center">
            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center border ${
              estado === 'ok'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-500'
                : estado === 'error'
                ? 'bg-rose-50 border-rose-400 text-rose-500'
                : 'bg-yellow-50 border-yellow-400 text-yellow-500'
            }`}>
              {estado === 'ok' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : estado === 'error' ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>

            <h2 className="mt-3 text-lg font-bold text-zinc-900">
              {estado === 'ok' ? '¡Correo verificado!' : estado === 'error' ? 'No se pudo verificar' : 'Verificá tu correo'}
            </h2>

            <p className="text-sm text-zinc-500 mt-1">
              {estado === 'pendiente'
                ? 'Hacé clic en el botón para confirmar tu dirección de correo.'
                : mensaje}
            </p>
          </div>

          {estado === 'pendiente' && (
            <button
              type="button"
              onClick={verificar}
              disabled={cargando}
              className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-black font-bold py-3 rounded-xl text-base transition-colors shadow-md cursor-pointer"
            >
              {cargando ? 'Verificando...' : 'Verificación'}
            </button>
          )}

          {(estado === 'ok' || estado === 'error') && (
            <button
              type="button"
              onClick={irAlLogin}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl text-base transition-colors shadow-md cursor-pointer"
            >
              {estado === 'ok' ? 'Ir al inicio de sesión' : 'Volver al inicio'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
