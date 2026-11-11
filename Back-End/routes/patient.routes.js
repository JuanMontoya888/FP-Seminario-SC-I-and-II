const express = require('express');
const router = express.Router();

const patientController = require('../controllers/patient.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// ==========================================
// RUTAS DE REGISTRO / ACTUALIZACIÓN (Upsert)
// ==========================================
// Requiere token: el paciente se identifica por req.user.id, nunca por el email del body
router.post('/register/patientDetails', authMiddleware, patientController.upsertPatientDetails);
router.post('/register/histo', authMiddleware, patientController.upsertMedicalHistory);

// Guardado consolidado y transaccional del expediente clínico (CDONE-55)
router.post('/register/clinicalRecord', authMiddleware, patientController.saveCompleteClinicalRecord);

// ==========================================
// RUTAS DE CONSULTA (GET)
// ==========================================
router.get('/get/patientDetails', authMiddleware, patientController.getPatientDetails);
router.get('/get/histo', authMiddleware, patientController.getMedicalHistory);

module.exports = router;
