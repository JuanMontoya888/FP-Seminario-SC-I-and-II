// ==========================================
// index.js (Punto de entrada principal)
// ==========================================
require('dotenv').config(); // Carga las variables de entorno desde .env

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// 1. Importación de Rutas
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const appointmentRoutes = require('./routes/appointment.routes');
const mPagoRoutes = require('./routes/mercado_pago.routes');
const procedureRoutes = require('./routes/procedure.routes');
const contactRoutes = require('./routes/contact.routes');

// Controlador para tareas programadas (CDONE-60)
const { cleanupExpiredReservations } = require('./controllers/appointment.controller');
const Appointment = require('./models/scheduling');

const app = express();
const port = process.env.PORT || 3000;

// 2. Configuración de Middlewares Globales
// CORS: en producción se restringe al dominio indicado en CORS_ORIGIN.
// Si CORS_ORIGIN no está definido, se permite todo (útil en desarrollo).
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json());

// Endpoint ligero de salud (para monitores de uptime tipo UptimeRobot que
// mantienen el backend "despierto" en hosts gratuitos). No consulta la BD.
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// 3. Conexión a MongoDB y arranque del servidor
const dbURI = process.env.MONGODB_URI;
if (!dbURI) {
    console.error('ERROR: falta la variable de entorno MONGODB_URI. Configúrala en tu archivo .env o en el panel de tu hosting.');
    process.exit(1);
}
mongoose.connect(dbURI)
    .then(async () => {
        app.listen(port, () => {
            console.log(`Server listening at ${port}`);
        });

        // CDONE-60: el índice TTL de expiresAt se quitó del esquema, pero MongoDB no borra
        // índices viejos por sí solo. Si existe en la BD, se elimina aquí.
        try {
            await Appointment.collection.dropIndex('expiresAt_1');
            console.log('[CDONE-60] Índice TTL antiguo expiresAt_1 eliminado.');
        } catch (idxErr) {
            // No existía (lo normal en una base nueva)
        }

        // Limpieza inicial (útil en hosts gratuitos que "duermen" el servidor)
        cleanupExpiredReservations().catch(e => console.error('Error en la limpieza inicial de reservas:', e));

        // CDONE-60: Worker periódico en segundo plano para limpiar reservas temporales vencidas
        setInterval(async () => {
            try {
                await cleanupExpiredReservations();
            } catch (cleanErr) {
                console.error('Error en worker de limpieza de reservas expiradas:', cleanErr);
            }
        }, 60 * 1000); // Ejecución cada 60 segundos
    })
    .catch((err) => {
        // Sin base de datos el servidor no sirve: salimos con error para que el
        // hosting (Render) lo marque como fallido y lo reinicie, en vez de quedar
        // "vivo" sin escuchar peticiones.
        console.error('Error de conexión a MongoDB:', err);
        process.exit(1);
    });

// 4. Montaje de Rutas
app.use('/api', authRoutes);            // /api/register, /api/user/login, /api/user/profile
app.use('/api', patientRoutes);         // /api/register/patientDetails, /api/get/histo, /api/register/clinicalRecord
app.use('/api', appointmentRoutes);     // /api/register/appointment, /api/user/appointment
app.use('/api', procedureRoutes);       // /api/procedures, /api/user/procedures, /api/admin/...
app.use('/mercado-pago', mPagoRoutes);  // /mercado-pago/...
app.use('/api/contact', contactRoutes); // /api/contact/...
