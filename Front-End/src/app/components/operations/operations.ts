import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { read, utils } from 'xlsx';
import { environment } from '../../../environments/environment';

type Option = { value: string; label: string };
type Field = {
  key: string; label: string; type?: string; options?: Option[]; optional?: boolean;
};
type Value = string | number | null;
type Form = { title: string; path: string; fields: Field[]; values: Record<string, Value> };
type Row = { _id: string };
type Payment = Row & { amount: number; date: string; channel: string; reference: string };
type Account = Row & { kind: string; party: string; description: string; date: string; due: string;
  amount: number; paid: number; payments: Payment[] };
type BankMovement = Row & { bankAccount: string; date: string; amount: number; reference: string; match?: string };
type Invoice = Row & { uuid: string; date: string; direction: string; kind: string };
type Journal = Row & { debit: string; credit: string; amount: number; date: string; description: string };
type Item = Row & { name: string; sku: string; category: string; unit: string; minimum: number; maximum: number };
type Lot = Row & { item: string; code: string; expiry?: string; unitCost: number; quantity: number;
  movements: (Row & { date: string; type: string; quantity: number; quantityAfter: number; note: string; procedure?: string })[] };
type Supplier = Row & { name: string; contact: string; leadDays: number };
type Order = Row & { supplier: string; item: string; unitCost: number; quantity: number; date: string; arrival: string };
type Asset = Row & { name: string; serial: string; category: string; warranty: string; maintenance: string;
  services: (Row & { date: string; next: string; note: string })[] };
type Stock = { items: Item[]; lots: Lot[]; suppliers: Supplier[]; orders: Order[]; assets: Asset[] };
type Bar = { label: string; amount: number };
type Report = {
  sales: number; costs: number; profit: number; cash: number; receivables: number;
  payables: number; equity: number; overdue: number; trend: Bar[]; categories: Bar[]; debtors: Bar[];
  totalAssets: number; totalLiabilities: number; retained: number; capital: number;
  cashAsset: number; overdraft: number; inventory: number; fixedAssets: number;
  otherAssets: number; otherLiabilities: number;
};

const field = (key: string, label: string, type = 'text', optional = false): Field => ({ key, label, type, optional });
const select = (key: string, label: string, options: Option[]): Field => ({ key, label, options });
const options = (entries: [string, string][]): Option[] => entries.map(([value, label]) => ({ value, label }));
const kinds = options([['sale', 'Venta'], ['quote', 'Cotización'], ['purchase', 'Compra'],
  ['expense', 'Gasto operativo'], ['payroll', 'Nómina']]);
const movementTypes = options([['entry', 'Entrada'], ['use', 'Consumo'], ['loss', 'Merma'], ['count', 'Conteo físico']]);
const journalAccounts = options([['cash', 'Caja y bancos'], ['inventory', 'Inventario contable'],
  ['fixedAssets', 'Activo fijo neto'], ['otherAssets', 'Otros activos'], ['liabilities', 'Otros pasivos'],
  ['capital', 'Capital aportado'], ['sales', 'Ingresos'], ['costs', 'Costos y gastos']]);

@Component({
  selector: 'app-operations',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './operations.html',
  styleUrl: './operations.css',
})
export class Operations {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/admin/operations`;
  readonly today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City' }).format(new Date());
  from = this.today.slice(0, 8) + '01';
  to = this.today;
  inventoryFrom = this.from;
  inventoryTo = this.to;
  bankAccount = '';
  view = 'accounts';
  chart: 'trend' | 'categories' | 'debtors' = 'trend';
  chartDetail = '';
  filter = 'all';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly status = signal('');
  readonly form = signal<Form | null>(null);
  readonly accounts = signal<Account[]>([]);
  readonly bank = signal<BankMovement[]>([]);
  readonly invoices = signal<Invoice[]>([]);
  readonly journal = signal<Journal[]>([]);
  readonly stock = signal<Stock>({
    items: [], lots: [], suppliers: [], orders: [], assets: [],
  });
  readonly report = signal<Report | null>(null);
  readonly openLot = signal<Lot | null>(null);

  constructor() { void this.refresh(); }

  label(kind: string): string {
    return [...kinds, ...movementTypes, ...journalAccounts].find(option => option.value === kind)?.label ?? kind;
  }

  visibleAccounts(): Account[] {
    return this.accounts().filter(row => this.filter === 'all'
      || (this.filter === 'overdue' && row.kind === 'sale' && row.due < this.today && row.paid < row.amount)
      || (this.filter === 'income' && ['sale', 'quote'].includes(row.kind))
      || (this.filter === 'expenses' && !['sale', 'quote'].includes(row.kind)));
  }

  private get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.base + path));
  }

  private async load(): Promise<void> {
    const [accounts, bank, invoices, stock] = await Promise.all([
      this.get<Account[]>('/accounts'), this.get<BankMovement[]>('/bank'), this.get<Invoice[]>('/invoices'),
      this.get<Stock>('/stock'),
    ]);
    this.accounts.set(accounts);
    this.bank.set(bank);
    this.invoices.set(invoices);
    this.stock.set(stock);
    const lot = this.openLot();
    if (lot) this.openLot.set(stock.lots.find(item => item._id === lot._id) ?? null);
  }

  private async action(work: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.status.set('');
    try {
      await work();
    } catch (error: unknown) {
      this.error.set(error instanceof HttpErrorResponse
        ? error.error?.message ?? 'No se pudo comunicar con la API.'
        : error instanceof Error ? error.message : 'No se pudo completar la operación.');
    } finally {
      this.busy.set(false);
    }
  }

  refresh(): Promise<void> {
    return this.action(async () => {
      await this.load();
      await this.loadReport();
    });
  }

  refreshReport(): Promise<void> { return this.action(() => this.loadReport()); }

  private async loadReport(): Promise<void> {
    const [report, journal] = await Promise.all([
      this.get<Report>(`/report?from=${encodeURIComponent(this.from)}&to=${encodeURIComponent(this.to)}`),
      this.get<Journal[]>('/journal'),
    ]);
    this.report.set(report);
    this.journal.set(journal);
  }

  openView(view: string): void {
    this.view = view;
    this.form.set(null);
    if (view === 'report') void this.refreshReport();
  }

  private edit(title: string, path: string, fields: Field[], values: Form['values'] = {}): void {
    this.form.set({ title, path, fields, values });
  }

  save(form: Form): Promise<void> {
    return this.action(async () => {
      await firstValueFrom(this.http.post(this.base + form.path, form.values));
      this.form.set(null);
      this.status.set('Registro guardado.');
      if (form.path === '/journal') await this.loadReport();
      else await this.load();
    });
  }

  account(): void {
    this.edit('Registrar operación', '/accounts', [
      select('kind', 'Tipo', kinds), field('party', 'Cliente, proveedor o beneficiario'),
      field('description', 'Concepto'), field('category', 'Categoría'),
      field('date', 'Fecha', 'date'), field('due', 'Vencimiento', 'date'), field('amount', 'Importe en MXN'),
    ], { kind: 'sale', date: this.today, due: this.today });
  }

  journalEntry(): void {
    this.edit('Registrar asiento de partida doble', '/journal', [
      field('date', 'Fecha', 'date'), field('description', 'Concepto'),
      select('debit', 'Debe', journalAccounts), select('credit', 'Haber', journalAccounts),
      field('amount', 'Importe en MXN'),
    ], { date: this.today });
  }

  convert(row: Account): void {
    this.edit('Convertir cotización en venta', `/accounts/${row._id}/convert`,
      [field('date', 'Fecha de venta', 'date'), field('due', 'Vencimiento', 'date')],
      { date: this.today, due: this.today });
  }

  payment(row: Account): void {
    this.edit(row.kind === 'sale' ? 'Registrar abono' : 'Registrar pago', `/accounts/${row._id}/payments`, [
      field('amount', 'Importe en MXN'), field('date', 'Fecha', 'date'),
      select('channel', 'Medio', options([['bank', 'Banco'], ['cash', 'Efectivo'], ['other', 'Otro']])),
      field('reference', 'Referencia'),
    ], { date: this.today, channel: 'bank', requestKey: crypto.randomUUID() });
  }

  async importBank(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    await this.action(async () => {
      if (file.size > 1000000) throw new Error('El archivo debe pesar menos de 1 MB.');
      const workbook = read(await file.text(), { type: 'string', raw: true, sheetRows: 502 });
      const rows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]]);
      if (!rows.length || rows.some(row => !('fecha' in row && 'importe' in row && 'referencia' in row))) {
        throw new Error('El CSV requiere las columnas fecha, importe y referencia.');
      }
      const result = await firstValueFrom(this.http.post<{ imported: number }>(this.base + '/bank/import', {
        bankAccount: this.bankAccount, rows: rows.map(row => ({
          date: String(row['fecha']), amount: String(row['importe']), reference: String(row['referencia']),
        })),
      }));
      this.status.set(`${result.imported} movimientos importados.`);
      await this.load();
    });
  }

  candidates(movement: BankMovement): Option[] {
    const matched = new Set(this.bank().map(row => row.match));
    return this.accounts().flatMap(row => row.payments
      .filter(payment => payment.channel === 'bank' && !matched.has(payment._id)
        && movement.amount === (row.kind === 'sale' ? 1 : -1) * payment.amount
        && Math.abs(Date.parse(payment.date) - Date.parse(movement.date)) <= 3 * 86400000)
      .map(payment => ({
        value: `${row._id}/${payment._id}`, label: `${payment.date} · ${row.party} · ${payment.reference}`,
      })));
  }

  match(movement: BankMovement, selected: string): Promise<void> {
    return this.action(async () => {
      const [account, payment] = selected.split('/');
      await firstValueFrom(this.http.post(this.base + `/bank/${movement._id}/match`, { account, payment }));
      this.status.set('Movimiento conciliado.');
      await this.load();
    });
  }

  invoice(): void {
    this.edit('Archivar CFDI existente', '/invoices', [
      field('uuid', 'UUID fiscal'), field('date', 'Fecha del comprobante', 'date'),
      select('direction', 'Origen', options([['received', 'Recibido'], ['issued', 'Emitido externamente']])),
      select('kind', 'Tipo', options([['invoice', 'Factura'], ['payment', 'Complemento de pago']])),
      field('xml', 'Contenido XML', 'textarea'),
    ], { date: this.today, direction: 'received', kind: 'invoice' });
  }

  uploadInvoice(event: Event, form: Form): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return Promise.resolve();
    return this.action(async () => {
      if (file.size > 65000) throw new Error('El XML debe pesar como máximo 65 KB.');
      const xml = await file.text();
      if (/<!DOCTYPE/i.test(xml)) throw new Error('El XML contiene una declaración no admitida.');
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const root = doc.documentElement;
      const stamp = doc.getElementsByTagNameNS('http://www.sat.gob.mx/TimbreFiscalDigital', 'TimbreFiscalDigital')[0];
      const uuid = stamp?.getAttribute('UUID');
      if (root.namespaceURI !== 'http://www.sat.gob.mx/cfd/4' || root.localName !== 'Comprobante'
        || root.getAttribute('Version') !== '4.0' || !uuid) {
        throw new Error('El XML debe incluir un comprobante CFDI 4.0 con Timbre Fiscal Digital.');
      }
      form.values['uuid'] = uuid;
      form.values['date'] = root.getAttribute('Fecha')?.slice(0, 10) ?? '';
      form.values['kind'] = root.getAttribute('TipoDeComprobante') === 'P' ? 'payment' : 'invoice';
      form.values['xml'] = xml;
    });
  }

  downloadInvoice(row: Invoice): Promise<void> {
    return this.action(async () => {
      const blob = await firstValueFrom(this.http.get(this.base + `/invoices/${row._id}/xml`, { responseType: 'blob' }));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = row.uuid + '.xml';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  item(): void {
    this.edit('Registrar insumo', '/items', [field('sku', 'SKU o código de barras'), field('name', 'Nombre'),
      field('category', 'Categoría'), field('unit', 'Unidad de medida'),
      field('minimum', 'Mínimo', 'number'), field('maximum', 'Máximo', 'number')], { minimum: 0 });
  }

  limits(item: Item): void {
    this.edit('Ajustar límites de stock', `/items/${item._id}/limits`,
      [field('minimum', 'Mínimo', 'number'), field('maximum', 'Máximo', 'number')],
      { minimum: item.minimum, maximum: item.maximum });
  }

  lot(item: Row): void {
    this.edit('Crear lote', '/lots', [field('code', 'Número de lote'),
      field('expiry', 'Caducidad', 'date', true), field('unitCost', 'Costo unitario en MXN')],
    { item: item._id, unitCost: '0' });
  }

  movement(lot: Lot): void {
    this.edit('Registrar movimiento', `/lots/${lot._id}/movements`, [
      select('type', 'Tipo', movementTypes), field('quantity', 'Cantidad o total contado', 'number'),
      field('date', 'Fecha', 'date'), field('note', 'Motivo'),
      field('procedure', 'ID del procedimiento (solo para consumo)', 'text', true),
    ], { type: 'entry', date: this.today, requestKey: crypto.randomUUID() });
  }

  supplier(): void {
    this.edit('Registrar proveedor', '/suppliers', [field('name', 'Nombre'), field('contact', 'Contacto'),
      field('leadDays', 'Días de entrega', 'number')], { leadDays: 0 });
  }

  order(item: Row): void {
    this.edit('Generar orden de compra', '/orders', [
      select('supplier', 'Proveedor', this.stock().suppliers.map(row => ({ value: row._id, label: row.name }))),
      field('quantity', 'Cantidad (vacío para completar el máximo)', 'number', true),
      field('unitCost', 'Precio unitario en MXN'),
    ], { item: item._id, quantity: null });
  }

  asset(): void {
    this.edit('Registrar equipo o instrumental', '/assets', [
      field('name', 'Nombre'), field('serial', 'Número de serie'), field('category', 'Categoría'),
      field('warranty', 'Fin de garantía', 'date'), field('maintenance', 'Próximo mantenimiento', 'date'),
    ]);
  }

  maintenance(row: Asset): void {
    this.edit('Registrar mantenimiento realizado', `/assets/${row._id}/maintenance`, [
      field('date', 'Fecha de servicio', 'date'), field('next', 'Próximo mantenimiento', 'date'),
      field('note', 'Trabajo realizado'),
    ], { date: this.today });
  }

  lots(item: Row): Lot[] { return this.stock().lots.filter(lot => lot.item === item._id); }

  available(item: Row): number {
    return this.lots(item).filter(lot => !lot.expiry || lot.expiry >= this.today)
      .reduce((total, lot) => total + lot.quantity, 0);
  }

  inventoryValue(): number {
    return this.stock().lots.reduce((total, lot) => total + lot.quantity * lot.unitCost, 0);
  }

  inventoryReport() {
    const summary = { use: 0, loss: 0, opening: 0, closing: 0 };
    for (const lot of this.stock().lots) {
      let opening = 0;
      let closing = 0;
      for (const entry of lot.movements) {
        if (entry.date < this.inventoryFrom) opening = entry.quantityAfter;
        if (entry.date <= this.inventoryTo) closing = entry.quantityAfter;
        if (entry.date < this.inventoryFrom || entry.date > this.inventoryTo) continue;
        if (entry.type === 'use' || entry.type === 'loss') summary[entry.type] += entry.quantity * lot.unitCost;
      }
      summary.opening += opening * lot.unitCost;
      summary.closing += closing * lot.unitCost;
    }
    const average = (summary.opening + summary.closing) / 2;
    return { ...summary, turnover: average > 0 ? summary.use / average : null };
  }

  daysTo(date: string): number { return (Date.parse(date) - Date.parse(this.today)) / 86400000; }

  title(rows: (Row & { name: string })[], id: string): string {
    return rows.find(row => row._id === id)?.name ?? '—';
  }

  lastPrices(item: Item): Order[] {
    const latest = new Map<string, Order>();
    for (const order of this.stock().orders) {
      if (order.item === item._id && !latest.has(order.supplier)) latest.set(order.supplier, order);
    }
    return [...latest.values()].sort((a, b) => a.unitCost - b.unitCost);
  }

  width(bar: Bar, bars: Bar[]): number {
    return Math.abs(bar.amount) / Math.max(1, ...bars.map(row => Math.abs(row.amount))) * 100;
  }
}
