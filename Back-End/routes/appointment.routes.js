const express = require('express');
const router = express.Router();

const appointmentController = require('../controllers/appointment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// ==========================================
// RUTAS PROTEGIDAS (Requieren Token)
// ==========================================

// Crear una cita nueva (Incluye lógica Anti-solapamiento, Mailer y Google Calendar)
router.post('/register/appointment', authMiddleware, appointmentController.createAppointment);

// Obtener todas las citas del usuario autenticado
router.get('/user/appointment', authMiddleware, appointmentController.getUserAppointments);

// Obtener TODAS las citas globales (Solo para rol Admin)
router.get('/admin/appointments', authMiddleware, adminMiddleware, appointmentController.getAllAppointments);

// Disponibilidad (ocupado anónimo + bloqueado) para pintar el calendario
router.get('/availability', authMiddleware, appointmentController.getAvailability);

// Cancelar una cita (Solo Admin)
router.patch('/admin/appointments/:id/cancel', authMiddleware, adminMiddleware, appointmentController.cancelAppointment);

// Bloquear / desbloquear una hora del día (Solo Admin)
router.post('/admin/block-slot', authMiddleware, adminMiddleware, appointmentController.blockSlot);
router.delete('/admin/block-slot', authMiddleware, adminMiddleware, appointmentController.unblockSlot);

// Bloquear / desbloquear un RANGO de horas (Solo Admin)
router.post('/admin/block-range', authMiddleware, adminMiddleware, appointmentController.blockRange);
router.delete('/admin/block-range', authMiddleware, adminMiddleware, appointmentController.unblockRange);

module.exports = router;