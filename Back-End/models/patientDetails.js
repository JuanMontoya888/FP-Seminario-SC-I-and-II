const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const patientDetailsSchema = new Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
        unique: true 
    },
    nombre: { type: String, required: true },
    apep: { type: String, required: true }, 
    apem: { type: String, required: true },
    email: { type: String, required: true },
    direccion: { type: String, required: true },
    cp: { type: String, required: true },
    telCasa: { type: String }, 
    numcel: { type: String, required: true },
    escolaridad: { type: String, required: true },
    edoCivil: { type: String, required: true },
    estatura: { type: String, required: true },
    peso: { type: String, required: true },
    nacimiento: { type: Date, required: true },
    genero: { type: String, required: true },

}, { timestamps: true });

const PatientDetails = mongoose.model('PatientDetails', patientDetailsSchema);
module.exports = PatientDetails;