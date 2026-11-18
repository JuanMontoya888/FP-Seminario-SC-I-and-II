const router = require('express').Router();
const { Types } = require('mongoose');
const { Account, Bank, Item, Lot, Supplier, Order, Asset, Invoice, Journal } = require('../models/operations');
const Procedure = require('../models/procedure');
const authenticate = require('../middlewares/auth.middleware');
const authorizeAdmin = require('../middlewares/admin.middleware');
const { report, journalAccounts } = require('../services/operationReports');

router.use(authenticate, authorizeAdmin);
router.use((req, res, next) => {
    if (req.method === 'POST' && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
        return res.status(400).json({ message: 'Envía los datos como JSON.' });
    }
    next();
});

function invalid(message, status = 400) {
    throw Object.assign(new Error(message), { status });
}

function required(value, label, limit = 180) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) {
        invalid(`Revisa el campo ${label}.`);
    }
    return value.trim();
}

function choice(value, options) {
    if (!options.includes(value)) invalid('Opción desconocida.');
    return value;
}

function requestKey(value) {
    const key = required(value, 'identificador de captura', 36);
    if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(key)) invalid('Identificador de captura inválido.');
    return key;
}

function date(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
        || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
        invalid('Usa una fecha válida (AAAA-MM-DD).');
    }
    return value;
}

function today() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City' }).format(new Date());
}

function integer(value, minimum = 0, maximum = 1000000) {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) invalid('Cantidad fuera de rango.');
    return value;
}

function money(value, minimum = 1) {
    if (typeof value !== 'string' || !/^-?\d{1,9}(\.\d{1,2})?$/.test(value)) {
        invalid('Ingresa un importe con hasta dos decimales y punto decimal.');
    }
    return integer(Math.round(Number(value) * 100), minimum, 99999999999);
}

async function find(Model, id) {
    if (!Types.ObjectId.isValid(id)) invalid('Identificador inválido.');
    const result = await Model.findById(id);
    if (!result) invalid('Registro no encontrado.', 404);
    return result;
}

const kinds = ['sale', 'quote', 'purchase', 'expense', 'payroll'];

router.get('/accounts', async (req, res) => {
    res.json(await Account.find().sort({ date: -1, _id: -1 }).lean());
});

router.post('/accounts', async (req, res) => {
    const body = req.body;
    const issued = date(body.date);
    const due = date(body.due);
    if (due < issued) invalid('El vencimiento debe ser igual o posterior a la fecha de registro.');
    const row = await Account.create({
        kind: choice(body.kind, kinds), party: required(body.party, 'cliente o proveedor'),
        description: required(body.description, 'concepto'), category: required(body.category, 'categoría'),
        date: issued, due, amount: money(body.amount), actor: req.user.id,
    });
    res.status(201).json(row);
});

router.post('/accounts/:id/convert', async (req, res) => {
    const row = await find(Account, req.params.id);
    if (row.kind !== 'quote') invalid('Solo se convierten cotizaciones.', 409);
    const issued = date(req.body.date);
    const due = date(req.body.due);
    if (due < issued) invalid('El vencimiento no puede preceder a la venta.');
    row.kind = 'sale';
    row.date = issued;
    row.due = due;
    await row.save();
    res.json(row);
});

router.post('/accounts/:id/payments', async (req, res) => {
    const row = await find(Account, req.params.id);
    const key = requestKey(req.body.requestKey);
    if (row.payments.some(payment => payment.requestKey === key)) return res.json(row);
    const paidOn = date(req.body.date);
    const amount = money(req.body.amount);
    if (row.kind === 'quote' || paidOn < row.date || paidOn > today() || amount > row.amount - row.paid) {
        invalid('Revisa la fecha y el saldo disponible de esta cuenta.', 409);
    }
    row.payments.push({
        amount, date: paidOn, channel: choice(req.body.channel, ['bank', 'cash', 'other']),
        reference: required(req.body.reference, 'referencia'), actor: req.user.id, requestKey: key,
    });
    row.paid += amount;
    await row.save();
    res.json(row);
});

router.get('/report', async (req, res) => {
    const from = date(req.query.from);
    const to = date(req.query.to);
    if (to < from || to > today()) invalid('Revisa el periodo seleccionado.');
    const [rows, entries] = await Promise.all([
        Account.find({ date: { $lte: to }, kind: { $ne: 'quote' } }).lean(),
        Journal.find({ date: { $lte: to } }).lean(),
    ]);
    res.json(report(rows, from, to, to, entries));
});

router.get('/journal', async (req, res) => {
    res.json(await Journal.find().sort({ date: -1, _id: -1 }).limit(100).lean());
});

router.post('/journal', async (req, res) => {
    const recorded = date(req.body.date);
    const debit = choice(req.body.debit, journalAccounts);
    const credit = choice(req.body.credit, journalAccounts);
    if (recorded > today() || debit === credit) invalid('El asiento requiere dos cuentas distintas y una fecha válida.');
    const row = await Journal.create({
        date: recorded, debit, credit, amount: money(req.body.amount),
        description: required(req.body.description, 'concepto'), actor: req.user.id,
    });
    res.status(201).json(row);
});

router.get('/bank', async (req, res) => {
    res.json(await Bank.find().sort({ date: -1 }).lean());
});

router.post('/bank/import', async (req, res) => {
    const bankAccount = required(req.body.bankAccount, 'cuenta bancaria');
    const rows = req.body.rows;
    if (!Array.isArray(rows) || !rows.length || rows.length > 500) invalid('Importa entre 1 y 500 filas.');
    const records = rows.map(row => {
        if (!row || typeof row !== 'object') invalid('El archivo contiene una fila inválida.');
        const amount = money(row.amount, -99999999999);
        if (!amount) invalid('Los movimientos bancarios deben tener un importe distinto de cero.');
        return { bankAccount, date: date(row.date), amount, reference: required(row.reference, 'referencia bancaria'), actor: req.user.id };
    });
    const inserted = await Bank.bulkWrite(records.map(row => ({
        updateOne: {
            filter: { bankAccount, reference: row.reference },
            update: { $setOnInsert: row },
            upsert: true,
            timestamps: false,
        },
    })));
    res.status(201).json({ imported: inserted.upsertedCount });
});

router.post('/bank/:id/match', async (req, res) => {
    await Bank.init();
    const movement = await find(Bank, req.params.id);
    const account = await find(Account, req.body.account);
    const payment = typeof req.body.payment === 'string' ? account.payments.id(req.body.payment) : null;
    const sign = account.kind === 'sale' ? 1 : -1;
    if (movement.match || !payment || payment.channel !== 'bank'
        || movement.amount !== sign * payment.amount
        || Math.abs(Date.parse(payment.date) - Date.parse(movement.date)) > 3 * 86400000) {
        invalid('Selecciona un pago bancario del mismo importe y con una diferencia máxima de tres días.', 409);
    }
    movement.match = payment._id;
    await movement.save();
    res.json(movement);
});

router.get('/stock', async (req, res) => {
    const [items, lots, suppliers, orders, assets] = await Promise.all([
        Item.find().sort({ name: 1 }).lean(), Lot.find().lean(), Supplier.find().lean(),
        Order.find().sort({ date: -1, _id: -1 }).lean(), Asset.find().sort({ name: 1 }).lean(),
    ]);
    res.json({ items, lots, suppliers, orders, assets, today: today() });
});

router.post('/items', async (req, res) => {
    const { sku, name, category, unit, minimum, maximum } = req.body;
    const item = await Item.create({
        sku: required(sku, 'SKU').toUpperCase(), name: required(name, 'nombre'),
        category: required(category, 'categoría'), unit: required(unit, 'unidad'),
        minimum: integer(minimum), maximum: integer(maximum, minimum), actor: req.user.id,
    });
    res.status(201).json(item);
});

router.post('/lots', async (req, res) => {
    const item = await find(Item, req.body.item);
    const lot = await Lot.create({
        item: item._id, code: required(req.body.code, 'lote').toUpperCase(),
        expiry: req.body.expiry ? date(req.body.expiry) : undefined,
        unitCost: money(req.body.unitCost, 0),
    });
    res.status(201).json(lot);
});

router.post('/items/:id/limits', async (req, res) => {
    const item = await find(Item, req.params.id);
    item.minimum = integer(req.body.minimum);
    item.maximum = integer(req.body.maximum, item.minimum);
    await item.save();
    res.json(item);
});

router.post('/lots/:id/movements', async (req, res) => {
    const lot = await find(Lot, req.params.id);
    const key = requestKey(req.body.requestKey);
    if (lot.movements.some(entry => entry.requestKey === key)) return res.json(lot);
    const type = choice(req.body.type, ['entry', 'use', 'loss', 'count']);
    const quantity = integer(req.body.quantity, type === 'count' ? 0 : 1);
    const movementDate = date(req.body.date);
    if (movementDate > today()) invalid('El movimiento no puede tener fecha futura.');
    if (movementDate < (lot.movements.at(-1)?.date ?? '')) {
        invalid('La fecha no puede preceder al último movimiento del lote.', 409);
    }
    if (type === 'use' && lot.expiry && lot.expiry < today()) invalid('Este lote está vencido. Registra la merma o el conteo físico.', 409);
    const next = type === 'count' ? quantity : lot.quantity + (type === 'entry' ? quantity : -quantity);
    if (next < 0 || next > 1000000) invalid('El movimiento dejaría la existencia fuera de rango.', 409);
    if (req.body.procedure && type !== 'use') invalid('Solo el consumo se vincula con un procedimiento.');
    const procedure = req.body.procedure ? await find(Procedure, req.body.procedure) : null;
    lot.movements.push({
        type, quantity, date: movementDate, note: required(req.body.note, 'motivo'),
        actor: req.user.id, procedure: procedure?._id, quantityAfter: next, requestKey: key,
    });
    lot.quantity = next;
    await lot.save();
    res.json(lot);
});

router.post('/suppliers', async (req, res) => {
    const row = await Supplier.create({
        name: required(req.body.name, 'proveedor'), contact: required(req.body.contact, 'contacto'),
        leadDays: integer(req.body.leadDays, 0, 365), actor: req.user.id,
    });
    res.status(201).json(row);
});

router.post('/orders', async (req, res) => {
    const [supplier, item] = await Promise.all([find(Supplier, req.body.supplier), find(Item, req.body.item)]);
    const lots = await Lot.find({ item: item._id }).lean();
    const issued = today();
    const stock = lots.filter(lot => !lot.expiry || lot.expiry >= issued).reduce((total, lot) => total + lot.quantity, 0);
    const quantity = req.body.quantity === null ? item.maximum - stock : req.body.quantity;
    const arrival = new Date(Date.parse(issued) + supplier.leadDays * 86400000).toISOString().slice(0, 10);
    const row = await Order.create({
        supplier: supplier._id, item: item._id, quantity: integer(quantity, 1),
        unitCost: money(req.body.unitCost), date: issued, arrival, actor: req.user.id,
    });
    res.status(201).json(row);
});

router.post('/assets', async (req, res) => {
    const row = await Asset.create({
        name: required(req.body.name, 'equipo'), serial: required(req.body.serial, 'serie').toUpperCase(),
        category: required(req.body.category, 'categoría'), warranty: date(req.body.warranty),
        maintenance: date(req.body.maintenance), actor: req.user.id,
    });
    res.status(201).json(row);
});

router.post('/assets/:id/maintenance', async (req, res) => {
    const row = await find(Asset, req.params.id);
    const performed = date(req.body.date);
    const next = date(req.body.next);
    if (performed > today() || next <= performed || performed < (row.services.at(-1)?.date ?? '')) {
        invalid('Revisa las fechas del servicio y del próximo mantenimiento.');
    }
    row.services.push({ date: performed, next, note: required(req.body.note, 'trabajo realizado'), actor: req.user.id });
    row.maintenance = next;
    await row.save();
    res.json(row);
});

router.get('/invoices', async (req, res) => {
    res.json(await Invoice.find().select('-xml').sort({ date: -1 }).lean());
});

router.get('/invoices/:id/xml', async (req, res) => {
    const row = await find(Invoice, req.params.id);
    res.attachment(`${row.uuid}.xml`).type('application/octet-stream').send(row.xml);
});

router.post('/invoices', async (req, res) => {
    const xml = required(req.body.xml, 'XML', 65000);
    const uuid = required(req.body.uuid, 'UUID').toUpperCase();
    if (!/^[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}$/.test(uuid)) invalid('UUID inválido.');
    // Archivo interno. Nunca interpretamos el XML ni lo servimos como contenido ejecutable.
    const booking = req.body.booking ? await find(Account, req.body.booking) : null;
    const row = await Invoice.create({
        uuid, direction: choice(req.body.direction, ['issued', 'received']),
        kind: choice(req.body.kind, ['invoice', 'payment']), date: date(req.body.date),
        booking: booking?._id, xml, actor: req.user.id,
    });
    res.status(201).json({ _id: row._id });
});

router.use((error, req, res, next) => {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.name === 'VersionError' || error.code === 11000) {
        return res.status(409).json({ message: 'El registro cambió o ya existe. Actualiza y comprueba los datos.' });
    }
    if (error.name === 'CastError' || error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Revisa los datos enviados.' });
    }
    return next(error);
});

module.exports = router;
