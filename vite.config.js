// Herramientas de Vite para definir opciones del servidor de desarrollo y compilación.
import { defineConfig } from 'vite'
// Integra JSX y transformaciones de React en Vite.
import react from '@vitejs/plugin-react'

// Exporta la configuración que Vite consume al ejecutar scripts npm.
export default defineConfig({
  // El plugin procesa los componentes React del proyecto.
  plugins: [react()],
  // Opciones aplicadas al servidor local de desarrollo.
  server: {
  // Escucha en interfaces de red además de localhost.
  host: true,
  // Puerto local del servidor de desarrollo.
  port: 5173,
  // Permite peticiones con otros nombres de host durante desarrollo.
  // No sustituye una política de dominios para una publicación de producción.
  allowedHosts: true
}
})