const express = require('express');
const router = express.Router();

const appointmentController = require('../controllers/appointment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

// Agendar cita (incluye lógica de detección de conflictos - CDONE-35)
router.post('/register/appointment', authMiddleware, appointmentController.createAppointment);

// Citas del usuario autenticado
router.get('/user/appointment', authMiddleware, appointmentController.getUserAppointments);

// Todas las citas (solo admin)
router.get('/admin/appointments', authMiddleware, adminMiddleware, appointmentController.getAllAppointments);

// Disponibilidad de horarios (CDONE-20)
router.get('/availability', authMiddleware, appointmentController.getAvailability);

// Cancelar cita (solo admin)
router.patch('/admin/appointments/:id/cancel', authMiddleware, adminMiddleware, appointmentController.cancelAppointment);

// Bloqueo de horarios puntuales (solo admin)
router.post('/admin/block-slot', authMiddleware, adminMiddleware, appointmentController.blockSlot);
router.delete('/admin/block-slot', authMiddleware, adminMiddleware, appointmentController.unblockSlot);

// Bloqueo de rangos de horarios (solo admin)
router.post('/admin/block-range', authMiddleware, adminMiddleware, appointmentController.blockRange);
router.delete('/admin/block-range', authMiddleware, adminMiddleware, appointmentController.unblockRange);

module.exports = router;
