const express = require('express');
const router = express.Router();

const controller = require('../controllers/mercado_pago.controller');
const authMiddleware = require('../middlewares/auth.middleware');


router.get('/', controller.val);
router.post('/proccesPay', authMiddleware, controller.proccesPay);
router.post('/webhook', controller.receiveWebhook);

module.exports = router;