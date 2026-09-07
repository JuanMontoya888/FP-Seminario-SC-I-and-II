const express = require('express');
const router = express.Router();

const patientController = require('../controllers/patient.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// ==========================================
// RUTAS DE REGISTRO / ACTUALIZACIÓN (Upsert)
// ==========================================
router.post('/register/patientDetails', patientController.upsertPatientDetails);
router.post('/register/histo', authMiddleware, patientController.upsertMedicalHistory);

// ==========================================
// RUTAS DE CONSULTA (GET)
// ==========================================
router.get('/get/patientDetails', authMiddleware, patientController.getPatientDetails);
router.get('/get/histo', authMiddleware, patientController.getMedicalHistory);

module.exports = router;