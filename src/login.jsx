// React aporta el ciclo de vida, referencias a elementos DOM y estado local del formulario.
import React, { useEffect, useRef, useState } from 'react';
// Las operaciones de acceso quedan centralizadas en auth.js, no en la vista.
import {
  iniciarRegistro,
  iniciarSesion,
  recuperarClave,
  leerUltimoCorreo,
  CODIGO_INVITACION
} from './auth.js';

// Icono del control para revelar u ocultar la contraseña.
// La propiedad abierto selecciona el dibujo del ojo abierto o tachado.
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
  // modo alterna entre inicio de sesión y creación de cuenta.
  const [modo, setModo] = useState('ingresar');
  // Estados controlados: el formulario refleja estos valores y los actualiza al escribir.
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState(() => leerUltimoCorreo());
  const [clave, setClave] = useState('');
  // Referencia al campo de contraseña para enfocarlo al entrar en modo de acceso.
  const claveRef = useRef(null);
  const [codigo, setCodigo] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  // Valor derivado para compartir las condiciones de la vista entre sus secciones.
  const esRegistro = modo === 'registro';

  // Al salir del modo registro, devuelve el foco al campo de contraseña.
  useEffect(() => {
    if (!esRegistro) claveRef.current?.focus();
  }, [esRegistro]);

  // Cambiar de pestaña limpia mensajes anteriores para no mezclar estados de ambos formularios.
  const cambiarModo = (m) => { setModo(m); setError(''); setAviso(''); };

  // Procesa el formulario: llama al registro o al acceso y comunica el resultado a la aplicación.
  const enviar = async (e) => {
    e.preventDefault(); setError(''); setAviso(''); setCargando(true);
    // Ambas operaciones devuelven un resultado uniforme con ok y usuario o error.
    const res = esRegistro
      ? await iniciarRegistro({ nombre, email, clave, codigo })
      : await iniciarSesion({ email, clave });
    setCargando(false);
    if (!res.ok) { setError(res.error); return; }
    // Tras crear la cuenta, limpia los datos sensibles y solicita iniciar sesión explícitamente.
    if (esRegistro) {
      setModo('ingresar');
      setNombre('');
      setClave('');
      setCodigo('');
      setVerClave(false);
      setAviso('Cuenta creada. Ingresa con tu correo y contraseña.');
      return;
    }
    // En acceso correcto entrega el usuario a App para abrir el módulo de auditoría.
    onAuth(res.usuario);
  };

  // Gestiona la solicitud de restablecimiento para el correo escrito.
  const olvideClave = async () => {
    setError(''); setAviso(''); setCargando(true);
    const res = await recuperarClave(email);
    setCargando(false);
    if (!res.ok) { setError(res.error); return; }
    setAviso('Si ese correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva.');
  };

  // Clases compartidas por los campos del formulario para mantener un estilo uniforme.
  const inputCls =
    'w-full bg-zinc-50 border border-zinc-300 text-zinc-900 rounded-xl px-3.5 py-3 text-base focus:ring-2 focus:ring-yellow-400 focus:bg-white outline-none placeholder-zinc-400';

  // La vista usa un contenedor centrado y adaptable al alto disponible del dispositivo.
  return (
    <div className="min-h-[100dvh] bg-white flex items-center justify-center px-4 py-8 font-sans antialiased">
      <div className="w-full max-w-sm">

        {/* Marca del producto en la pantalla de autenticación. */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center leading-none">
            <span className="text-4xl font-black" style={{ color: '#FFD600' }}>CRE</span>
            <span className="text-4xl font-black text-black">ARTE</span>
          </div>
          <p className="text-sm italic mt-1.5 text-zinc-500" style={{ fontFamily: 'Georgia, serif' }}>by confeccionarte</p>
        </div>

        {/* Tarjeta con selector de modo, campos, mensajes y acción principal. */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => cambiarModo('ingresar')}
              className={`py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                !esRegistro ? 'bg-yellow-400 text-black shadow-sm' : 'text-zinc-500'
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => cambiarModo('registro')}
              className={`py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                esRegistro ? 'bg-yellow-400 text-black shadow-sm' : 'text-zinc-500'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Formulario controlado: al enviar ejecuta enviar y no recarga el documento. */}
          <form onSubmit={enviar} className="space-y-4">
            {/* Nombre visible requerido únicamente durante la creación de la cuenta. */}
            {esRegistro && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600">Nombre</label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}

            {/* Correo controlado que se recuerda entre visitas; la contraseña nunca se persiste. */}
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

            {/* Contraseña controlada con autocompletado y opción para mostrar/ocultar. */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-600">Contraseña</label>
              <div className="relative">
                <input
                  ref={claveRef}
                  type={verClave ? 'text' : 'password'}
                  autoComplete={esRegistro ? 'new-password' : 'current-password'}
                  autoFocus={!esRegistro && !!email}
                  placeholder={esRegistro ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
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
              {!esRegistro && (
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
              )}
            </div>

            {/* El campo de invitación solo aparece cuando el proyecto configuró un código. */}
            {esRegistro && CODIGO_INVITACION && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600">Código de invitación</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Pídelo al administrador"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}

                {/* Se muestra un aviso de éxito solo cuando no hay un error activo. */}
                {aviso && !error && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl px-3.5 py-2.5">
                    {aviso}
                  </div>
                )}

                {/* Errores devueltos por auth.js se presentan junto al formulario. */}
                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl px-3.5 py-2.5">
                    {error}
                  </div>
                )}

                {/* El botón se desactiva durante la petición para evitar envíos repetidos. */}
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-black font-bold py-3 rounded-xl text-base transition-colors shadow-md cursor-pointer"
                >
                  {cargando ? 'Un momento...' : esRegistro ? 'Crear cuenta' : 'Entrar'}
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
