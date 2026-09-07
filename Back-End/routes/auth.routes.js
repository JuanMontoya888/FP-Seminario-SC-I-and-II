const express = require('express');
const router = express.Router();

// Importar el controlador y el middleware
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// ==========================================
// RUTAS PÚBLICAS (No requieren Token)
// ==========================================
router.post('/register', authController.register);
router.post('/user/login', authController.login);
router.post('/login', authController.googleLogin); // Google Sign-In
router.get('/verify-email/:token', authController.verifyEmail); // Verificación de correo
router.post('/resend-verification', authController.resendVerificationEmail); // Reenviar correo
router.post('/forgot-password', authController.forgotPassword); // Solicitar recuperación de contraseña
router.post('/reset-password/:token', authController.resetPassword); // Restablecer contraseña

// ==========================================
// RUTAS PROTEGIDAS (Requieren Token)
// ==========================================
router.get('/user/profile', authMiddleware, authController.getProfile);

// Guardar tipo de paciente (nuevo / ya ha ido) tras el registro
router.post('/user/patient-type', authMiddleware, authController.setPatientType);

module.exports = router;