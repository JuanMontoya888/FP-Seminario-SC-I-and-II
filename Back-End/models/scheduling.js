const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true,
    },
    dateTime: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
    },
    hour: {
      type: String,
      required: [true, 'La hora es obligatoria'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'El formato debe ser HH:MM']
    },
    durationMinutes: {
      type: Number,
      required: [true, 'La duración es obligatoria'],
      min: [1, 'La duración mínima es de 1 minuto'],
    },
    patientName: {
      type: String,
      required: [true, 'El nombre del paciente es obligatorio'],
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      trim: true,
    },
    patientId: {
      // Si el ID viene de otra colección (ej: Users), usa ObjectId
      type: String,
      ref: 'User', // O 'Patient', el nombre de tu modelo de usuarios
      required: false,
    },
    contactNumber: {
      type: String,
      required: [true, 'El número de contacto es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor ingresa un email válido',
      ],
    },
    reason: {
      type: String,
      required: [true, 'El motivo es obligatorio'],
      minlength: [5, 'El motivo debe ser más descriptivo (min 5 letras)'],
      trim: true,
    },
    providerName: {
      type: String,
      required: [true, 'El proveedor/doctor es obligatorio'],
    },
    status: {
      enum: {
        values: [
          'Scheduled',              // Agendada
          'Confirmed',              // Confirmada (pago en línea aprobado)
          'Canceled',               // Cancelada
          'Completed',              // Completada
          'Payment_Pending',        // Pago en línea pendiente
          'Payment_Failed',         // Pago en línea rechazado
          'Pending_Clinic_Payment'  // Agendada, se paga en la clínica
        ],
        message: '{VALUE} no es un estado válido',
      },
      type: String,
      default: 'Scheduled',
      required: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    // --- Datos de cobro calculados en el servidor (nunca vienen del cliente) ---
    // Precio total del tratamiento según el catálogo (config/treatments.js)
    price: {
      type: Number,
      default: null,
    },
    // Modalidad elegida: 'full' (100% en línea), 'partial' (anticipo 50%), 'clinic' (en recepción)
    paymentMode: {
      type: String,
      enum: ['full', 'partial', 'clinic'],
      default: null,
    },
    // Monto que Mercado Pago debe cobrar; el webhook lo compara con transaction_amount
    amountExpected: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
    versionKey: false, // Quita el campo __v
  }
);

// -------------------------------------------------------------
// ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS (CDONE-50) Y TTL (CDONE-60)
// -------------------------------------------------------------
// 1. Optimiza la verificación de conflicto anti-solapamiento por especialista y fecha
AppointmentSchema.index({ providerName: 1, dateTime: 1, status: 1 });

// 2. Optimiza la consulta del historial de citas por usuario
AppointmentSchema.index({ user: 1, dateTime: -1 });

// 3. Optimiza la consulta general de disponibilidad para el calendario
AppointmentSchema.index({ status: 1, dateTime: 1 });

// 4. Índice TTL nativo para expiración automática de reservas temporales (CDONE-60)
AppointmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
