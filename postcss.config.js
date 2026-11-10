// PostCSS ejecuta los plugins que procesan el CSS durante la compilación.
export default {
  plugins: {
    // Interpreta las directivas @tailwind del archivo de estilos principal.
    tailwindcss: {},
    // Añade prefijos CSS para ampliar compatibilidad entre navegadores.
    autoprefixer: {},
  },
}