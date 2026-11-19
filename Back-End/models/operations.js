const { Schema, model } = require('mongoose');
const objectId = Schema.Types.ObjectId;
const options = { timestamps: true, optimisticConcurrency: true };
const payment = new Schema({ amount: Number, date: String, channel: String, reference: String, actor: objectId, requestKey: String });
const account = new Schema({
    kind: { type: String, enum: ['sale', 'quote', 'purchase', 'expense', 'payroll'], required: true },
    party: String, description: String, category: String, date: String, due: String,
    amount: Number, paid: { type: Number, default: 0 }, payments: [payment], actor: objectId,
}, options);
account.index({ date: -1 });
const bank = new Schema({
    bankAccount: String, date: String, amount: Number, reference: String,
    match: objectId, actor: objectId,
}, options);
bank.index({ bankAccount: 1, reference: 1 }, { unique: true });
bank.index({ match: 1 }, { unique: true, sparse: true });

const movement = new Schema({
    type: String, quantity: Number, date: String, note: String, actor: objectId,
    procedure: objectId, quantityAfter: Number, requestKey: String,
});
const lot = new Schema({
    item: { type: objectId, ref: 'StockItem' }, code: String, expiry: String,
    unitCost: Number, quantity: { type: Number, default: 0 }, movements: [movement],
}, options);
lot.index({ item: 1, code: 1 }, { unique: true });
const stockItem = new Schema({
    sku: { type: String, unique: true }, name: String, category: String, unit: String,
    minimum: Number, maximum: Number, actor: objectId,
}, options);
const supplier = new Schema({ name: String, contact: String, leadDays: Number, actor: objectId }, options);
const order = new Schema({
    supplier: objectId, item: objectId, quantity: Number, unitCost: Number,
    date: String, arrival: String, actor: objectId,
}, options);
const asset = new Schema({
    name: String, serial: { type: String, unique: true }, category: String,
    warranty: String, maintenance: String, actor: objectId,
    services: [{ date: String, next: String, note: String, actor: objectId }],
}, options);
const invoice = new Schema({
    uuid: { type: String, unique: true }, direction: String, kind: String,
    date: String, booking: objectId, xml: String, actor: objectId,
}, options);
const journal = new Schema({
    date: String, debit: String, credit: String, amount: Number, description: String, actor: objectId,
}, options);
journal.index({ date: -1 });

module.exports = {
    Account: model('OperatingAccount', account), Bank: model('BankMovement', bank),
    Item: model('StockItem', stockItem), Lot: model('StockLot', lot), Supplier: model('StockSupplier', supplier),
    Order: model('StockPurchaseOrder', order), Asset: model('ClinicAsset', asset),
    Invoice: model('FiscalArchive', invoice),
    Journal: model('ClinicJournalEntry', journal),
};
