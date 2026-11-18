import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Receiver {
  rfc: string;
  name: string;
  postalCode: string;
  taxRegime: string;
  cfdiUse: string;
}

interface InvoiceDocument extends Receiver {
  _id: string;
  concept: string;
  amount: string;
  currency: string;
  createdAt: string;
}

@Component({
  selector: 'app-invoice-request',
  imports: [FormsModule, RouterLink],
  templateUrl: './invoice-request.html',
  styleUrl: './invoice-request.css',
})
export class InvoiceRequest {
  private readonly http = inject(HttpClient);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly url = `${environment.apiUrl}/api/user/invoice-request/${encodeURIComponent(this.id)}`;

  readonly receiver: Receiver = { rfc: '', name: '', postalCode: '', taxRegime: '', cfdiUse: '' };
  readonly busy = signal(true);
  readonly eligible = signal(false);
  readonly invoice = signal<InvoiceDocument | null>(null);
  readonly error = signal('');
  readonly notice = 'Documento sin timbrar. No es un CFDI ni tiene validez fiscal.';

  constructor() { void this.load(); }

  private message(error: unknown): string {
    return error instanceof HttpErrorResponse
      ? error.error?.message || 'No se pudo consultar la solicitud. Intenta de nuevo.'
      : 'No se pudo completar la operación.';
  }

  async load(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(this.http.get<{ eligible: boolean; document: InvoiceDocument | null }>(this.url));
      this.eligible.set(result.eligible);
      this.invoice.set(result.document);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.busy() || !this.eligible() || this.invoice()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      this.invoice.set(await firstValueFrom(this.http.post<InvoiceDocument>(this.url, this.receiver)));
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }

  private rows(record: InvoiceDocument): [string, string][] {
    return [
      ['Referencia de compra', record._id],
      ['Fecha de solicitud', record.createdAt],
      ['Concepto', record.concept],
      ['Importe pagado', `${record.amount} ${record.currency}`],
      ['RFC', record.rfc],
      ['Nombre o razón social', record.name],
      ['Código postal', record.postalCode],
      ['Régimen fiscal', record.taxRegime],
      ['Uso del CFDI', record.cfdiUse],
    ];
  }

  downloadXml(record: InvoiceDocument): void {
    const xml = document.implementation.createDocument(null, 'SolicitudFactura');
    const root = xml.documentElement;
    const entries = [
      ['EstadoFiscal', 'SIN_TIMBRAR'], ['Aviso', this.notice], ['ReferenciaCompra', record._id],
      ['FechaSolicitud', record.createdAt], ['Concepto', record.concept], ['ImportePagado', record.amount],
      ['Moneda', record.currency], ['RFC', record.rfc], ['RazonSocial', record.name],
      ['CodigoPostal', record.postalCode], ['RegimenFiscal', record.taxRegime], ['UsoCFDI', record.cfdiUse],
    ];
    for (const [key, value] of entries) {
      const element = xml.createElement(key);
      element.textContent = value;
      root.append(element);
    }
    const data = new XMLSerializer().serializeToString(xml);
    const url = URL.createObjectURL(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', data], { type: 'application/xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `solicitud-factura-${record._id}.xml`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async downloadPdf(record: InvoiceDocument): Promise<void> {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const pdf = new jsPDF();
      pdf.setFontSize(20);
      pdf.text('Solicitud de factura · Dental One', 14, 20);
      pdf.setFontSize(10);
      pdf.text(this.notice, 14, 29);
      autoTable(pdf, { head: [['Dato', 'Información']], body: this.rows(record), startY: 37 });
      pdf.save(`solicitud-factura-${record._id}.pdf`);
    } catch {
      this.error.set('No se pudo generar el PDF. Intenta de nuevo.');
    }
  }
}
