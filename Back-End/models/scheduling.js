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
      type: String,
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
      default: 'Scheduled',
      required: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true, // Crea automáticamente createdAt y updatedAt
    versionKey: false, // Quita el campo __v
  }
);

module.exports = mongoose.model('Appointment', AppointmentSchema);