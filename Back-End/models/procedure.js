const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Procedimiento / tratamiento realizado a un paciente en una consulta.
// Lo registra el dentista (admin) y lo consulta el paciente en su cuenta.
const procedureSchema = new Schema(
    {
        // Paciente al que se le realizó el procedimiento
        patient: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Cita relacionada (opcional, por si el procedimiento viene de una cita agendada)
        appointment: {
            type: Schema.Types.ObjectId,
            ref: 'Appointment',
            required: false,
        },
        // Fecha de la consulta
        fecha: {
            type: Date,
            default: Date.now,
            required: true,
        },
        // Doctor que realizó el procedimiento
        dentista: {
            type: String,
            required: [true, 'El nombre del dentista es obligatorio'],
            trim: true,
        },
        // Lista de procedimientos realizados (ej: ["Limpieza", "Resina"])
        procedimientos: [{ type: String, trim: true }],
        // Descripción de lo que se realizó en la cita
        descripcion: {
            type: String,
            required: [true, 'La descripción de lo realizado es obligatoria'],
            trim: true,
        },
        // Indicaciones / recomendaciones para el paciente (opcional)
        indicaciones: {
            type: String,
            default: '',
            trim: true,
        },
        // Costo del procedimiento (opcional)
        costo: {
            type: Number,
            min: [0, 'El costo no puede ser negativo'],
            required: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model('Procedure', procedureSchema);
