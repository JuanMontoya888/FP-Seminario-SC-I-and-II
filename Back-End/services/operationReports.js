const sum = (rows, value) => rows.reduce((total, row) => total + value(row), 0);

const journalAccounts = ['cash', 'inventory', 'fixedAssets', 'otherAssets', 'liabilities', 'capital', 'sales', 'costs'];
const debitAccounts = new Set(['cash', 'inventory', 'fixedAssets', 'otherAssets', 'costs']);

function report(accounts, from, to, today, journal = []) {
    const inPeriod = date => date >= from && date <= to;
    const posted = accounts.filter(row => row.kind !== 'quote' && row.date <= to);
    const income = posted.filter(row => row.kind === 'sale');
    const expenses = posted.filter(row => row.kind !== 'sale');
    const paid = row => sum(row.payments.filter(payment => payment.date <= to), payment => payment.amount);
    const balance = row => row.amount - paid(row);
    const adjustments = Object.fromEntries(journalAccounts.map(account => [account, 0]));
    const manualSales = [];
    const manualCosts = [];
    for (const entry of journal.filter(row => row.date <= to)) {
        for (const [account, sign] of [[entry.debit, 1], [entry.credit, -1]]) {
            const delta = entry.amount * sign * (debitAccounts.has(account) ? 1 : -1);
            adjustments[account] += delta;
            if (!inPeriod(entry.date)) continue;
            if (account === 'sales') manualSales.push({ date: entry.date, amount: delta });
            if (account === 'costs') manualCosts.push({ category: 'Asientos contables', amount: delta });
        }
    }
    const sales = sum(income.filter(row => inPeriod(row.date)), row => row.amount)
        + sum(manualSales, row => row.amount);
    const costs = sum(expenses.filter(row => inPeriod(row.date)), row => row.amount)
        + sum(manualCosts, row => row.amount);
    const cash = sum(income, paid) - sum(expenses, paid) + adjustments.cash;
    const receivables = sum(income, balance);
    const payables = sum(expenses, balance);
    const retained = sum(income, row => row.amount) - sum(expenses, row => row.amount)
        + adjustments.sales - adjustments.costs;
    const equity = retained + adjustments.capital;
    const totalAssets = Math.max(0, cash) + receivables + adjustments.inventory + adjustments.fixedAssets + adjustments.otherAssets;
    const totalLiabilities = payables + adjustments.liabilities + Math.max(0, -cash);
    const overdue = sum(income.filter(row => row.due < today), balance);

    function group(rows, key, value) {
        const totals = new Map();
        for (const row of rows) totals.set(key(row), (totals.get(key(row)) || 0) + value(row));
        return [...totals].map(([label, amount]) => ({ label, amount }));
    }

    return {
        sales, costs, profit: sales - costs, cash, receivables, payables, equity, overdue,
        totalAssets, totalLiabilities, retained, capital: adjustments.capital,
        cashAsset: Math.max(0, cash), overdraft: Math.max(0, -cash),
        inventory: adjustments.inventory, fixedAssets: adjustments.fixedAssets,
        otherAssets: adjustments.otherAssets, otherLiabilities: adjustments.liabilities,
        trend: group([...income.filter(row => inPeriod(row.date)), ...manualSales], row => row.date.slice(0, 7), row => row.amount)
            .sort((a, b) => a.label.localeCompare(b.label)),
        categories: group([...expenses.filter(row => inPeriod(row.date)), ...manualCosts], row => row.category, row => row.amount),
        debtors: group(income, row => row.party, balance)
            .filter(row => row.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 10),
    };
}

module.exports = { report, journalAccounts };
