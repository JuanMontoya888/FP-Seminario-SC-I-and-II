const path = require('path');
const fs = require('fs');
const User = require('../models/users');
const Appointment = require('../models/scheduling');
const BlockedSlot = require('../models/blockedSlot');
const { google } = require('googleapis');
const { enviarCorreoSMTP } = require('../services/mailer');
const emailTemplates = require('../services/emailTemplates');


// =================================================================================
// CONFIGURACIÓN DE GOOGLE CALENDAR
// =================================================================================
// Ruta ABSOLUTA al archivo de credenciales (configurable por env var).
// Si el archivo no existe, la integración se desactiva sin romper la creación de citas.
const keyFilePath = process.env.GOOGLE_CALENDAR_KEYFILE
    || path.join(__dirname, '..', 'google-calendar-prueba.json');
const GOOGLE_ENABLED = fs.existsSync(keyFilePath);
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID
    || '40e6ec70fd4ef4b7c0703080621d41963c106526d7a02a9026149384e3105910@group.calendar.google.com';

let calendar = null;
if (GOOGLE_ENABLED) {
    const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    calendar = google.calendar({ version: 'v3', auth });
} else {
    console.warn('⚠️  Google Calendar deshabilitado: no se encontró el archivo de credenciales en', keyFilePath);
}

// =================================================================================
// CONTROLADORES
// =================================================================================

const createAppointment = async (req, res) => {
    try {
        const userId = req.user.id;

        let {
            dateTime, hour, durationMinutes, patientName, patientId,
            contactNumber, email, reason, providerName, status, notes
        } = req.body;

        let finalPatientId = patientId;
        if (!finalPatientId && email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) finalPatientId = existingUser._id;
        }

        // 🛡️ BLOQUE DE VALIDACIÓN DE HORARIO
        const dateOnlyString = new Date(dateTime).toISOString().split('T')[0];
        const newStart = new Date(`${dateOnlyString}T${hour}:00`);
        const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

        // 🚫 ¿Esa hora está bloqueada por el administrador?
        const bloqueado = await BlockedSlot.findOne({ date: dateOnlyString, hour });
        if (bloqueado) {
            return res.status(409).json({
                msg: 'Ese horario no está disponible. Por favor selecciona otro.'
            });
        }

        const startOfDay = new Date(dateOnlyString);
        const endOfDay = new Date(dateOnlyString);
        endOfDay.setHours(23, 59, 59, 999);

        const existingAppointments = await Appointment.find({
            providerName: providerName,
            status: { $ne: 'Canceled' },
            dateTime: { $gte: startOfDay, $lte: endOfDay }
        });

        const conflict = existingAppointments.find(app => {
            const appDateStr = new Date(app.dateTime).toISOString().split('T')[0];
            const appStart = new Date(`${appDateStr}T${app.hour}:00`);
            const appEnd = new Date(appStart.getTime() + app.durationMinutes * 60000);
            return (newStart < appEnd && newEnd > appStart);
        });

        if (conflict) {
            return res.status(409).json({
                msg: `El especialista ${providerName} ya tiene una cita ocupada a las ${conflict.hour}. Por favor selecciona otro horario.`
            });
        }

        // 3. Crear la instancia del modelo
        const newAppointment = new Appointment({
            user: userId, dateTime, hour, durationMinutes, patientName,
            patientId: finalPatientId, contactNumber, email, reason,
            providerName, status: status || 'Scheduled', notes
        });

        await newAppointment.save();

        // 5. Correo de confirmación al paciente (no rompe la cita si falla)
        if (email) {
            try {
                await enviarCorreoSMTP({
                    to: email,
                    subject: 'Tu cita en Dental One',
                    html: emailTemplates.citaConfirmada({
                        patientName,
                        dateOnlyString,
                        hour,
                        providerName,
                        reason
                    })
                });
            } catch (mailError) {
                console.error('Error enviando correo de confirmación de cita:', mailError);
            }
        }

        // 6. Integración Google Calendar (solo si hay credenciales)
        if (GOOGLE_ENABLED && calendar) {
            try {
                const event = {
                    summary: `Cita: ${patientName}`,
                    description: `Motivo: ${reason}\nDoctor: ${providerName}\nNotas: ${notes || 'Ninguna'}`,
                    start: {
                        dateTime: newStart.toISOString(),
                        timeZone: 'America/Mexico_City',
                    },
                    end: {
                        dateTime: newEnd.toISOString(),
                        timeZone: 'America/Mexico_City',
                    },
                };

                await calendar.events.insert({
                    calendarId: CALENDAR_ID,
                    resource: event,
                });
                console.log('Evento creado en Google Calendar');
            } catch (googleError) {
                console.error('Error creando evento en Google:', googleError);
            }
        }

        res.status(201).json({
            msg: 'Cita registrada exitosamente.',
            appointment: newAppointment
        });

    } catch (err) {
        console.error('Error al registrar la cita:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: 'Error de validación', errors: messages });
        }
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

const getUserAppointments = async (req, res) => {
    try {
        const userId = req.user.id;
        const appointments = await Appointment.find({ user: userId });
        res.json(appointments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Error del servidor al obtener citas');
    }
};

const getAllAppointments = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Acceso denegado. Se requieren permisos de administrador.' });
        }
        const appointments = await Appointment.find({});
        res.json(appointments);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener citas globales');
    }
};

// ==========================================
// Cancelar una cita (SOLO admin). Las pagadas (Confirmed) o completadas
// no se cancelan desde aquí; solo las no pagadas.
// ==========================================
const cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ msg: 'Cita no encontrada.' });
        }

        if (['Confirmed', 'Completed'].includes(appointment.status)) {
            return res.status(400).json({ msg: 'No se puede cancelar una cita ya pagada o completada desde aquí.' });
        }

        appointment.status = 'Canceled';
        await appointment.save();

        // Enviar correo de cancelación al paciente (no bloquea la operación si falla)
        if (appointment.email) {
            try {
                const dateOnlyString = new Date(appointment.dateTime).toISOString().split('T')[0];
                await enviarCorreoSMTP({
                    to: appointment.email,
                    subject: 'Cita cancelada - Dental One',
                    html: emailTemplates.citaCancelada({
                        patientName: appointment.patientName,
                        dateOnlyString,
                        hour: appointment.hour,
                        reason: appointment.reason
                    })
                });
            } catch (mailErr) {
                console.error('Error enviando correo de cancelación:', mailErr);
            }
        }

        res.json({ msg: 'Cita cancelada.', appointment });
    } catch (err) {
        console.error('Error al cancelar la cita:', err);
        res.status(500).json({ msg: 'Error al cancelar la cita.' });
    }
};

// ==========================================
// Disponibilidad: horas ocupadas (ANÓNIMAS para no-admin) + horas bloqueadas.
// La usa el calendario del paciente para mostrar "Ocupado"/"No disponible".
// ==========================================
const getAvailability = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';

        // Citas activas (no canceladas)
        const appointments = await Appointment.find({ status: { $ne: 'Canceled' } })
            .select('dateTime hour durationMinutes user');

        const occupied = appointments.map(a => ({
            dateTime: a.dateTime,
            hour: a.hour,
            durationMinutes: a.durationMinutes,
            // 'mine' permite que el paciente distinga sus propias citas
            mine: isAdmin ? false : String(a.user) === String(req.user.id)
        }));

        const blocked = await BlockedSlot.find({}).select('date hour reason');

        res.json({
            occupied,
            blocked: blocked.map(b => ({ date: b.date, hour: b.hour, reason: b.reason }))
        });
    } catch (err) {
        console.error('Error al obtener disponibilidad:', err);
        res.status(500).json({ msg: 'Error al obtener la disponibilidad.' });
    }
};

// ==========================================
// Bloquear una hora (SOLO admin)
// ==========================================
const blockSlot = async (req, res) => {
    try {
        const { date, hour, reason } = req.body;
        if (!date || !hour) {
            return res.status(400).json({ msg: 'Se requieren fecha y hora.' });
        }

        // upsert para evitar duplicados
        const slot = await BlockedSlot.findOneAndUpdate(
            { date, hour },
            { date, hour, reason: reason || '', createdBy: req.user.id },
            { new: true, upsert: true }
        );

        res.status(201).json({ msg: 'Hora bloqueada.', slot });
    } catch (err) {
        console.error('Error al bloquear la hora:', err);
        res.status(500).json({ msg: 'Error al bloquear la hora.' });
    }
};

// ==========================================
// Desbloquear una hora (SOLO admin)
// ==========================================
const unblockSlot = async (req, res) => {
    try {
        const { date, hour } = req.body;
        if (!date || !hour) {
            return res.status(400).json({ msg: 'Se requieren fecha y hora.' });
        }

        await BlockedSlot.findOneAndDelete({ date, hour });
        res.json({ msg: 'Hora desbloqueada.' });
    } catch (err) {
        console.error('Error al desbloquear la hora:', err);
        res.status(500).json({ msg: 'Error al desbloquear la hora.' });
    }
};

// Helpers para rangos de horas (slots de 30 min)
const toMinutes = (h) => {
    const [hh, mm] = String(h).split(':').map(Number);
    return hh * 60 + mm;
};
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Genera los slots de 30 min desde startHour (incluido) hasta endHour (excluido)
const buildSlots = (startHour, endHour) => {
    const start = toMinutes(startHour);
    const end = toMinutes(endHour);
    const slots = [];
    for (let m = start; m < end; m += 30) slots.push(toHHMM(m));
    return slots;
};

// ==========================================
// Bloquear un RANGO de horas en una fecha (SOLO admin)
// ==========================================
const blockRange = async (req, res) => {
    try {
        const { date, startHour, endHour, reason } = req.body;
        if (!date || !startHour || !endHour) {
            return res.status(400).json({ msg: 'Se requieren fecha, hora inicial y hora final.' });
        }
        if (toMinutes(endHour) <= toMinutes(startHour)) {
            return res.status(400).json({ msg: 'La hora final debe ser mayor que la inicial.' });
        }

        const slots = buildSlots(startHour, endHour);
        if (slots.length === 0) {
            return res.status(400).json({ msg: 'El rango no incluye ninguna hora.' });
        }

        const ops = slots.map(hour => ({
            updateOne: {
                filter: { date, hour },
                update: { date, hour, reason: reason || '', createdBy: req.user.id },
                upsert: true
            }
        }));
        await BlockedSlot.bulkWrite(ops);

        res.status(201).json({ msg: `Se bloquearon ${slots.length} horas.`, count: slots.length, slots });
    } catch (err) {
        console.error('Error al bloquear el rango:', err);
        res.status(500).json({ msg: 'Error al bloquear el rango de horas.' });
    }
};

// ==========================================
// Desbloquear un RANGO de horas en una fecha (SOLO admin)
// ==========================================
const unblockRange = async (req, res) => {
    try {
        const { date, startHour, endHour } = req.body;
        if (!date || !startHour || !endHour) {
            return res.status(400).json({ msg: 'Se requieren fecha, hora inicial y hora final.' });
        }
        if (toMinutes(endHour) <= toMinutes(startHour)) {
            return res.status(400).json({ msg: 'La hora final debe ser mayor que la inicial.' });
        }

        const slots = buildSlots(startHour, endHour);
        const result = await BlockedSlot.deleteMany({ date, hour: { $in: slots } });

        res.json({ msg: `Se desbloquearon ${result.deletedCount} horas.`, count: result.deletedCount });
    } catch (err) {
        console.error('Error al desbloquear el rango:', err);
        res.status(500).json({ msg: 'Error al desbloquear el rango de horas.' });
    }
};

module.exports = {
    createAppointment,
    getUserAppointments,
    getAllAppointments,
    cancelAppointment,
    getAvailability,
    blockSlot,
    unblockSlot,
    blockRange,
    unblockRange
};