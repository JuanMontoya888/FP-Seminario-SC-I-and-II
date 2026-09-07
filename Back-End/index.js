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
    .then(() => {
        app.listen(port, () => {
            console.log(`Server listening at ${port}`);
        });
    })
    .catch((err) => console.log('Error de conexión a MongoDB:', err));

// 4. Montaje de Rutas
app.use('/api', authRoutes);            // /api/register, /api/user/login, /api/user/profile
app.use('/api', patientRoutes);         // /api/register/patientDetails, /api/get/histo, etc.
app.use('/api', appointmentRoutes);     // /api/register/appointment, /api/user/appointment
app.use('/api', procedureRoutes);       // /api/procedures, /api/user/procedures, /api/admin/...
app.use('/mercado-pago', mPagoRoutes);  // /mercado-pago/...
app.use('/api/contact', contactRoutes); // /api/contact/...