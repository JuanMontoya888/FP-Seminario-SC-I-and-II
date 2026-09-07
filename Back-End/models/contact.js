const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio']
    },
    email: {
        type: String,
        required: [true, 'El email es obligatorio']
    },
    celular: {
        type: String,
        required: [true, 'El celular es obligatorio']
    },
    asunto: {
        type: String,
        required: [true, 'El asunto es obligatorio']
    },
    mensaje: {
        type: String,
        required: [true, 'El mensaje es obligatorio']
    },
    status: {
        type: String,
        enum: ['Pending', 'Reviewed', 'Resolved'],
        default: 'Pending'
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('Contact', ContactSchema);
