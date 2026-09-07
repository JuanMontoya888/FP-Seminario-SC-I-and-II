const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const medicalHistorySchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    salud: { type: String, required: true },
    padecimiento: { type: String, required: true },
    fiebreReumatica: { type: Boolean, required: true },
    enfermedadesCardiovasculares: { type: Boolean, required: true },
    mareos: { type: Boolean, required: true },
    diabetes: { type: Boolean, required: true },
    hepatitis: { type: Boolean, required: true },
    vih: { type: Boolean, required: true },
    artritis: { type: Boolean, required: true },
    gastritis: { type: Boolean, required: true },
    presionArterial: {
        type: String, required: true
    },
    tratamiendoMedicoActual: {
        type: String, required: false
    },
    tomandoMedicamento: {
        type: String, required: false
    },
    alergicoMedicamento: {
        type: String, required: false
    },
    adiccion: {
        type: String, required: false
    },
    fuma: {
        type: String, required: false
    },
    enfermedadNoMencionada: {
        type: String, required: false
    },
    embarazo: {
        type: String, required: false
    },
    problemaHormonal: { type: Boolean, required: false },

}, { timestamps: true });

const MedicalHistory = mongoose.model('MedicalHistory', medicalHistorySchema);
module.exports = MedicalHistory;