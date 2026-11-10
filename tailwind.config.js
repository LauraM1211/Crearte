/** @type {import('tailwindcss').Config} */
export default {
  // Archivos donde Tailwind busca nombres de clases para incluirlas en el CSS final.
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Tema Crearte: amarillo y negro.
      // El código usa clases "indigo-*" y "slate-*"; aquí se redefinen
      // para que toda la app cambie de color sin editar App.jsx ni Login.jsx.
      colors: {
        // Reasigna tonos indigo usados por la interfaz a la marca amarilla/negra.
        indigo: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#111111',
          700: '#0A0A0A',
          800: '#050505',
          900: '#000000',
          950: '#000000'
        },
        // Ajusta los tonos oscuros slate usados como fondos y textos de la aplicación.
        slate: {
          700: '#262626',
          800: '#171717',
          900: '#0F0F0F',
          950: '#000000'
        }
      }
    }
  },
  // No se agregan plugins adicionales de Tailwind.
  plugins: []
};