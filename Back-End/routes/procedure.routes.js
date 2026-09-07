const express = require('express');
const router = express.Router();

const procedureController = require('../controllers/procedure.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// ==========================================
// RUTAS DE PROCEDIMIENTOS (Requieren Token)
// ==========================================

// Crear un procedimiento (solo admin / dentista)
router.post('/procedures', authMiddleware, adminMiddleware, procedureController.createProcedure);

// Procedimientos del paciente autenticado
router.get('/user/procedures', authMiddleware, procedureController.getMyProcedures);

// Lista de pacientes para el selector (solo admin)
router.get('/admin/patients', authMiddleware, adminMiddleware, procedureController.listPatients);

// Procedimientos de un paciente específico (solo admin)
router.get('/admin/procedures/:patientId', authMiddleware, adminMiddleware, procedureController.getPatientProcedures);

module.exports = router;
