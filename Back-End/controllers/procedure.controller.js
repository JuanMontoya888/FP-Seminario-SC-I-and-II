const Procedure = require('../models/procedure');
const User = require('../models/users');

// ==========================================
// Crear un procedimiento (SOLO admin / dentista)
// ==========================================
const createProcedure = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Acceso denegado. Se requieren permisos de administrador.' });
        }

        let {
            patientId, patientEmail, appointmentId,
            fecha, dentista, procedimientos, descripcion, indicaciones, costo
        } = req.body;

        // Resolver al paciente por id o por email
        let patient = null;
        if (patientId) {
            patient = await User.findById(patientId);
        } else if (patientEmail) {
            patient = await User.findOne({ email: patientEmail.toLowerCase().trim() });
        }

        if (!patient) {
            return res.status(404).json({ msg: 'Paciente no encontrado.' });
        }

        // Los procedimientos pueden venir como arreglo o como texto separado por comas
        if (typeof procedimientos === 'string') {
            procedimientos = procedimientos.split(',').map(p => p.trim()).filter(Boolean);
        }

        const nuevo = new Procedure({
            patient: patient._id,
            appointment: appointmentId || undefined,
            fecha: fecha || Date.now(),
            dentista,
            procedimientos: procedimientos || [],
            descripcion,
            indicaciones: indicaciones || '',
            costo: (costo !== undefined && costo !== null && costo !== '') ? costo : undefined,
        });

        await nuevo.save();
        res.status(201).json({ msg: 'Procedimiento registrado exitosamente.', procedure: nuevo });

    } catch (err) {
        console.error('Error al registrar procedimiento:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: 'Error de validación', errors: messages });
        }
        res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

// ==========================================
// Obtener los procedimientos del paciente autenticado
// ==========================================
const getMyProcedures = async (req, res) => {
    try {
        const procedures = await Procedure.find({ patient: req.user.id }).sort({ fecha: -1 });
        res.json(procedures);
    } catch (err) {
        console.error('Error al obtener procedimientos del paciente:', err);
        res.status(500).json({ msg: 'Error al obtener los procedimientos.' });
    }
};

// ==========================================
// Obtener los procedimientos de un paciente específico (SOLO admin)
// ==========================================
const getPatientProcedures = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Acceso denegado.' });
        }
        const procedures = await Procedure.find({ patient: req.params.patientId }).sort({ fecha: -1 });
        res.json(procedures);
    } catch (err) {
        console.error('Error al obtener procedimientos del paciente:', err);
        res.status(500).json({ msg: 'Error al obtener los procedimientos.' });
    }
};

// ==========================================
// Listar pacientes para el selector del dentista (SOLO admin)
// ==========================================
const listPatients = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Acceso denegado.' });
        }
        const patients = await User.find({ role: { $ne: 'admin' } })
            .select('nombre apellidos email')
            .sort({ nombre: 1 });
        res.json(patients);
    } catch (err) {
        console.error('Error al obtener pacientes:', err);
        res.status(500).json({ msg: 'Error al obtener la lista de pacientes.' });
    }
};

module.exports = {
    createProcedure,
    getMyProcedures,
    getPatientProcedures,
    listPatients,
};
