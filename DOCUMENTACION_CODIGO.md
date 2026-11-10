# Guía completa del código de Crearte

Esta guía recorre los archivos de la aplicación, explica cómo se conectan y describe el propósito de sus secciones y operaciones. Los comentarios del propio código señalan las reglas y decisiones importantes junto a su implementación. Las líneas que se repiten con el mismo patrón visual (por ejemplo, clases Tailwind de cada campo o atributos de cada SVG) cumplen el propósito indicado para el bloque que las contiene.

Para ver estos recorridos como diagramas, consulta [DIAGRAMA_FLUJO.md](./DIAGRAMA_FLUJO.md).

## 1. Recorrido de ejecución

1. El navegador abre `index.html`, que define el idioma, los metadatos, las fuentes y el elemento `#root`.
2. `src/main.jsx` crea la raíz de React, activa `StrictMode` en desarrollo y monta `App`.
3. `src/App.jsx` consulta la sesión disponible. Si no hay usuario muestra `src/login.jsx`; cuando el acceso tiene éxito, muestra el módulo `Auditoria`.
4. `src/auth.js` realiza las operaciones de cuenta usando la instancia que inicializa `src/firebase.js`.
5. El módulo `Auditoria` captura los datos del lote y calcula el muestreo y el dictamen. Guarda una copia local y solicita la sincronización con `src/db.js` y Firestore.
6. Desde el historial se pueden consultar registros, cargarlos nuevamente en el formulario y generar reportes Excel o PDF.
7. El envío del resumen por correo usa EmailJS directamente desde `src/App.jsx`.
8. Tailwind, PostCSS, Vite y npm procesan y ejecutan la aplicación según las configuraciones raíz.

## 2. Componentes y lógica de la aplicación

### `src/App.jsx`

Es el módulo principal y contiene el estado de la sesión, la auditoría en curso, los cálculos, las operaciones de historial y la interfaz.

#### Imports y configuración

- Importa React y sus hooks (`useState`, `useMemo`, `useEffect`) para estado, cálculos derivados y acciones al montar componentes.
- Importa `Login`, las funciones de autenticación, las operaciones de Firestore y las funciones de PDF desde sus módulos respectivos.
- Las constantes de EmailJS identifican el servicio, la plantilla y la clave pública usada por la solicitud del navegador.
- `enviarEmailJS(...)` hace un `fetch` con esos identificadores y con los parámetros que espera la plantilla de correo.

#### Datos para muestreo y dictamen

- `TABLA_I` relaciona intervalos de tamaño de lote con letras código para cada nivel de inspección.
- `AQL_PLANS` relaciona cada letra código y nivel AQL con muestra, aceptación (`Ac`) y rechazo (`Re`).
- `normAql(valor)` normaliza coma decimal y formatos como `1`/`1.0`, para que la entrada corresponda con las claves de la matriz.
- `STORAGE_KEY` identifica la copia del historial en el almacenamiento local del navegador.

#### Componente `Auditoria`

Recibe `usuario` y `onLogout` desde `App`:

- Estados `historialAuditorias`, `isHistorialOpen` y `registroVisualizar`: registros sincronizados, apertura del historial y selección para consulta.
- Estados `isDrawerOpen` e `isEmailModalOpen`: visibilidad del panel de hallazgos y del modal de envío.
- Estados de correo (`emailDestinatarios`, `mensajeAdicional`, `archivosExtra`, `adjuntarPdf`, `enviando`, `correoEnviado`): guardan las selecciones temporales de la interfaz. Que una opción se almacene no significa que la solicitud a EmailJS la utilice.
- `formData`: empresa, referencia, número y tamaño de lote, nivel de inspección, AQL mayores/menores y límite crítico.
- `auditResults`: cantidades de defectos, cantidades de segundas, comentarios y fotos de evidencia.
- `EMPRESAS`: sugerencias para el campo de empresa; la persona también puede escribir un valor libre.

#### Inicio y preparación del formulario

- `triggerToast(mensaje)` muestra un aviso y programa su desaparición.
- `useEffect` carga primero el historial de `localStorage` y luego consulta Firestore para el correo de la persona conectada. Cuando la consulta remota devuelve datos, estos sustituyen y actualizan la copia local.
- `limpiarFormulario()` reinicia los datos del lote y hallazgos, además de destinatarios y mensaje. No elimina registros guardados.

#### Cálculos derivados

- `planMuestreo` usa `useMemo`: normaliza el tamaño del lote, encuentra una fila de `TABLA_I`, obtiene la letra código, busca las reglas AQL y calcula la mayor muestra requerida por AQL mayores/menores, con tope en el tamaño real del lote. Si falta tamaño o nivel, devuelve marcadores `--`.
- `decisionFinal` compara defectos con el límite crítico y valores `Re`. Si uno falla, rechaza e indica los motivos; si no falla y hay un umbral de aceptación numérico, aprueba; si aún falta configurar AQL, queda pendiente.
- `totalSegundas` suma confección, tela y proceso.
- `porcentajeSegundas` calcula el total dividido por el tamaño del lote y lo expresa como porcentaje con dos decimales; evita dividir por cero.

#### Eventos del formulario y evidencia

- `handleFormChange(event)` usa `event.target.name` como clave para actualizar un campo de `formData`.
- `handleAuditChange(categoria, campo, valor)` actualiza un campo dentro de `defectos` o `segundas`, convirtiéndolo a entero no negativo.
- `comprimirImagen(file)` lee una imagen, la dibuja en un canvas, limita su lado mayor a 700 píxeles y la serializa como JPEG base64 con calidad reducida.
- `handleFotos(event)` comprime simultáneamente los archivos seleccionados y los agrega a la auditoría actual. Vacía el input para permitir volver a elegir el mismo archivo.
- `quitarFoto(id)` elimina de la evidencia la foto con el ID indicado.

#### Guardado, eliminación y descarga PDF

- `guardarAuditoria(correoInfo)` exige empresa, referencia y tamaño del lote. Construye un objeto con datos, plan, decisión, hallazgos, evidencia, auditor y fecha.
- Primero escribe el historial en `localStorage`. Si falla, avisa que puede faltar espacio y no actualiza la lista de pantalla.
- Tras guardar localmente actualiza React y llama a `guardarEnFirestore`. La respuesta de Firestore solo cambia el mensaje mostrado; un error remoto deja el registro en local.
- `eliminarRegistro(id)` actualiza historial y `localStorage`, elimina el documento remoto si dispone de `_firestoreId` y cierra el detalle correspondiente.
- `descargarBlob(blob, nombre)` crea un enlace de descarga temporal y revoca su URL al terminar.
- `descargarPdfIndividual(registro)` solicita a `generarPdfAuditoria` los bytes del PDF, forma un `Blob` y lo descarga con el nombre producido por `nombreArchivoPdf`.

#### Correo y reutilización de registros

- `handleArchivosExtra(event)` y `quitarArchivoExtra(indice)` gestionan la lista que se ve en el modal.
- `esMovil()` comprueba el `userAgent` por nombres comunes de sistemas móviles.
- `handleEnviarCorreo()` prepara asunto y HTML con datos del lote, decisión, defectos, mensaje adicional y auditor. Si no hay destinatarios utiliza el correo operativo configurado en la función.
- La solicitud a EmailJS envía los parámetros definidos en `enviarEmailJS`; los archivos extra y la opción `adjuntarPdf` no se agregan a esa solicitud. La interfaz actualiza el indicador de envío y registra en consola el estado/respuesta recibidos.
- `cargarRegistro(item)` copia un registro del historial al formulario para continuar revisándolo; no lo elimina ni lo modifica por sí mismo.

#### Exportaciones Excel

- `descargarExcelIndividual(registro)` construye HTML tabular con datos, plan de muestreo, defectos, decisión, segundas y observaciones. Lo descarga con extensión `.xls`; el contenido es HTML compatible con Excel, no un libro XLSX nativo.
- `descargarTodasEnExcel()` comprueba que exista historial y genera una sola tabla consolidada con una fila por registro. Si no hay filas, muestra un aviso.

#### Interfaz JSX de `Auditoria`

El `return` principal está organizado en estos bloques:

1. **Aviso global:** muestra `toastMessage` cuando existe.
2. **Encabezado:** marca, botones de historial/guardado/correo en escritorio y datos de usuario con cierre de sesión.
3. **Datos del lote:** empresa con sugerencias, referencia, número y tamaño del lote, nivel de inspección, AQL y umbral crítico. Los `value` leen el estado; los `onChange` actualizan ese estado.
4. **Plan de muestreo:** tarjetas que muestran los valores calculados de `planMuestreo`.
5. **Resumen de auditoría:** muestra el dictamen, defectos y clasificación de segundas.
6. **Barra móvil:** accesos de historial, guardado y correo para pantallas pequeñas.
7. **Drawer de hallazgos:** campos controlados para defectos, segundas, comentarios y fotos. Cerrar el drawer conserva el estado.
8. **Modal del historial:** lista registros con estado, detalle, Excel, cargar y eliminar; también permite exportar todo.
9. **Modal de detalle:** presenta los valores guardados, evidencia y botones de PDF, Excel, cargar en formulario y cerrar.
10. **Confirmación y modal de correo:** muestran el resultado visual de la acción y permiten configurar destinatarios/mensaje. La selección de archivos se lista, pero no se adjunta en el código de solicitud actual.

Las expresiones JSX `{...}` insertan valores o expresiones JavaScript. Las condiciones `condicion && (...)` muestran un bloque solo cuando la condición se cumple. Las llamadas `.map(...)` generan elementos repetidos y `key` identifica cada elemento para React. Las clases `className` corresponden principalmente a utilidades Tailwind responsive (`sm:`, `md:`, `lg:`) y describen presentación, no reglas de negocio. Los elementos `<svg>` y `<path>` dibujan iconos y no ejecutan lógica de auditoría.

#### Componente raíz `App`

- Inicializa `usuario` a partir de `sesionActual()`.
- Un `useEffect` define el título de la pestaña.
- `salir()` pide cerrar Firebase y vacía el usuario en React.
- Renderiza `Login` si no hay usuario; si hay, monta `Auditoria` y le pasa el usuario y el callback de salida.

### `src/login.jsx`

- `IconoOjo({ abierto })` dibuja el icono para revelar o enmascarar la contraseña.
- `Login({ onAuth })` mantiene el modo (ingreso/registro), nombre, correo, clave, código, mensajes y estado de carga.
- `leerUltimoCorreo()` precarga el correo, pero no guarda la clave.
- El efecto de foco dirige el cursor a la clave en modo ingreso.
- `cambiarModo(modo)` alterna la vista y limpia mensajes anteriores.
- `enviar(event)` evita el envío HTML tradicional, llama a `iniciarRegistro` o `iniciarSesion`, muestra los errores y entrega el usuario exitoso a `App` mediante `onAuth`.
- Después del registro limpia los campos y vuelve al modo de ingreso.
- `olvideClave()` llama a `recuperarClave` y comunica si se aceptó la solicitud.
- El JSX presenta campos controlados, selector de modo, botón para ver clave, mensajes y botón de acción. `inputCls` concentra estilos compartidos.

### `src/auth.js`

- Importa operaciones de Firebase Authentication y la instancia común `app`.
- `CODIGO_INVITACION` controla si se exige código de invitación.
- `LAST_EMAIL_KEY`, `leerUltimoCorreo()` y `guardarUltimoCorreo()` persisten únicamente el correo más reciente.
- `emailValido()` aplica una comprobación sintáctica básica del email.
- `obtenerAuth()` crea o recupera la instancia Auth y usa persistencia en memoria.
- `traducirError(error)` registra el error técnico y convierte códigos conocidos de Firebase en mensajes en español.
- `nombreDe(user)` usa el nombre de perfil o la parte local del correo.
- `sesionActual()` devuelve `null`: no reconstruye usuario al iniciar la página.
- `cerrarSesion()` ejecuta `signOut`.
- `iniciarRegistro(datos)` normaliza correo, valida nombre/email/clave/código, crea usuario, guarda el correo, intenta actualizar perfil, cierra la sesión recién creada y retorna `{ ok, usuario }` o `{ ok, error }`.
- `iniciarSesion(datos)` valida campos, autentica por email/clave, guarda el correo y retorna usuario normalizado.
- `recuperarClave(email)` valida el email y solicita a Firebase un correo de restablecimiento.

### `src/firebase.js`

- Importa `getApps`, `getApp` e `initializeApp`.
- `firebaseConfig` contiene identificadores públicos del proyecto web.
- `app` reutiliza una aplicación Firebase existente o inicializa una nueva, evitando duplicados durante recargas de desarrollo.
- La configuración cliente no reemplaza reglas de seguridad ni permisos de servidor.

### `src/db.js`

- Importa funciones de Firestore y usa la instancia compartida `app`.
- `ADMIN_EMAIL` define qué correo obtiene la consulta completa en la interfaz; no es una regla de autorización del servidor.
- `db` es el cliente de Firestore.
- `esAdmin(email)` compara el correo normalizado con el definido.
- `guardarEnFirestore(registro)` quita el arreglo `fotos`, conserva `cantidadFotos`, añade un documento a `auditorias` y devuelve el ID remoto.
- `cargarDeFirestore(emailUsuario)` consulta todos los documentos para la cuenta admin o filtra por `auditor`; ordena por `id` descendente y añade `_firestoreId` a cada objeto. Si falla, registra el error y retorna `[]`.
- `eliminarDeFirestore(firestoreId)` elimina el documento; si falla, deja constancia en consola.
- Las reglas Firestore deben aplicar controles reales de lectura/escritura. El filtro y `esAdmin` del cliente no protegen datos por sí solos.

### `src/reportepdf.js`

- Define dimensiones A4, márgenes y ancho útil en puntos PDF.
- `color(hex)` convierte hexadecimal a color RGB.
- `C` centraliza la paleta usada para fondos, textos y estados.
- `limpiar(texto)` convierte caracteres no admitidos por las fuentes Helvetica estándar para prevenir errores al dibujar.
- `ajustar(texto, fuente, tamaño, ancho)` trunca texto largo y agrega `...`.
- `partir(texto, fuente, tamaño, ancho)` divide observaciones en líneas y separa palabras demasiado largas.
- `nombreArchivoPdf(registro)` crea un nombre de descarga seguro con empresa y lote.
- `generarPdfAuditoria(registro)` crea el documento, establece metadatos/fuentes y define funciones auxiliares para texto alineado, cajas, secciones, filas y tarjetas.
- El cuerpo añade datos del lote, valores de muestreo, defectos, dictamen, segundas, observaciones, auditor, destinatario y fotos.
- `asegurar(alto)` controla el espacio disponible y abre páginas adicionales cuando un bloque no cabe.
- Las fotos base64 se decodifican e incrustan como PNG/JPEG, se escalan en dos columnas sin deformarse y se etiquetan.
- El pie numera todas las páginas y `pdf.save()` devuelve los bytes para descargar.

## 3. Entrada HTML, estilos y configuración

### `index.html`

- `<!doctype html>` declara documento HTML moderno.
- `lang="es"` señala el idioma del contenido.
- Las etiquetas `meta` definen UTF-8, viewport móvil y color del navegador.
- Los enlaces `preconnect` y `stylesheet` cargan la fuente Inter desde Google Fonts.
- `#root` es el punto donde React monta la interfaz.
- El módulo `/src/main.jsx` inicia la aplicación en desarrollo y compilación Vite.

### `src/main.jsx`

- Importa React, `createRoot`, el componente raíz `App` y los estilos globales.
- `createRoot(document.getElementById('root'))` crea el punto de montaje.
- `React.StrictMode` envuelve la aplicación para advertir patrones problemáticos en desarrollo.
- `<App />` comienza el flujo principal de autenticación y auditoría.

### `src/index.css`

- Las directivas `@tailwind` insertan estilos base, componentes y utilidades generadas.
- `html, body` quita márgenes, define fuentes, colores y evita desplazamiento horizontal.
- `@media (max-width: 640px)` reduce tamaño base en móvil y conserva controles a 16 px para evitar zoom automático de iOS.
- Las reglas `input`, `select`, `textarea` y `button` definen tipografía y transiciones.
- Los selectores `:focus` resaltan controles enfocados; `button:active` indica la pulsación.
- Las reglas `.bg-indigo-600...` adaptan clases de la paleta al tema amarillo/negro.
- `header` añade la franja de marca y `::-webkit-scrollbar` estiliza barras en navegadores compatibles.

### `tailwind.config.js`

- El comentario JSDoc declara el tipo de la configuración para herramientas compatibles.
- `content` indica que Tailwind inspeccione `index.html` y archivos JS/JSX de `src` para detectar clases.
- `theme.extend.colors` redefine tonos `indigo` y `slate` utilizados por la interfaz para la identidad visual de Crearte.
- `plugins` no añade plugins Tailwind adicionales.

### `postcss.config.js`

- Exporta la lista de plugins de PostCSS.
- `tailwindcss` procesa directivas y utilidades Tailwind.
- `autoprefixer` añade prefijos CSS necesarios para compatibilidad de navegadores.

### `vite.config.js`

- `defineConfig` proporciona validación/autocompletado de la forma de configuración.
- `react()` registra el plugin que procesa componentes React/JSX.
- `server.host` permite escuchar conexiones fuera de localhost en desarrollo.
- `server.port` selecciona el puerto 5173.
- `server.allowedHosts` configura los nombres de host admitidos por el servidor de desarrollo.

### `package.json`

Este archivo es JSON y no admite comentarios dentro de sus propiedades; se explica aquí:

- `name`, `version` y `private` identifican el paquete y evitan publicarlo accidentalmente en npm.
- `type: "module"` activa módulos ECMAScript en archivos Node.
- `scripts.dev` inicia Vite; `scripts.build` crea la compilación; `scripts.preview` sirve localmente el resultado compilado.
- `dependencies` contiene React, React DOM, Firebase y `pdf-lib`, usados por la aplicación en ejecución.
- `devDependencies` contiene Vite, el plugin React, Tailwind, PostCSS, Autoprefixer y paquetes de tipos React para herramientas de desarrollo.
- `allowScripts` registra el permiso de ejecución de scripts para `esbuild` en el entorno de gestión de dependencias del proyecto.

### `package-lock.json`

Es el archivo generado por npm que fija las versiones exactas del árbol de dependencias para instalaciones reproducibles. No se edita manualmente; se actualiza con los comandos npm al cambiar dependencias.

### `.gitignore`

- `node_modules/` excluye paquetes instalados localmente, que pueden reconstruirse con npm.
- `dist/` excluye el resultado generado por `npm run build`.

## 4. Datos y limitaciones que conviene conocer

- El historial local incluye fotos base64 comprimidas. Firestore solo conserva los demás datos del registro y el número de fotos, no las imágenes.
- Al cargar Firestore, las fotos no presentes en el documento remoto no se pueden reconstruir desde esa fuente.
- La autenticación usa persistencia en memoria y `sesionActual()` retorna `null`; tras recargar, la aplicación puede solicitar iniciar sesión nuevamente.
- La plantilla de correo recibe el resumen HTML, pero los archivos extra y `adjuntarPdf` no se integran actualmente a la petición.
- El indicador visual de envío se activa tras el intento; conviene revisar el estado HTTP y la respuesta de EmailJS en consola para confirmar el resultado remoto.
- Un archivo `.xls` descargado por las funciones de la aplicación contiene una tabla HTML que Excel puede abrir; no es un `.xlsx` generado por una biblioteca de hojas de cálculo.
- La verificación de administrador en frontend no es un control de seguridad. Las reglas de Firebase deben restringir la colección.

## 5. Comandos del proyecto

```bash
npm install
npm run dev
npm run build
npm run preview
```

`npm run build` sirve también como verificación de sintaxis e integración de módulos; el proyecto no declara actualmente un script de pruebas automatizadas.
