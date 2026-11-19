const { Schema, model } = require('mongoose');

const invoiceRequest = new Schema({
    _id: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    rfc: String,
    name: String,
    postalCode: String,
    taxRegime: String,
    cfdiUse: String,
    concept: String,
    amount: String,
    currency: String,
    createdAt: Date,
}, { versionKey: false });

module.exports = model('InvoiceRequest', invoiceRequest);
