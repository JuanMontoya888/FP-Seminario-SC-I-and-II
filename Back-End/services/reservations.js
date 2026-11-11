// ==========================================
// Reglas compartidas de reservas (citas) - CDONE-50 / CDONE-60
// ==========================================
const Appointment = require('../models/scheduling');

// Minutos que se aparta un horario mientras el paciente paga en línea
const RESERVATION_MINUTES = 15;

// Horas máximas para pagar en efectivo/transferencia (OXXO, SPEI) una vez generada la ficha
const OFFLINE_PAYMENT_HOURS = 48;

// Estados que YA NO ocupan el horario (se puede volver a agendar encima)
const INACTIVE_STATUSES = ['Canceled', 'Payment_Failed'];

/**
 * Busca otra cita activa del mismo especialista que se solape con el horario indicado.
 * @param {object} cita { providerName, dateTime, hour, durationMinutes }
 * @param {string|null} excludeId ID de una cita a ignorar (p. ej. la propia cita)
 * @returns la cita en conflicto o null
 */
const findScheduleConflict = async ({ providerName, dateTime, hour, durationMinutes }, excludeId = null) => {
    const dateOnlyString = new Date(dateTime).toISOString().split('T')[0];
    const newStart = new Date(`${dateOnlyString}T${hour}:00`);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);

    const startOfDay = new Date(dateOnlyString);
    const endOfDay = new Date(dateOnlyString);
    endOfDay.setHours(23, 59, 59, 999);

    // CDONE-50: Consulta optimizada con índice compuesto (providerName + status + dateTime)
    const existingAppointments = await Appointment.find({
        providerName: providerName,
        status: { $nin: INACTIVE_STATUSES },
        dateTime: { $gte: startOfDay, $lte: endOfDay }
    });

    const conflict = existingAppointments.find(app => {
        if (excludeId && String(app._id) === String(excludeId)) return false;
        const appDateStr = new Date(app.dateTime).toISOString().split('T')[0];
        const appStart = new Date(`${appDateStr}T${app.hour}:00`);
        const appEnd = new Date(appStart.getTime() + app.durationMinutes * 60000);
        return (newStart < appEnd && newEnd > appStart);
    });

    return conflict || null;
};

/**
 * Fecha y hora de inicio de la cita (para no extender una reserva más allá de la cita misma).
 */
const appointmentStart = (cita) => {
    const dateOnlyString = new Date(cita.dateTime).toISOString().split('T')[0];
    const start = new Date(`${dateOnlyString}T${cita.hour}:00`);
    return isNaN(start.getTime()) ? null : start;
};

/**
 * Agrega una línea a las notas de la cita sin borrar lo que ya tenía.
 */
const appendNote = (notasActuales, nota) => (notasActuales ? `${notasActuales} · ${nota}` : nota);

module.exports = {
    RESERVATION_MINUTES,
    OFFLINE_PAYMENT_HOURS,
    INACTIVE_STATUSES,
    findScheduleConflict,
    appointmentStart,
    appendNote
};
