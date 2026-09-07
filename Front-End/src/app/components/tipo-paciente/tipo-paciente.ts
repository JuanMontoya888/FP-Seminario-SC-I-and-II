import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tipo-paciente',
  imports: [CommonModule],
  templateUrl: './tipo-paciente.html',
  styleUrl: './tipo-paciente.css',
})
export class TipoPaciente {
  //private apiUrl = 'https://dental-one-final.onrender.com/api/user/patient-type';
  private apiUrl = 'http://localhost:3000/api/user/patient-type';

  saving = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  select(patientType: 'new' | 'returning'): void {
    if (this.saving) return;
    this.saving = true;

    this.http.post(this.apiUrl, { patientType }).subscribe({
      next: () => {
        const msg = patientType === 'new'
          ? 'Como paciente nuevo, tu primera cita se paga en línea al momento de agendarla.'
          : 'Perfecto. Al agendar podrás elegir pagar en línea o directamente en la clínica.';
        Swal.fire({
          icon: 'success',
          title: '¡Gracias!',
          text: msg,
          confirmButtonText: 'Continuar',
        }).then(() => this.router.navigate(['/']));
      },
      error: (err) => {
        console.error('Error al guardar tipo de paciente:', err);
        this.saving = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar tu selección. Intenta de nuevo.',
        });
      },
    });
  }
}
