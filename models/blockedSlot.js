// models/blockedSlot.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Hora bloqueada por el administrador: ningún paciente puede agendar
// una cita en esa fecha + hora.
const blockedSlotSchema = new Schema({
    // Fecha del día bloqueado, formato 'YYYY-MM-DD'
    date: {
        type: String,
        required: true
    },
    // Hora bloqueada, formato 'HH:MM'
    hour: {
        type: String,
        required: true
    },
    // Motivo opcional (ej. "Junta", "Mantenimiento")
    reason: {
        type: String,
        default: '',
        trim: true
    },
    // Admin que la bloqueó
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

// No permitir bloquear dos veces el mismo slot
blockedSlotSchema.index({ date: 1, hour: 1 }, { unique: true });

const BlockedSlot = mongoose.model('BlockedSlot', blockedSlotSchema);

module.exports = BlockedSlot;
