/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Tema Crearte: amarillo y negro.
      // El código usa clases "indigo-*" y "slate-*"; aquí se redefinen
      // para que toda la app cambie de color sin editar App.jsx ni Login.jsx.
      colors: {
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
        slate: {
          700: '#262626',
          800: '#171717',
          900: '#0F0F0F',
          950: '#000000'
        }
      }
    }
  },
  plugins: []
};