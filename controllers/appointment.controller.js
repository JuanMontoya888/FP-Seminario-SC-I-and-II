const Appointment = require('../models/scheduling');
const BlockedSlot = require('../models/blockedSlot');
const User = require('../models/users');
const { enviarCorreoSMTP } = require('../services/mailer');
const emailTemplates = require('../services/emailTemplates');
const { enviarWhatsapp } = require('../services/whatsapp');

// Duración por defecto (minutos) para citas que, por algún motivo, no
// traigan `durationMinutes` cargado (p.ej. documentos antiguos en Mongo).
const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;

function getDuration(appointment) {
    return appointment.durationMinutes || DEFAULT_APPOINTMENT_DURATION_MINUTES;
}

function toDateOnlyString(dateTime) {
    return new Date(dateTime).toISOString().split('T')[0];
}

// ==========================================
// CDONE-35: Crear cita con detección de conflictos
// ==========================================
const createAppointment = async (req, res) => {
    try {
        const {
            dateTime,
            hour,
            durationMinutes,
            patientName,
            patientId,
            email,
            phone,
            specialty,
            providerName,
            reason,
            notes,
        } = req.body;

        if (!dateTime || !hour || !patientName) {
            return res.status(400).json({ msg: 'Faltan datos obligatorios: dateTime, hour y patientName son requeridos.' });
        }

        // Resolver a qué paciente (User) pertenece la cita.
        // Solo un admin puede agendar/reasignar la cita a nombre de otro
        // usuario (patientId o email de otra cuenta); un usuario normal
        // solo puede agendar para sí mismo.
        let patient = req.user.id;
        if (req.user.role === 'admin') {
            if (patientId) {
                const target = await User.findById(patientId);
                if (!target) {
                    return res.status(400).json({ msg: 'Paciente no encontrado.' });
                }
                patient = target._id;
            } else if (email) {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    patient = existingUser._id;
                }
            }
        } else if (patientId && String(patientId) !== String(req.user.id)) {
            return res.status(403).json({ msg: 'No autorizado a agendar citas para otro usuario.' });
        }

        const dateOnlyString = toDateOnlyString(dateTime);
        const duration = durationMinutes || DEFAULT_APPOINTMENT_DURATION_MINUTES;
        const newStart = new Date(`${dateOnlyString}T${hour}:00`);
        const newEnd = new Date(newStart.getTime() + duration * 60000);

        // 1. ¿El horario está bloqueado por el admin?
        const blocked = await BlockedSlot.findOne({ date: dateOnlyString, hour });
        if (blocked) {
            return res.status(409).json({ msg: 'Ese horario no está disponible, por favor elige otro.' });
        }

        // 2. Detección de conflictos: buscar citas del mismo especialista
        // ese día (que no estén canceladas) y verificar solapamiento.
        const startOfDay = new Date(`${dateOnlyString}T00:00:00`);
        const endOfDay = new Date(`${dateOnlyString}T23:59:59`);

        const existingAppointments = await Appointment.find({
            providerName,
            status: { $ne: 'cancelled' },
            dateTime: { $gte: startOfDay, $lte: endOfDay },
        });

        const conflict = existingAppointments.find((app) => {
            const appStart = new Date(app.dateTime);
            const appEnd = new Date(appStart.getTime() + getDuration(app) * 60000);
            return newStart < appEnd && newEnd > appStart;
        });

        if (conflict) {
            return res.status(409).json({
                msg: `El especialista ${providerName || ''} ya tiene una cita ocupada a las ${hour}, por favor elige otro horario.`,
            });
        }

        // 3. Crear la cita
        const appointment = new Appointment({
            patient,
            patientName,
            email,
            phone,
            dateTime,
            dateOnlyString,
            hour,
            durationMinutes: duration,
            specialty,
            providerName,
            reason,
            notes,
            createdBy: req.user.id,
        });

        await appointment.save();

        // 4. Notificaciones (no bloquean la respuesta si fallan)
        if (email) {
            try {
                await enviarCorreoSMTP({
                    to: email,
                    subject: 'Confirmación de tu cita - Dental One',
                    html: emailTemplates.citaConfirmada({
                        patientName,
                        dateOnlyString,
                        hour,
                        providerName,
                        reason,
                    }),
                });
            } catch (mailError) {
                console.error('Error enviando correo de confirmación:', mailError);
            }
        }

        if (phone) {
            try {
                await enviarWhatsapp({
                    to: phone,
                    body: `Hola ${patientName}, tu cita en Dental One quedó agendada para el ${dateOnlyString} a las ${hour} hrs con ${providerName || 'el especialista'}.`,
                });
            } catch (waError) {
                console.error('Error enviando WhatsApp de confirmación:', waError);
            }
        }

        return res.status(201).json({ msg: 'Cita agendada correctamente.', appointment });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ msg: error.message });
        }
        console.error('Error en createAppointment:', error);
        return res.status(500).json({ msg: 'Error al agendar la cita.' });
    }
};

const getUserAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ patient: req.user.id }).sort({ dateTime: 1 });
        return res.status(200).json(appointments);
    } catch (error) {
        console.error('Error en getUserAppointments:', error);
        return res.status(500).json({ msg: 'Error al obtener las citas.' });
    }
};

const getAllAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({}).sort({ dateTime: 1 });
        return res.status(200).json(appointments);
    } catch (error) {
        console.error('Error en getAllAppointments:', error);
        return res.status(500).json({ msg: 'Error al obtener las citas.' });
    }
};

// ==========================================
// CDONE-20: Disponibilidad de horarios
// ==========================================
const getAvailability = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';

        const appointments = await Appointment.find({ status: { $ne: 'cancelled' } })
            .select('dateTime hour durationMinutes patient');

        const occupied = appointments.map((app) => ({
            dateTime: app.dateTime,
            hour: app.hour,
            durationMinutes: getDuration(app),
            mine: isAdmin ? false : String(app.patient) === String(req.user.id),
        }));

        const blockedSlots = await BlockedSlot.find({}).select('date hour reason');
        const blocked = blockedSlots.map((slot) => ({
            date: slot.date,
            hour: slot.hour,
            reason: slot.reason,
        }));

        return res.status(200).json({ occupied, blocked });
    } catch (error) {
        console.error('Error en getAvailability:', error);
        return res.status(500).json({ msg: 'Error al obtener la disponibilidad.' });
    }
};

const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ msg: 'Cita no encontrada.' });
        }

        if (['confirmed', 'completed'].includes(appointment.status)) {
            return res.status(400).json({ msg: 'No se puede cancelar una cita confirmada o completada.' });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        if (appointment.email) {
            try {
                await enviarCorreoSMTP({
                    to: appointment.email,
                    subject: 'Cita cancelada - Dental One',
                    html: emailTemplates.citaCancelada({
                        patientName: appointment.patientName,
                        dateOnlyString: appointment.dateOnlyString,
                        hour: appointment.hour,
                        reason: appointment.reason,
                    }),
                });
            } catch (mailError) {
                console.error('Error enviando correo de cancelación:', mailError);
            }
        }

        if (appointment.phone) {
            try {
                await enviarWhatsapp({
                    to: appointment.phone,
                    body: `Hola ${appointment.patientName}, tu cita en Dental One del ${appointment.dateOnlyString} a las ${appointment.hour} hrs fue cancelada.`,
                });
            } catch (waError) {
                console.error('Error enviando WhatsApp de cancelación:', waError);
            }
        }

        return res.status(200).json({ msg: 'Cita cancelada correctamente.', appointment });
    } catch (error) {
        console.error('Error en cancelAppointment:', error);
        return res.status(500).json({ msg: 'Error al cancelar la cita.' });
    }
};

// ---------- Helpers de horario para bloqueo por rango ----------
function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function toHHMM(minutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
}

function buildSlots(startHour, endHour, stepMinutes = 30) {
    const slots = [];
    let current = toMinutes(startHour);
    const end = toMinutes(endHour);
    while (current < end) {
        slots.push(toHHMM(current));
        current += stepMinutes;
    }
    return slots;
}

const blockSlot = async (req, res) => {
    try {
        const { date, hour, reason } = req.body;
        if (!date || !hour) {
            return res.status(400).json({ msg: 'Faltan datos: date y hour son requeridos.' });
        }

        const slot = await BlockedSlot.findOneAndUpdate(
            { date, hour },
            { date, hour, reason, createdBy: req.user.id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({ msg: 'Horario bloqueado.', slot });
    } catch (error) {
        console.error('Error en blockSlot:', error);
        return res.status(500).json({ msg: 'Error al bloquear el horario.' });
    }
};

const unblockSlot = async (req, res) => {
    try {
        const { date, hour } = req.body;
        if (!date || !hour) {
            return res.status(400).json({ msg: 'Faltan datos: date y hour son requeridos.' });
        }

        await BlockedSlot.deleteOne({ date, hour });
        return res.status(200).json({ msg: 'Horario desbloqueado.' });
    } catch (error) {
        console.error('Error en unblockSlot:', error);
        return res.status(500).json({ msg: 'Error al desbloquear el horario.' });
    }
};

const blockRange = async (req, res) => {
    try {
        const { date, startHour, endHour, reason } = req.body;
        if (!date || !startHour || !endHour) {
            return res.status(400).json({ msg: 'Faltan datos: date, startHour y endHour son requeridos.' });
        }

        const slots = buildSlots(startHour, endHour);
        const ops = slots.map((hour) => ({
            updateOne: {
                filter: { date, hour },
                update: { date, hour, reason, createdBy: req.user.id },
                upsert: true,
            },
        }));

        if (ops.length > 0) {
            await BlockedSlot.bulkWrite(ops);
        }

        return res.status(200).json({ msg: 'Rango de horarios bloqueado.', slots });
    } catch (error) {
        console.error('Error en blockRange:', error);
        return res.status(500).json({ msg: 'Error al bloquear el rango de horarios.' });
    }
};

const unblockRange = async (req, res) => {
    try {
        const { date, startHour, endHour } = req.body;
        if (!date || !startHour || !endHour) {
            return res.status(400).json({ msg: 'Faltan datos: date, startHour y endHour son requeridos.' });
        }

        const slots = buildSlots(startHour, endHour);
        await BlockedSlot.deleteMany({ date, hour: { $in: slots } });

        return res.status(200).json({ msg: 'Rango de horarios desbloqueado.', slots });
    } catch (error) {
        console.error('Error en unblockRange:', error);
        return res.status(500).json({ msg: 'Error al desbloquear el rango de horarios.' });
    }
};

module.exports = {
    createAppointment,
    getUserAppointments,
    getAllAppointments,
    getAvailability,
    cancelAppointment,
    blockSlot,
    unblockSlot,
    blockRange,
    unblockRange,
};
