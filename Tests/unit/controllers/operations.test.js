jest.mock('../../../Back-End/middlewares/auth.middleware', () => jest.fn());
jest.mock('../../../Back-End/middlewares/admin.middleware', () => jest.fn());

const { Types } = require('../../../Back-End/node_modules/mongoose');
const router = require('../../../Back-End/routes/operations.routes');
const { Account, Bank, Lot } = require('../../../Back-End/models/operations');
const { report } = require('../../../Back-End/services/operationReports');

const id = new Types.ObjectId().toString();
const capture = '94cf2dd0-511a-4f89-91ca-8af7258b90b9';
const request = body => ({ params: { id }, body, user: { id } });
const response = () => ({ json: jest.fn() });
const action = path => router.stack.find(layer => layer.route?.path === path && layer.route.methods.post)
    .route.stack[0].handle;

test('report recognizes sales and expenses in period and excludes quotes and later payments', () => {
    const accounts = [
        { kind: 'sale', party: 'Paciente', amount: 1000, date: '2026-10-01', due: '2026-10-05',
            payments: [{ date: '2026-10-08', amount: 500 }, { date: '2026-11-01', amount: 500 }] },
        { kind: 'expense', category: 'Renta', amount: 600, date: '2026-10-09', due: '2026-10-20',
            payments: [{ date: '2026-10-10', amount: 300 }] },
        { kind: 'quote', amount: 2000, date: '2026-10-01', payments: [] },
    ];
    const summary = report(accounts, '2026-10-01', '2026-10-31', '2026-10-31');
    expect(summary).toMatchObject({ sales: 1000, costs: 600, profit: 400, overdue: 500, receivables: 500, payables: 300 });
    expect(summary.cash + summary.receivables).toBe(summary.payables + summary.equity);
});

test('account rejects an excessive payment and accepts a retry only once', async () => {
    const account = new Account({ kind: 'sale', amount: 1000, paid: 0, date: '2025-01-01' });
    jest.spyOn(Account, 'findById').mockResolvedValue(account);
    jest.spyOn(account, 'save').mockResolvedValue(account);
    const post = action('/accounts/:id/payments');
    const body = { date: '2025-01-01', amount: '10.01', channel: 'bank', reference: 'transfer', requestKey: capture };
    await expect(post(request(body), response())).rejects.toMatchObject({ status: 409 });
    await post(request({ ...body, amount: '5.00' }), response());
    await post(request({ ...body, amount: '5.00' }), response());
    expect(account.paid).toBe(500);
    expect(account.payments).toHaveLength(1);
});

test('double-entry adjustments capitalize expenses and keep the balance equation at close', () => {
    const rows = [{ kind: 'purchase', category: 'Material', amount: 400, date: '2026-10-08', payments: [] }];
    const entries = [
        { debit: 'cash', credit: 'capital', amount: 1000, date: '2026-09-30' },
        { debit: 'inventory', credit: 'costs', amount: 400, date: '2026-10-08' },
        { debit: 'costs', credit: 'inventory', amount: 100, date: '2026-10-10' },
        { debit: 'fixedAssets', credit: 'cash', amount: 300, date: '2026-11-01' },
    ];
    const summary = report(rows, '2026-10-01', '2026-10-31', '2026-10-31', entries);
    expect(summary).toMatchObject({ inventory: 300, fixedAssets: 0, totalAssets: 1300, totalLiabilities: 400,
        capital: 1000, retained: -100, profit: -100 });
    expect(summary.totalAssets).toBe(summary.totalLiabilities + summary.equity);
});

test('inventory blocks expired consumption and stores the resulting count with its reason', async () => {
    const lot = new Lot({ quantity: 5, expiry: '2020-01-01' });
    jest.spyOn(Lot, 'findById').mockResolvedValue(lot);
    jest.spyOn(lot, 'save').mockResolvedValue(lot);
    const post = action('/lots/:id/movements');
    const body = { type: 'use', quantity: 1, date: '2025-01-01', note: 'Conteo', requestKey: capture };
    await expect(post(request(body), response())).rejects.toMatchObject({ status: 409 });
    await post(request({ ...body, type: 'count', quantity: 0 }), response());
    expect(lot.quantity).toBe(0);
    expect(lot.movements[0]).toMatchObject({ type: 'count', quantityAfter: 0, note: 'Conteo' });
});

test('bank matching rejects an outgoing movement for a sale receipt', async () => {
    const account = new Account({
        kind: 'sale', payments: [{ date: '2025-01-01', amount: 500, channel: 'bank' }],
    });
    jest.spyOn(Bank, 'init').mockResolvedValue();
    jest.spyOn(Bank, 'findById').mockResolvedValue(new Bank({ date: '2025-01-02', amount: -500 }));
    jest.spyOn(Account, 'findById').mockResolvedValue(account);
    await expect(action('/bank/:id/match')(request({
        account: id, payment: account.payments[0].id,
    }), response())).rejects.toMatchObject({ status: 409 });
});
