import React, { useState } from 'react';
import {
  iniciarSesion,
  recuperarClave,
  leerUltimoCorreo
} from './auth.js';

const IconoOjo = ({ abierto }) =>
  abierto ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

export default function Login({ onAuth }) {
  const [email, setEmail] = useState(() => leerUltimoCorreo());
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault(); setError(''); setAviso(''); setCargando(true);
    const res = await iniciarSesion({ email, clave });
    setCargando(false);
    if (!res.ok) { setError(res.error); return; }
    onAuth(res.usuario);
  };

  const olvideClave = async () => {
    setError(''); setAviso(''); setCargando(true);
    const res = await recuperarClave(email);
    setCargando(false);
    if (!res.ok) { setError(res.error); return; }
    setAviso('Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva.');
  };

  const inputCls =
    'w-full bg-zinc-50 border border-zinc-300 text-zinc-900 rounded-xl px-3.5 py-3 text-base focus:ring-2 focus:ring-yellow-400 focus:bg-white outline-none placeholder-zinc-400';

  return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center px-4 py-8 font-sans antialiased">
      <div className="w-full max-w-sm">

        {/* Marca */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center leading-none">
            <span className="text-4xl font-black" style={{ color: '#FFD600' }}>CRE</span>
            <span className="text-4xl font-black text-black">ARTE</span>
          </div>
          <p className="text-sm italic mt-1.5 text-zinc-500" style={{ fontFamily: 'Georgia, serif' }}>by confeccionarte</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5 sm:p-6">
          <form onSubmit={enviar} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600">Correo</label>
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600">Contraseña</label>
                  <div className="relative">
                    <input
                      type={verClave ? 'text' : 'password'}
                      autoComplete="current-password"
                      autoFocus={!!email}
                      placeholder="Tu contraseña"
                      value={clave}
                      onChange={(e) => setClave(e.target.value)}
                      className={inputCls + ' pr-12'}
                    />
                    <button
                      type="button"
                      onClick={() => setVerClave(v => !v)}
                      aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      title={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute inset-y-0 right-0 px-3.5 flex items-center text-zinc-400 hover:text-yellow-500 cursor-pointer"
                    >
                      <IconoOjo abierto={verClave} />
                    </button>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={olvideClave}
                      disabled={cargando}
                      className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>

                {aviso && !error && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl px-3.5 py-2.5">
                    {aviso}
                  </div>
                )}

                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl px-3.5 py-2.5">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-black font-bold py-3 rounded-xl text-base transition-colors shadow-md cursor-pointer"
                >
                  {cargando ? 'Un momento...' : 'Entrar'}
                </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-5">
          Auditoría final de confección · Muestreo AQL
        </p>
      </div>
    </div>
  );
}
