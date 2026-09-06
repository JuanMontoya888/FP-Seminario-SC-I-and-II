const mongoose = require('mongoose');
const { Schema } = mongoose;

const appointmentSchema = new Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    patientName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        default: null
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },
    dateTime: {
        type: Date,
        required: true
    },
    dateOnlyString: {
        type: String,
        default: null
    },
    hour: {
        type: String,
        default: null
    },
    // Duración estimada de la cita, usada para el chequeo de solapamiento
    // de horarios (detección de conflictos).
    durationMinutes: {
        type: Number,
        default: 30,
        min: [1, 'La duración mínima es de 1 minuto']
    },
    specialty: {
        type: String,
        default: null,
        trim: true
    },
    providerName: {
        type: String,
        default: null,
        trim: true
    },
    reason: {
        type: String,
        default: null,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
