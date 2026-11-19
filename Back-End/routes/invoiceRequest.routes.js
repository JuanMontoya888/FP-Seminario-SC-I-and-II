const router = require('express').Router();
const { isObjectIdOrHexString } = require('mongoose');
const authenticate = require('../middlewares/auth.middleware');
const Appointment = require('../models/scheduling');
const InvoiceRequest = require('../models/invoiceRequest');

function approvedOnlinePayment(appointment) {
    return ['Confirmed', 'Completed'].includes(appointment.status)
        && ['full', 'partial'].includes(appointment.paymentMode)
        && Number.isFinite(appointment.amountExpected) && appointment.amountExpected > 0;
}

function receiver(body) {
    const values = {};
    const fields = {
        rfc: /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/u,
        name: /^[^\u0000-\u001f\u007f]{1,200}$/u,
        postalCode: /^[0-9]{5}$/,
        taxRegime: /^6[0-9]{2}$/,
        cfdiUse: /^[A-Z][0-9]{2}$/,
    };
    for (const [field, pattern] of Object.entries(fields)) {
        const raw = body?.[field];
        const value = typeof raw === 'string' ? raw.trim() : '';
        values[field] = field === 'name' ? value : value.toUpperCase();
        if (!pattern.test(values[field])) return null;
    }
    return values;
}

router.use(authenticate);
router.use('/:id', async (req, res, next) => {
    if (!isObjectIdOrHexString(req.params.id)) return res.status(404).json({ message: 'Compra no encontrada.' });
    const appointment = await Appointment.findOne({ _id: req.params.id, user: req.user.id })
        .select('status paymentMode amountExpected reason').lean();
    if (!appointment) return res.status(404).json({ message: 'Compra no encontrada.' });
    res.locals.appointment = appointment;
    next();
});

router.get('/:id', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const appointment = res.locals.appointment;
    const document = await InvoiceRequest.findById(appointment._id).lean();
    res.json({ eligible: approvedOnlinePayment(appointment), document });
});

router.post('/:id', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const appointment = res.locals.appointment;
    if (!approvedOnlinePayment(appointment)) {
        return res.status(409).json({ message: 'La compra no tiene un pago en línea aprobado.' });
    }
    const fiscal = receiver(req.body);
    if (!fiscal) return res.status(400).json({ message: 'Revisa los datos fiscales y sus formatos.' });

    const _id = appointment._id;
    const snapshot = {
        ...fiscal,
        concept: appointment.reason || 'Servicio odontológico',
        amount: appointment.amountExpected.toFixed(2),
        currency: 'MXN',
        createdAt: new Date(),
    };
    try {
        const document = await InvoiceRequest.findOneAndUpdate({ _id },
            { $setOnInsert: snapshot }, { upsert: true, new: true }).lean();
        return res.json(document);
    } catch (error) {
        if (error.code !== 11000) throw error;
        return res.json(await InvoiceRequest.findById(_id).lean());
    }
});

module.exports = router;
