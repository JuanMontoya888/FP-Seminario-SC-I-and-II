const mongoose = require('mongoose');
const User = require('../models/users');
const PatientDetails = require('../models/patientDetails');
const MedicalHistory = require('../models/medicalHistory');

const upsertPatientDetails = async (req, res) => {
    try {
        const {
            email, nombre, apep, apem, direccion, cp, telCasa, numcel, 
            escolaridad, edoCivil, estatura, peso, nacimiento, genero
        } = req.body;

        const userId = req.user?.id;
        const user = userId ? await User.findById(userId) : await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                msg: 'Usuario principal no encontrado. Debe registrarse primero.'
            });
        }
        
        // Definir los datos a insertar o actualizar
        const updatePayload = {
            user: user._id, // Enlace por ID
            email: email || user.email,
            nombre, apep, apem, direccion, cp, telCasa, 
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

        // CDONE-55: Mantener sincronizada la referencia en el modelo User
        if (!user.patientDetails || String(user.patientDetails) !== String(patientDetails._id)) {
            user.patientDetails = patientDetails._id;
            await user.save();
        }

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

        // Verificar existencia del usuario (CDONE-50: select -password)
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

/**
 * Guarda o actualiza de manera transaccional y atómica el expediente clínico completo
 * (Detalles del Paciente + Historial Médico) - CDONE-55
 */
const saveCompleteClinicalRecord = async (req, res) => {
    let session = null;
    let useTransaction = false;

    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' });
        }

        const { patientDetails: pData, medicalHistory: mData } = req.body;

        // Intentar iniciar sesión para transacciones solo si MongoDB está conectado y lo soporta
        if (mongoose.connection && mongoose.connection.readyState === 1 && typeof mongoose.startSession === 'function') {
            try {
                session = await mongoose.startSession();
                session.startTransaction();
                useTransaction = true;
            } catch (sessErr) {
                useTransaction = false;
            }
        }

        const sessionOpt = useTransaction && session ? { session } : {};

        let updatedDetails = null;
        if (pData) {
            updatedDetails = await PatientDetails.findOneAndUpdate(
                { user: userId },
                { user: userId, email: user.email, ...pData },
                { new: true, upsert: true, runValidators: true, ...sessionOpt }
            );

            if (!user.patientDetails || String(user.patientDetails) !== String(updatedDetails._id)) {
                user.patientDetails = updatedDetails._id;
                await user.save(sessionOpt);
            }
        }

        let updatedHistory = null;
        if (mData) {
            updatedHistory = await MedicalHistory.findOneAndUpdate(
                { user: userId },
                { user: userId, ...mData },
                { new: true, upsert: true, runValidators: true, ...sessionOpt }
            );
        }

        if (useTransaction && session) {
            await session.commitTransaction();
        }

        res.status(200).json({
            msg: 'Expediente clínico guardado exitosamente.',
            patientDetails: updatedDetails,
            medicalHistory: updatedHistory
        });

    } catch (err) {
        if (useTransaction && session) {
            await session.abortTransaction();
        }
        console.error('Error al guardar expediente clínico transaccional:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: 'Error de validación', errors: messages });
        }
        res.status(500).json({ msg: 'Error interno del servidor al guardar expediente clínico.' });
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

const getPatientDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        let query = PatientDetails.findOne({ user: userId });
        if (typeof query.lean === 'function') query = query.lean();
        const patientDetails = await query;

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

        let query = MedicalHistory.findOne({ user: userId });
        if (typeof query.lean === 'function') query = query.lean();
        const histo = await query;

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
    saveCompleteClinicalRecord,
    getPatientDetails,
    getMedicalHistory
};
