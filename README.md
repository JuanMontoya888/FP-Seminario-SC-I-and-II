# Dental One

Dental One es una aplicación web para una clínica dental. Reúne el sitio público, la agenda de citas, el expediente clínico, los pagos y un laboratorio 3D para revisar modelos STL. El proyecto se desarrolló para el Seminario de Sistemas Computacionales I y II.

## Contenido

- [Qué incluye](#qué-incluye)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Inicio rápido](#inicio-rápido)
- [Ejecutar el sistema en local](#ejecutar-el-sistema-en-local)
- [Variables del backend](#variables-del-backend)
- [Laboratorio CAD/CAM 3D](#laboratorio-cadcam-3d)
- [Administración financiera e inventario](#administración-financiera-e-inventario)
- [API](#api)
- [Docker y despliegue](#docker-y-despliegue)
- [Pruebas](#pruebas)
- [Solución de problemas](#solución-de-problemas)

## Qué incluye

| Perfil | Funciones |
| --- | --- |
| Visitante | Consultar servicios, información de la clínica y la campaña Ayudando a Sonreír. Crear una cuenta, verificar el correo o recuperar la contraseña. |
| Paciente | Completar su expediente, consultar su historial y procedimientos, elegir una cita y pagar en línea o en clínica según su perfil. El formulario de contacto requiere sesión para enviar mensajes. |
| Administración | Consultar la agenda general, cancelar citas, bloquear horarios o rangos de fechas, exportar citas del mes a Excel o PDF, registrar procedimientos y revisar modelos STL. |
| Edición web | Gestionar y publicar el tipo de contenido **Inicio** desde un panel de Strapi con sus propias cuentas de administración. |

El catálogo de tratamientos de la agenda se define en [`Back-End/config/treatments.js`](Back-End/config/treatments.js). Un paciente nuevo debe hacer en línea el primer pago de su cita. Puede pagar el total o dejar un anticipo del 50 %. Un pago aprobado habilita la opción de pagar en clínica en citas posteriores. Los pacientes recurrentes tienen esa opción al seleccionar su perfil. El pago en línea reserva el horario inicialmente durante 15 minutos. El webhook de Mercado Pago actualiza el estado del pago y un proceso del backend libera las reservas que vencen.

## Estructura del repositorio

| Carpeta | Responsabilidad |
| --- | --- |
| [`Front-End/`](Front-End/) | Aplicación Angular 21 y TypeScript. `src/app/components/` contiene las pantallas y `src/app/services/` conecta la interfaz con la API y Strapi. |
| [`Back-End/`](Back-End/) | API REST con Node.js, Express 5 y Mongoose. `index.js` monta las rutas, `controllers/` contiene la lógica y `models/` define los documentos de MongoDB. |
| [`cms/`](cms/) | Strapi 5 con SQLite por defecto. El tipo único [Inicio](cms/src/api/inicio/content-types/inicio/schema.json) contiene los textos y medios editables de la portada. |
| [`Tests/`](Tests/) | Suite Jest separada con casos unitarios y escenarios de citas, calendario, correo y pagos. |
| [`docker/`](docker/) | Dockerfiles, configuración de Nginx y Compose para ejecutar los servicios en contenedores. |
| [`.github/workflows/`](.github/workflows/) | Flujo de GitHub Actions para compilar Angular y ejecutar Jest, con un trabajo que levanta los servicios de Compose. |

El navegador consulta Express para las operaciones de pacientes y citas. Express guarda sus datos en MongoDB y se comunica con los proveedores externos habilitados. El componente de inicio consulta Strapi directamente por HTTP y guarda la respuesta, pero la plantilla actual renderiza textos e imágenes estáticos. El laboratorio CAD/CAM procesa sus archivos en el navegador.

## Inicio rápido

Usa Node.js 22.12 o posterior dentro de la rama 22 y npm. Cada paquete tiene su propio `package.json` y `package-lock.json`. Ejecuta los comandos desde la carpeta que contiene este README.

Para revisar el frontend y probar el laboratorio con una pieza de ejemplo basta con Angular.

```bash
cd Front-End
npm ci
npm start
```

- [Frontend local](http://localhost:4200/)
- [Demo de CAD/CAM 3D](http://localhost:4200/cad-cam-demo)

La demo de desarrollo funciona sin cuenta, API ni MongoDB. Para iniciar sesión o probar citas y expedientes, levanta también el backend.

## Ejecutar el sistema en local

### API y base de datos

1. Copia [`Back-End/.env.example`](Back-End/.env.example) a `Back-End/.env`. En PowerShell usa `Copy-Item Back-End/.env.example Back-End/.env`. En Bash usa `cp Back-End/.env.example Back-End/.env`.

2. Arranca una instancia de MongoDB local o usa una base de desarrollo en Atlas. Para una instancia local con Docker, puedes usar el servicio `mongodb` del Compose incluido.

   ```bash
   docker compose -f docker/docker-compose.yml up -d mongodb
   ```

3. Para MongoDB local, configura estos valores en `Back-End/.env`. Sustituye el ejemplo de `JWT_SECRET` por un valor aleatorio propio. La plantilla incluye la configuración de cada integración.

   ```dotenv
   MONGODB_URI=mongodb://127.0.0.1:27017/Dental-One
   JWT_SECRET=reemplaza-por-un-secreto-aleatorio
   PORT=3000
   FRONTEND_URL=http://localhost:4200
   BACKEND_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:4200
   ```

4. Desde otra terminal, instala y arranca la API.

   ```bash
   cd Back-End
   npm ci
   npm run dev
   ```

   `npm start` ejecuta la API sin recarga automática. [`GET /health`](http://localhost:3000/health) devuelve `{"status":"ok"}` cuando Express está escuchando. El servidor espera a que MongoDB conecte antes de escuchar y la ruta de salud no consulta la base en cada petición.

5. Abre el frontend del inicio rápido. En desarrollo, [`environment.development.ts`](Front-End/src/environments/environment.development.ts) apunta a `http://localhost:3000`. Si cambias el puerto de Angular o usas `127.0.0.1` para abrirlo, ajusta `FRONTEND_URL` y `CORS_ORIGIN` al origen que usas en el navegador.

Para probar con una cuenta de paciente, regístrate en `/register` y abre el enlace de verificación recibido por correo. Para probar como administrador en una base de desarrollo, asigna `role: "admin"` al usuario de prueba en la colección `users` y vuelve a iniciar sesión. Los scripts [`seed.js`](Back-End/seed.js) y [`seed-admin.js`](Back-End/seed-admin.js) apuntan al host `mongodb` de Compose y recrean usuarios específicos con credenciales de prueba. Limita su uso a bases desechables. Para cualquier prueba local usa cuentas y datos ficticios.

### CMS local opcional

1. Copia [`cms/.env.example`](cms/.env.example) a `cms/.env` y sustituye los valores de ejemplo por secretos propios.
2. Desde `cms/`, ejecuta `npm ci` y `npm run develop`.
3. Abre el [panel local de Strapi](http://localhost:1337/admin), crea la cuenta administradora y publica una entrada del tipo **Inicio**. Concede al rol público el permiso de lectura de **Inicio** para que Angular pueda consultar la entrada.
4. Para que Angular consulte tu instancia, cambia `strapiUrl` a `http://localhost:1337` en [`Front-End/src/app/services/cms.ts`](Front-End/src/app/services/cms.ts). El valor actual apunta a una instancia remota y se usa también en desarrollo.

Strapi puede ejecutarse por separado. En la configuración predeterminada guarda los datos en `cms/.tmp/data.db` y los archivos subidos en `cms/public/uploads/`.

## Variables del backend

La plantilla [`Back-End/.env.example`](Back-End/.env.example) contiene ejemplos. Guarda los valores reales en `.env` o en el gestor de variables del hosting. Mantén las claves privadas y los secretos fuera del repositorio.

| Uso | Variables | Comportamiento |
| --- | --- | --- |
| Arranque | `MONGODB_URI`, `JWT_SECRET`, `PORT` | La URI y el secreto son obligatorios. El puerto predeterminado es `3000`. |
| Google Sign-In | `GOOGLE_CLIENT_ID` | Client ID OAuth de tipo Web application. Configúralo en Render; no guardes `client_secret` para este flujo de ID token. El mismo Client ID público está en el ambiente Angular. |
| URLs y CORS | `FRONTEND_URL`, `BACKEND_URL`, `CORS_ORIGIN` | Las dos URL se usan en enlaces de correo y retornos de pago. En despliegues, configura el origen exacto de la app para CORS. Si se deja vacío, la API acepta cualquier origen. |
| Cobros | `MP_ACCESS_TOKEN`, `MP_NOTIFICATION_URL`, `MP_WEBHOOK_SECRET` | Para cobrar necesitas un token válido y un webhook accesible por Mercado Pago. Configura el secreto para activar la validación de firma. Usa credenciales de prueba en desarrollo. |
| Correo | `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_USER`, `EMAIL_PASS`, `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, `GMAIL_OAUTH_REFRESH_TOKEN`, `CONTACT_EMAIL` | Admite Resend, Gmail API y SMTP. Gmail API envía por HTTPS desde una cuenta Gmail sin requerir dominio propio. El correo de contacto usa `EMAIL_USER` como respaldo. |
| WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Twilio es opcional. El número se configura con código de país, sin el prefijo `whatsapp:`. |
| Google Calendar | `GOOGLE_CALENDAR_KEYFILE`, `GOOGLE_CALENDAR_ID` | Integración opcional con una cuenta de servicio que tenga acceso al calendario. Si falta el archivo de credenciales, la agenda sigue funcionando. |

Google Sign-In usa el mismo `GOOGLE_CLIENT_ID` público en Render y en los ambientes Angular. En Google Cloud Console, registra `https://dentaloneservice.netlify.app` como **Authorized JavaScript origin** (y `http://localhost:4200` si pruebas localmente). Este flujo de ID token no utiliza `client_secret` ni una URI de redirección. Los usuarios deben crear primero su cuenta Dental One; después pueden iniciar sesión con Google con ese mismo correo.

### Enviar correo con Gmail API en Render (sin dominio propio)

Gmail API envía por HTTPS, así que evita las restricciones de SMTP saliente de algunos planes de hosting. En Google Cloud Console, habilita **Gmail API**, configura la pantalla de consentimiento OAuth y crea credenciales OAuth. Autoriza la cuenta remitente con el permiso `https://www.googleapis.com/auth/gmail.send` y obtén un refresh token (por ejemplo, con OAuth 2.0 Playground usando tus propias credenciales y la URI de retorno `https://developers.google.com/oauthplayground`).

En Render, configura `EMAIL_PROVIDER=gmail-api`, `EMAIL_USER` y `EMAIL_FROM` con la misma cuenta Gmail autorizada, y agrega `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET` y `GMAIL_OAUTH_REFRESH_TOKEN`. El refresh token y el secreto son privados: guárdalos solo como variables de entorno, nunca en el repositorio. La cuenta podrá enviar a otros destinatarios dentro de los límites de Google. En modo de prueba OAuth, Google puede hacer caducar los refresh tokens; para uso continuo revisa el estado de publicación de la aplicación OAuth.

## Laboratorio CAD/CAM 3D

**CAD** es diseño asistido por computadora. En odontología se usa, por ejemplo, para diseñar una corona virtual sobre un modelo obtenido de un escaneo. **CAM** es fabricación asistida por computadora y prepara las instrucciones que usa una impresora 3D o una fresadora para fabricar la pieza.

El [módulo de Dental One](Front-End/src/app/components/cad-cam/) permite revisar y ajustar una malla existente. La ruta habitual es `/cad-cam` y se muestra en el menú de administración. La ruta `/cad-cam-demo` se incluye solo en desarrollo.

1. Explora la mandíbula precargada o importa un STL ASCII o binario de hasta 24 MB y 250 000 triángulos.
2. Cambia el ángulo de vista para inspeccionar la malla. Los controles de rotación en Z y escala uniforme modifican el modelo exportado.
3. Selecciona una altura entre las opciones de 0.05 a 0.50 mm y recorre las capas para ver los cortes horizontales.
4. Descarga el STL ajustado. La exportación centra la caja original en XY y lleva la base a `Z = 0`.

STL no declara unidades. El módulo interpreta una unidad como un milímetro. Los archivos permanecen en el navegador y los cortes muestran contornos geométricos, sin generar instrucciones de máquina ni validar el modelo para uso clínico.

## Administración financiera e inventario

Inicia sesión con una cuenta administradora y abre **Administración** (`/administracion`). El frontend consulta la API autenticada en `/api/admin/operations`. Al arrancar el backend con MongoDB, Mongoose crea las colecciones e índices del módulo.

- **Cuentas.** Registra ventas, cotizaciones, compras, gastos y nómina en MXN. Convierte una cotización a venta desde su fila. Los abonos y pagos parciales quedan en el historial y el filtro de cartera vencida muestra ventas con saldo después de su vencimiento. Las citas y los pagos de Mercado Pago se registran por separado.
- **Reportes internos.** El estado de resultados compara ingresos y gastos por fecha de registro. El balance general muestra activos, pasivos y capital al cierre. Usa asientos manuales de partida doble para registrar saldos iniciales, capitalización, depreciación, impuestos y ajustes. Los gráficos desglosan ventas por mes, gastos por categoría y deudores.
- **Conciliación.** Escribe un alias para la cuenta e importa un CSV de hasta 500 filas. Guarda cada referencia bancaria de forma única dentro de su cuenta. Un abono o pago puede conciliarse con un movimiento del mismo importe, signo y una diferencia máxima de tres días.
- **Archivo fiscal.** Importa el XML de un CFDI 4.0 emitido previamente, clasifícalo como emitido o recibido y consérvalo para descarga. Admite archivos de facturas y complementos de pago. El archivo es interno. La validación fiscal, el timbrado, la cancelación y la generación de complementos requieren la integración de un PAC autorizado y el Certificado de Sello Digital del emisor.
- **Inventario.** Registra insumos con SKU, unidad y límites de stock. Crea sus lotes con costo unitario y caducidad, y registra entradas, consumo, mermas o conteos físicos. Una salida por consumo admite vincular el ID de un procedimiento de forma manual. El valor físico, la merma, el consumo y la rotación estimada se calculan al costo del lote.
- **Compras y activos.** Registra contactos y tiempos de entrega, compara el último precio por proveedor y genera órdenes desde un insumo. Si omites la cantidad, el sistema calcula cuánto falta para llegar al máximo. La recepción se registra como entrada de inventario y la compra se registra en Cuentas. Los activos guardan serie, garantía, historial de mantenimiento y la próxima fecha de servicio.

Formato de ejemplo para la importación bancaria

```csv
fecha,importe,referencia
2026-11-10,850.00,DEP-0024
2026-11-11,-320.50,TRF-0062
```

## API

Después de que el webhook confirma un pago en línea, el paciente puede abrir **Solicitar factura** desde el resultado de pago o el resumen mensual de sus citas. La solicitud se conserva por compra en MongoDB y permite descargar XML y PDF con el importe pagado y los datos fiscales capturados. Ambos archivos están marcados como documentos sin timbrar. Para emitir un CFDI válido hace falta la integración fiscal.

La base local es `http://localhost:3000`. Las rutas autenticadas aceptan `Authorization: Bearer <token>` o `x-auth-token`. En las operaciones de administración, el backend comprueba el rol actual en MongoDB.

| Área | Rutas principales |
| --- | --- |
| Estado | `GET /health` |
| Cuenta | `POST /api/register`, `POST /api/user/login`, `POST /api/login` (Google), `GET /api/user/profile`, `POST /api/user/patient-type` |
| Verificación y recuperación | `GET /api/verify-email/:token`, `POST /api/resend-verification`, `POST /api/forgot-password`, `POST /api/reset-password/:token` |
| Expediente | `POST /api/register/clinicalRecord`, `GET /api/get/patientDetails`, `GET /api/get/histo` |
| Agenda | `GET /api/treatments`, `GET /api/availability`, `POST /api/register/appointment`, `GET /api/user/appointment` |
| Administración | `GET /api/admin/appointments`, `PATCH /api/admin/appointments/:id/cancel`, `POST` y `DELETE /api/admin/block-slot` y `/api/admin/block-range` |
| Procedimientos | `POST /api/procedures`, `GET /api/user/procedures`, `GET /api/admin/patients`, `GET /api/admin/procedures/:patientId` |
| Pagos y contacto | `POST /mercado-pago/proccesPay`, `POST /mercado-pago/webhook`, `POST /api/contact` |

Para ver parámetros y validaciones, consulta [las rutas](Back-End/routes/) y [los controladores](Back-End/controllers/). `proccesPay` es la ortografía del endpoint en el código.

## Docker y despliegue

### Docker Compose

[El Compose incluido](docker/docker-compose.yml) publica Nginx en `4200`, Express en `3000`, Strapi en `1337` y MongoDB en `27017`. Usa volúmenes para la base de MongoDB y los datos y archivos de Strapi.

Antes de construir el conjunto completo, prepara `Back-End/.env` y revisa estos puntos.

- Compose sobrescribe `MONGODB_URI` con `mongodb://mongodb:27017/Dental-One`.
- El frontend de Nginx usa el build de producción. Para una instalación local con los cuatro servicios, apunta `apiUrl` en [`environment.ts`](Front-End/src/environments/environment.ts) al backend accesible desde el navegador, por ejemplo `http://localhost:3000`. Ajusta también `strapiUrl` si quieres usar el CMS del contenedor. Reconstruye el frontend después de cambiar los valores.
- Si vas a usar Google Calendar, configura la ruta de la clave dentro del contenedor. Si vas a desactivar la integración, retira el montaje de `google-calendar-prueba.json` del Compose local para que no dependa de ese archivo.
- La configuración del CMS en Compose trae secretos de ejemplo y no establece `ENCRYPTION_KEY`. Configura tus propios valores a partir de [`cms/.env.example`](cms/.env.example). La imagen del backend copia el contexto de construcción y su `.dockerignore` actual no excluye `.env` ni el JSON de Google Calendar. Excluye ambos del contexto antes de construir una imagen que vaya a compartirse.

```bash
docker compose -f docker/docker-compose.yml up -d --build
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs -f backend
```

Para detener los contenedores conservando los volúmenes, usa `docker compose -f docker/docker-compose.yml down`.

### Frontend estático y API alojada

- **Angular.** Desde `Front-End/`, ejecuta `npm run build`. La salida para publicar está en `Front-End/dist/Dental-One/browser/`. [Netlify](Front-End/netlify.toml) usa `Front-End` como directorio base del proyecto y el archivo de configuración define el comando, la salida y la reescritura de rutas a `index.html`. Nginx aplica una reescritura equivalente.
- **Express.** Configura `Back-End` como directorio del servicio, instala con `npm ci` y arranca con `npm start`. En Render u otro alojamiento, establece las variables del backend y comprueba `/health`. Cambia `apiUrl` de producción antes de compilar Angular si despliegas tu propia API.
- **Strapi.** Configura los secretos y el almacenamiento persistente en el alojamiento del CMS, publica **Inicio** y ajusta `strapiUrl` antes del build de Angular.

## Pruebas

Instala las dependencias del backend porque Jest importa módulos de esa carpeta. Ejecuta los comandos desde la raíz del proyecto.

```bash
npm --prefix Back-End ci
npm --prefix Tests ci
npm --prefix Tests test -- --runInBand
```

En `Tests/` también puedes ejecutar `npm run test:controllers`, `npm run test:services`, `npm run test:components`, `npm run test:scenarios` y `npm run test:coverage`. La suite simula las dependencias externas de los casos que cubre. Los casos de UI de Jest usan objetos de prueba y no abren un navegador.

Angular tiene sus propios archivos `*.spec.ts` y un objetivo Karma independiente. Con Chrome disponible, ejecuta `npm --prefix Front-End test -- --watch=false --browsers=ChromeHeadless`. Consulta [el flujo de GitHub Actions](.github/workflows/ci.yml) para ver qué ejecuta CI.

## Solución de problemas

| Síntoma | Qué revisar |
| --- | --- |
| La API no responde en `3000` | Comprueba que arrancaste desde `Back-End/`, que existen `MONGODB_URI` y `JWT_SECRET`, y que MongoDB es accesible. Revisa la salida del servidor y prueba `/health`. |
| El navegador bloquea peticiones a la API | Comprueba `apiUrl` y que `CORS_ORIGIN` coincida con el esquema, host y puerto del frontend. `localhost` y `127.0.0.1` son orígenes distintos. |
| La consulta a Strapi falla o los cambios no aparecen en la portada | Prueba `GET /api/inicio?populate=*` contra Strapi y revisa `strapiUrl`, la publicación y el permiso de lectura. Para mostrar los cambios, la plantilla de inicio debe consumir los datos que devuelve el CMS. |
| No llega el correo de verificación | Revisa el proveedor, sus credenciales, el remitente y `BACKEND_URL`. Usa la opción de reenviar la verificación después de corregir la configuración. |
| El pago se inicia, pero la cita no se confirma | Revisa los eventos del webhook, el token de acceso, la firma y la accesibilidad de la URL desde Mercado Pago. Para pruebas locales del webhook necesitas una URL pública que reenvíe a la API. |
| `/cad-cam` redirige al inicio | Abre la sesión con una cuenta administradora. Para revisar el laboratorio sin credenciales, usa `/cad-cam-demo` con `npm start` en el frontend. |
