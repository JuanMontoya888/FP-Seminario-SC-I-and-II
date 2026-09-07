// models/users.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');

const userSchema = new Schema({
    nombre: {
        type: String,
        required: true
    },
    apellidos: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    // --- NUEVO CAMPO AGREGADO ---
    role: {
        type: String,
        enum: ['user', 'admin'], // Solo permite estos dos valores exactos
        default: 'user'          // Si no se especifica, será 'user' (usuario normal)
    },
    // ----------------------------
    // Tipo de paciente: 'new' (nuevo, debe pagar su 1a cita en línea)
    // o 'returning' (ya ha ido, puede pagar en clínica). null = aún no elige.
    patientType: {
        type: String,
        enum: ['new', 'returning'],
        default: null
    },
    // Si puede pagar en la clínica. Los 'returning' empiezan en true;
    // los 'new' en false hasta que pagan su primera cita en línea.
    canPayAtClinic: {
        type: Boolean,
        default: false
    },
    patientDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientDetails' },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String,
        default: null
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// PRE-HOOK: Hashear y salting a la contraseña antes de guardar el documento
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;