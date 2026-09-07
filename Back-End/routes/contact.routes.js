const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Solo usuarios logueados pueden enviar mensajes (así está en el front)
router.post('/', authMiddleware, contactController.submitContactForm);

module.exports = router;
