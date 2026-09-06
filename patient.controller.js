const User = require('../models/users');
const PatientDetails = require('../models/patientDetails');
const MedicalHistory = require('../models/medicalHistory');

const upsertPatientDetails = async (req, res) => {
    try {
        const {
            email, nombre, apep, apem, direccion, cp, telCasa, numcel, 
            escolaridad, edoCivil, estatura, peso, nacimiento, genero
        } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                msg: 'Usuario principal no encontrado. Debe registrarse primero.'
            });
        }
        
        // Definir los datos a insertar o actualizar
        const updatePayload = {
            user: user._id, // Enlace por ID
            email, nombre, apep, apem, direccion, cp, telCasa, 
            numcel, escolaridad, edoCivil, estatura, peso, nacimiento, genero
        };

        // Ejecutar Upsert (Update + Insert)
        const patientDetails = await PatientDetails.findOneAndUpdate(
            { user: user._id },
            updatePayload,
            {
                new: true,          // Retorna el documento actualizado
                upsert: true,       // Si no existe, lo crea
                runValidators: true // Valida contra el Schema de Mongoose
            }
        );

        res.status(200).json({
            msg: 'Datos del paciente procesados exitosamente.',
            patientDetails
        });

    } catch (err) {
        console.error('Error al procesar los detalles:', err);

        // Manejo de errores de validación
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: 'Error de validación', errors: messages });
        }

        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

const upsertMedicalHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        // Verificar existencia del usuario
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }

        // Ejecutar upsert usando spread operator para capturar todos los campos
        const patientHisto = await MedicalHistory.findOneAndUpdate(
            { user: userId },
            { user: userId, ...req.body },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        res.status(200).json({
            msg: 'Historial clínico procesado exitosamente.',
            history: patientHisto
        });

    } catch (err) {
        console.error('Error al guardar el historial clínico:', err);

        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Datos inválidos', errors: err.errors });
        }

        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

const getPatientDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        const patientDetails = await PatientDetails.findOne({ user: userId });

        if (!patientDetails) {
            return res.status(404).json({ msg: 'No se encontraron detalles para este usuario.' });
        }

        res.json(patientDetails);
    } catch (err) {
        console.error('Error al obtener datos del paciente:', err);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

const getMedicalHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const histo = await MedicalHistory.findOne({ user: userId });

        if (!histo) {
            return res.status(404).json({ msg: 'No se encontró historial clínico.' });
        }

        res.json(histo);
    } catch (err) {
        console.error('Error al obtener el historial clínico:', err);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

module.exports = {
    upsertPatientDetails,
    upsertMedicalHistory,
    getPatientDetails,
    getMedicalHistory
};