import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-exitoso.html',
  styleUrl: './pago-exitoso.css'
})
export class PagoExitoso implements OnInit {

  // El estado que Mercado Pago manda como query param (?status=approved)
  status: string = '';
  paymentId: string = '';

  // Mapeamos los posibles estados de MP a mensajes amigables
  readonly estados: Record<string, { icon: string; title: string; text: string; color: string }> = {
    approved: {
      icon: '✅',
      title: '¡Pago exitoso!',
      text: 'Tu cita ha sido confirmada. Recibirás un correo de confirmación en breve.',
      color: '#166534'
    },
    pending: {
      icon: '⏳',
      title: 'Pago en revisión',
      text: 'Tu pago está siendo procesado. Te notificaremos por correo cuando se confirme tu cita.',
      color: '#854d0e'
    },
    failure: {
      icon: '❌',
      title: 'Pago no completado',
      text: 'Hubo un problema al procesar tu pago. Tu cita aún no ha sido confirmada. Puedes intentarlo de nuevo.',
      color: '#991b1b'
    }
  };

  estadoActual = this.estados['pending'];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Mercado Pago regresa con ?collection_status=approved (o payment_status)
    this.status = this.route.snapshot.queryParamMap.get('collection_status')
                || this.route.snapshot.queryParamMap.get('status')
                || 'pending';

    this.paymentId = this.route.snapshot.queryParamMap.get('collection_id')
                   || this.route.snapshot.queryParamMap.get('payment_id')
                   || '';

    this.estadoActual = this.estados[this.status] ?? this.estados['pending'];
  }

  goToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  retryPayment(): void {
    this.router.navigate(['/scheduling']);
  }
}
