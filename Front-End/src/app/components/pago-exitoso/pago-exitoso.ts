import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { AppointmentsService } from '../../services/appointments.service';

type EstadoPago = 'approved' | 'pending' | 'failure';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-exitoso.html',
  styleUrl: './pago-exitoso.css'
})
export class PagoExitoso implements OnInit, OnDestroy {

  status: EstadoPago = 'pending';
  paymentId: string = '';
  merchantOrderId: string = '';
  pagoInfo: any = null;

  // Estado confirmado por el servidor (no por los parámetros de la URL)
  verifying = false;
  receiptAvailable = false;

  // Reintentos mientras llega el webhook de Mercado Pago (pago aprobado pero cita aún pendiente)
  private readonly maxVerifyAttempts = 5;
  private readonly verifyDelayMs = 3000;
  private verifyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly estados: Record<string, { icon: string; title: string; text: string; color: string }> = {
    approved: {
      icon: '✅',
      title: '¡Pago Exitoso y Cita Confirmada!',
      text: 'Tu pago ha sido procesado correctamente y tu cita está reservada en nuestro sistema.',
      color: '#166534'
    },
    pending: {
      icon: '⏳',
      title: 'Pago en Revisión',
      text: 'Tu pago está siendo procesado por la pasarela. Te notificaremos por correo cuando se confirme tu cita.',
      color: '#854d0e'
    },
    failure: {
      icon: '❌',
      title: 'Pago No Completado',
      text: 'Hubo un inconveniente al procesar la transacción. Tu cita aún no ha sido confirmada. Puedes reintentar el pago.',
      color: '#991b1b'
    }
  };

  estadoActual = this.estados['pending'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointmentsService: AppointmentsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Parámetros devueltos por Mercado Pago. Solo son una pista: el estado real
    // se confirma con el backend (lo actualiza el webhook).
    const params = this.route.snapshot.queryParamMap;
    const mpStatus = params.get('collection_status') || params.get('status');
    const pagoId = params.get('collection_id') || params.get('payment_id');

    // MP manda 'null' cuando el usuario abandona el checkout
    this.paymentId = pagoId && pagoId !== 'null' ? pagoId : '';
    this.merchantOrderId = params.get('merchant_order_id') || '';

    this.setStatus(this.mapMpStatus(mpStatus));

    // Recuperamos los datos de la cita y checkout guardados en localStorage (CDONE-61, CDONE-64, CDONE-66)
    const stored = localStorage.getItem('citaPagoInfo');
    if (stored) {
      try {
        this.pagoInfo = JSON.parse(stored);
      } catch (e) {
        console.error('Error parseando citaPagoInfo', e);
      }
    }

    if (this.pagoInfo?.appointmentId) {
      this.verifyWithServer(mpStatus, 1);
    } else if (this.status === 'approved') {
      // Sin cita que verificar no se muestra como éxito
      this.setStatus('pending');
    }
  }

  ngOnDestroy(): void {
    if (this.verifyTimer) clearTimeout(this.verifyTimer);
  }

  /** Estado que reporta Mercado Pago en la URL de regreso. Lo desconocido cuenta como fallo. */
  private mapMpStatus(mpStatus: string | null): EstadoPago {
    switch (mpStatus) {
      case 'approved':
        return 'approved';
      case 'pending':
      case 'in_process':
        return 'pending';
      default:
        // rejected, cancelled, 'null' (checkout abandonado) o cualquier otro valor
        return 'failure';
    }
  }

  private setStatus(status: EstadoPago): void {
    this.status = status;
    this.estadoActual = this.estados[status];
  }

  /** Consulta la cita en el backend y muestra su estado real (CDONE-58). */
  private verifyWithServer(mpStatus: string | null, attempt: number): void {
    this.verifying = true;
    this.appointmentsService.getAppointmentById(this.pagoInfo.appointmentId).subscribe({
      next: (cita) => {
        this.applyServerAmounts(cita);

        if (cita.status === 'Confirmed' || cita.status === 'Completed') {
          this.verifying = false;
          this.receiptAvailable = true;
          this.setStatus('approved');
        } else if (cita.status === 'Canceled' || cita.status === 'Payment_Failed') {
          this.verifying = false;
          this.setStatus('failure');
        } else if (mpStatus === 'approved' && attempt < this.maxVerifyAttempts) {
          // MP ya aprobó pero el webhook aún no confirma la cita: reintentamos
          this.setStatus('pending');
          this.verifyTimer = setTimeout(() => this.verifyWithServer(mpStatus, attempt + 1), this.verifyDelayMs);
        } else {
          this.verifying = false;
          this.setStatus(this.status === 'failure' ? 'failure' : 'pending');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('No se pudo verificar el estado de la cita:', err);
        this.verifying = false;
        // Sin confirmación del servidor nunca se muestra como pagado
        if (this.status === 'approved') this.setStatus('pending');
        this.cdr.detectChanges();
      }
    });
  }

  /** Usa los montos calculados por el servidor para el resumen y el comprobante. */
  private applyServerAmounts(cita: any): void {
    if (!this.pagoInfo || typeof cita?.price !== 'number' || typeof cita?.amountExpected !== 'number') return;
    this.pagoInfo = {
      ...this.pagoInfo,
      totalPrice: cita.price,
      paidAmount: cita.amountExpected,
      pendingBalance: cita.price - cita.amountExpected,
      paymentMode: cita.paymentMode === 'partial' ? 'Pago Parcial (Anticipo 50%)' : 'Pago Completo (100%)'
    };
  }

  /**
   * Generación y Descarga de Comprobante Oficial en PDF (CDONE-61 & CDONE-64)
   */
  downloadReceipt(): void {
    // Solo hay comprobante cuando el servidor confirmó el pago
    if (!this.receiptAvailable || !this.pagoInfo) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const info = this.pagoInfo;

    // Folio: el ID real del pago en Mercado Pago o, si no vino en la URL, el de la cita
    const folio = this.paymentId || `CITA-${String(info.appointmentId).slice(-8)}`;

    // 1. ENCABEZADO INSTITUCIONAL
    doc.setFillColor(29, 53, 87); // Azul marino elegante (#1d3557)
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('CLÍNICA DENTAL ONE', 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Centro de Alta Especialidad y Estética Odontológica', 14, 25);
    doc.text('Blvd. Adolfo López Mateos 101, CDMX · Tel: (55) 1234-5678 · dentalone.com', 14, 32);

    // Badge COMPROBANTE
    doc.setFillColor(69, 123, 157); // #457b9d
    doc.roundedRect(138, 10, 58, 22, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DIGITAL', 144, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Folio: #${folio}`, 144, 25);

    // 2. DETALLES DE TRANSACCIÓN Y ESTADO
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE OFICIAL DE RESERVACIÓN Y PAGO', 14, 52);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    const fechaEmision = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    doc.text(`Fecha de emisión: ${fechaEmision}`, 14, 58);

    // Banner de estado
    if (this.status === 'approved') {
      doc.setFillColor(220, 252, 231); // Verde claro
      doc.roundedRect(14, 63, 182, 10, 2, 2, 'F');
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.text('✓ TRANSACCIÓN APROBADA - CITA CONFIRMADA EN SISTEMA', 20, 69.5);
    } else {
      doc.setFillColor(254, 249, 195);
      doc.roundedRect(14, 63, 182, 10, 2, 2, 'F');
      doc.setTextColor(133, 77, 14);
      doc.setFont('helvetica', 'bold');
      doc.text('⏳ TRANSACCIÓN EN PROCESO DE VALIDACIÓN', 20, 69.5);
    }

    // 3. TARJETAS DE DATOS (Paciente y Cita)
    // Caja Paciente
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 78, 88, 38, 3, 3, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL PACIENTE', 20, 86);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${info.patientName || 'N/A'}`, 20, 93);
    doc.text(`Email: ${info.patientEmail || 'N/A'}`, 20, 99);
    doc.text(`Teléfono: ${info.contactNumber || 'N/A'}`, 20, 105);
    doc.text(`ID Cita: ${info.appointmentId || 'Registrada'}`, 20, 111);

    // Caja Cita
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(108, 78, 88, 38, 3, 3, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES DE LA CITA', 114, 86);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Especialista: ${info.doctor || 'Especialista en turno'}`, 114, 93);
    doc.text(`Fecha reservada: ${info.dateTime}`, 114, 99);
    doc.text(`Hora: ${info.hour} hrs`, 114, 105);
    doc.text(`Modalidad: ${info.paymentMode || 'Pago en línea'}`, 114, 111);

    // 4. TABLA DE DESGLOSE FINANCIERO (CDONE-66: Pagos Parciales)
    const tableData = [
      [
        info.treatmentName || 'Tratamiento Odontológico',
        info.paymentMode || 'Pago en línea',
        `$${Number(info.totalPrice || 0).toFixed(2)} MXN`,
        `$${Number(info.paidAmount || 0).toFixed(2)} MXN`,
        `$${Number(info.pendingBalance || 0).toFixed(2)} MXN`
      ]
    ];

    autoTable(doc, {
      head: [['Concepto / Tratamiento', 'Modalidad de Pago', 'Costo Total', 'Monto Pagado', 'Saldo en Clínica']],
      body: tableData,
      startY: 124,
      theme: 'grid',
      headStyles: {
        fillColor: [69, 123, 157],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [31, 41, 55]
      },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 45 },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // 5. CAJA DE TOTALES
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(110, finalY, 86, 32, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Costo Total Tratamiento:', 114, finalY + 8);
    doc.text(`$${Number(info.totalPrice || 0).toFixed(2)} MXN`, 190, finalY + 8, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('Monto Pagado Hoy:', 114, finalY + 16);
    doc.text(`$${Number(info.paidAmount || 0).toFixed(2)} MXN`, 190, finalY + 16, { align: 'right' });

    doc.setTextColor(info.pendingBalance > 0 ? 220 : 71, info.pendingBalance > 0 ? 38 : 85, info.pendingBalance > 0 ? 38 : 105);
    doc.text('Saldo Pendiente en Clínica:', 114, finalY + 24);
    doc.text(`$${Number(info.pendingBalance || 0).toFixed(2)} MXN`, 190, finalY + 24, { align: 'right' });

    // 6. POLÍTICAS Y SELLO DIGITAL
    const termsY = finalY + 42;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('TÉRMINOS Y POLÍTICAS DE CONSULTA:', 14, termsY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('• Por favor acuda con 10 minutos de anticipación a su horario citado.', 14, termsY + 5);
    doc.text('• Si seleccionó Pago Parcial (Anticipo 50%), el saldo restante se liquidará en caja el día de su consulta.', 14, termsY + 10);
    doc.text('• Las cancelaciones o cambios de horario deben solicitarse con al menos 24 horas de anticipación.', 14, termsY + 15);

    // Sello Digital Simulado
    doc.setDrawColor(203, 213, 225);
    doc.line(14, termsY + 24, 196, termsY + 24);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`SELLO DIGITAL DE CERTIFICACIÓN DENTAL ONE: SHA256-${btoa(folio + (info.appointmentId || '')).slice(0, 36)}`, 14, termsY + 30);
    doc.text('Este documento digital tiene validez como comprobante oficial de pago y reservación en Clínica Dental ONE.', 14, termsY + 35);

    doc.save(`Comprobante_Pago_${folio}.pdf`);

    Swal.fire({
      icon: 'success',
      title: 'Comprobante Descargado',
      text: `Se ha generado el archivo Comprobante_Pago_${folio}.pdf exitosamente.`,
      timer: 2500,
      showConfirmButton: false
    });
  }

  goToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  retryPayment(): void {
    this.router.navigate(['/scheduling']);
  }
}
