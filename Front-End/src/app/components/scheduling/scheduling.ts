import { Component, effect, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { HttpClient } from '@angular/common/http';

import Swal from 'sweetalert2';
import { ScheduleService } from '../../services/schedule.service';

interface TreatmentOption {
  reason: string;
  duration: number;
  assignDoctor: string;
  price: number;
  description?: string;
}

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './scheduling.html',
  styleUrl: './scheduling.css'
})
export class Scheduling implements OnInit {

  //private urlScheduling = 'https://dental-one-final.onrender.com/api/register/appointment';
  private urlScheduling = "http://localhost:3000/api/register/appointment"
  //private profileUrl = 'https://dental-one-final.onrender.com/api/user/profile';
  private profileUrl = "http://localhost:3000/api/user/profile"

  // Gate de pago según el tipo de paciente
  patientType: string | null = null;
  canPayAtClinic = false;

  availableHours: string[] = [];
  schedulForm!: FormGroup;
  isFormReady = false;

  scheduleStatus = [
    { value: 'Scheduled' },
    { value: 'Confirmed' },
    { value: 'Canceled' },
    { value: 'Completed' },
  ];

  reasonSchedule: TreatmentOption[] = [
    {
      reason: 'Cita de valoración',
      duration: 30,
      assignDoctor: 'Dra. Elena Sonrisa',
      price: 950,
      description: 'Incluye: valoración del estado de salud bucal general, toma de imágenes en zonas problema y toma radiográfica de ser necesario.'
    },
    { reason: 'Restauraciones', duration: 60, assignDoctor: 'Dr. Roberto Molar', price: 950 },
    { reason: 'Limpieza Dental y Revisión General', duration: 45, assignDoctor: 'Dra. Elena Sonrisa', price: 600 },
    { reason: 'Resina (Empaste por caries)', duration: 60, assignDoctor: 'Dr. Roberto Molar', price: 850 },
    { reason: 'Ajuste de Brackets (Ortodoncia)', duration: 20, assignDoctor: 'Dra. Sofía Frenillos', price: 500 },
    { reason: 'Extracción Simple / Muela', duration: 45, assignDoctor: 'Dr. Roberto Molar', price: 1200 },
    { reason: 'Blanqueamiento Dental', duration: 60, assignDoctor: 'Dra. Elena Sonrisa', price: 2500 },
    { reason: 'Endodoncia (Tratamiento de conducto)', duration: 90, assignDoctor: 'Dr. Carlos Raíz', price: 3800 },
    { reason: 'Valoración para Implante', duration: 30, assignDoctor: 'Dr. Javier Cirujano', price: 300 },
    { reason: 'Urgencia Dental (Dolor agudo)', duration: 30, assignDoctor: 'Dra. Elena Sonrisa', price: 500 }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private routerSchedule: Router,
    public userService: UserService,
    private http: HttpClient,
    private scheduleService: ScheduleService
  ) {
    // 1. Generamos horas
    this.generateTimeSlots();

    //Effect SOLO para inyectar los datos del usuario una vez que el form existe
    effect(() => {
      const user = this.userService.userLogged();

      if (user && this.schedulForm) {
        const nombreCompleto = user.name ? `${user.name} ${user.lastname || ''}`.trim() : '';

        // PatchValue actualiza los campos sin reconstruir el formulario
        this.schedulForm.patchValue({
          patientName: nombreCompleto,
          patientId: user.idUser || user.idUser || '',
          contactNumber: user.phone || '',
          email: user.email || ''
        });
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    if (!this.userService.isLoggedIn()) {
      this.routerSchedule.navigate(['/']);
      return;
    }

    // 3. Inicializamos el formulario de manera síncrona INMEDIATAMENTE
    this.initializeFormSync();

    // 4. Cargamos el tipo de paciente para decidir las opciones de pago
    this.fetchPaymentEligibility();
  }

  /** Lee el perfil para saber si el paciente puede pagar en la clínica. */
  fetchPaymentEligibility(): void {
    this.http.get<any>(this.profileUrl).subscribe({
      next: (profile) => {
        this.patientType = profile?.patientType ?? null;
        this.canPayAtClinic = !!profile?.canPayAtClinic;
      },
      error: (err) => {
        // Si no se puede leer, por UX dejamos elegir (no forzamos en línea)
        console.error('No se pudo obtener el perfil para el pago:', err);
      }
    });
  }

  generateTimeSlots(): void {
    const startHour = 8;
    const endHour = 16;
    for (let hour = startHour; hour <= endHour; hour++) {
      const hourString = hour.toString().padStart(2, '0');
      this.availableHours.push(`${hourString}:00`);
      if (hour < endHour) {
        this.availableHours.push(`${hourString}:30`);
      }
    }
  }

  /**
   * Inicializa el formulario al instante leyendo el localStorage
   */
  initializeFormSync(): void {

    // A. FECHA POR DEFECTO (HOY)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    let preSelectedDate = `${yyyy}-${mm}-${dd}`;

    // B. REVISAR LOCALSTORAGE
    let preSelectedHour = '';
    const citaStorage = localStorage.getItem('cita');

    if (citaStorage) {
      try {
        const citaObj = JSON.parse(citaStorage);

        if (citaObj.hour && this.availableHours.includes(citaObj.hour)) {
          preSelectedHour = citaObj.hour;
        }

        console.log(citaObj)

        // Extraer la fecha del calendario si existe
        if (citaObj.fullDate) {
          preSelectedDate = citaObj.fullDate;
        }
      } catch (e) {
        console.error('Error leyendo cita del storage', e);
      }
    }

    // C. CONSTRUIR FORMULARIO SÍNCRONAMENTE
    this.schedulForm = this.formBuilder.group({
      dateTime: [preSelectedDate, [Validators.required]],
      hour: [preSelectedHour, [Validators.required]],
      durationMinutes: [this.reasonSchedule[0].duration, [Validators.required, Validators.min(1)]],

      // Se inician vacíos, el effect() los llenará milisegundos después
      patientName: ['', [Validators.required, Validators.minLength(2)]],
      patientId: ['', []],
      contactNumber: ['', [Validators.required]],
      email: ['', [Validators.required]],

      reason: [this.reasonSchedule[0].reason, [Validators.required, Validators.minLength(5)]],
      providerName: [this.reasonSchedule[0].assignDoctor, [Validators.required]],
      status: ['Scheduled', [Validators.required]],
      notes: ['', []],
    });

    // D. Mostrar el HTML ahora que el form está 100% construido
    this.isFormReady = true;
  }

  changeValue(event: Event): void {
    const target: HTMLSelectElement = event.target as HTMLSelectElement;
    const selected = this.reasonSchedule.find(rS => rS.reason === target.value);

    this.schedulForm.patchValue({
      durationMinutes: selected?.duration,
      reason: selected?.reason,
      providerName: selected?.assignDoctor
    });
  }

  submitSchedule(): void {
    if (this.schedulForm.invalid) {
      this.schedulForm.markAllAsTouched();
      Swal.fire({
        icon: 'error',
        title: 'Formulario Incompleto',
        text: 'Por favor, completa los campos requeridos.',
      });
      return;
    }

    const formData = this.schedulForm.getRawValue();
    const selectedTreatment = this.reasonSchedule.find(item => item.reason === formData.reason);

    if (!selectedTreatment) {
      Swal.fire('Error', 'El tratamiento seleccionado no es válido', 'error');
      return;
    }

    // Paciente NUEVO que aún no paga su primera cita => pago en línea obligatorio
    const mustPayOnline = this.patientType === 'new' && !this.canPayAtClinic;

    const detalleHtml = `
      <div style="text-align: left; font-size: 15px; line-height: 1.6;">
        <p><strong>Tratamiento:</strong> ${selectedTreatment.reason}</p>
        ${selectedTreatment.description ? `<p style="color:#555; font-size:14px;">${selectedTreatment.description}</p>` : ''}
        <p><strong>Especialista:</strong> ${selectedTreatment.assignDoctor}</p>
        <p><strong>Duración:</strong> ${selectedTreatment.duration} min</p>
        <hr>
        <p style="font-size: 18px;"><strong>Total: $${selectedTreatment.price} MXN</strong></p>
      </div>
    `;

    if (mustPayOnline) {
      // Sin opción de clínica: solo pago en línea
      Swal.fire({
        title: 'Confirmar y Pagar',
        html: detalleHtml +
          `<p style="color:#457b9d; font-size:13px; margin-top:8px;">Como paciente nuevo, tu primera cita se paga en línea.</p>`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: `Pagar $${selectedTreatment.price}`,
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#009ee3',
      }).then((result) => {
        if (result.isConfirmed) this.payOnline(formData, selectedTreatment);
      });
    } else {
      // Paciente recurrente (o nuevo que ya pagó): puede elegir
      Swal.fire({
        title: 'Confirmar cita',
        html: detalleHtml,
        icon: 'info',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: `Pagar en línea $${selectedTreatment.price}`,
        denyButtonText: 'Pagar en la clínica',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#009ee3',
        denyButtonColor: '#457b9d',
      }).then((result) => {
        if (result.isConfirmed) this.payOnline(formData, selectedTreatment);
        else if (result.isDenied) this.payAtClinic(formData, selectedTreatment);
      });
    }
  }

  /** Crea la cita y redirige al checkout de Mercado Pago. */
  private payOnline(formData: any, selectedTreatment: TreatmentOption): void {
    Swal.fire({
      title: 'Procesando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // 1. Creamos la cita en la base de datos
    this.http.post(this.urlScheduling, formData).subscribe({
      next: (saveRes: any) => {
        // 2. Tomamos el ID de la cita recién creada
        const appointmentId = saveRes.appointment._id;

        // 3. Generamos la orden de pago en Mercado Pago
        this.scheduleService.processPay(selectedTreatment.reason, selectedTreatment.price, appointmentId).subscribe({
          next: (payRes: any) => {
            if (!payRes.init_point) {
              Swal.fire('Error', 'No se recibió el link de pago', 'error');
              return;
            }
            localStorage.removeItem('cita');
            window.location.href = payRes.init_point;
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'No se pudo generar la orden de pago', 'error');
          }
        });
      },
      error: (err) => {
        console.error(err);
        if (err.status === 409) {
          Swal.fire('Horario no disponible', err.error.msg, 'warning');
        } else {
          Swal.fire('Error', 'No se pudo registrar la cita', 'error');
        }
      }
    });
  }

  /** Crea la cita sin pago en línea; el cobro se hace en la clínica. */
  private payAtClinic(formData: any, selectedTreatment: TreatmentOption): void {
    Swal.fire({
      title: 'Agendando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Estado propio + nota de que el pago será en la clínica
    const payload = {
      ...formData,
      status: 'Pending_Clinic_Payment',
      notes: `${formData.notes ? formData.notes + ' · ' : ''}Pago en clínica`
    };

    this.http.post(this.urlScheduling, payload).subscribe({
      next: () => {
        localStorage.removeItem('cita');
        Swal.fire({
          icon: 'success',
          title: 'Cita agendada',
          text: `Tu cita quedó registrada. El pago de $${selectedTreatment.price} MXN se realizará directamente en la clínica.`,
          confirmButtonText: 'Entendido'
        }).then(() => this.routerSchedule.navigate(['/calendar']));
      },
      error: (err) => {
        console.error(err);
        if (err.status === 409) {
          Swal.fire('Horario no disponible', err.error.msg, 'warning');
        } else {
          Swal.fire('Error', 'No se pudo registrar la cita', 'error');
        }
      }
    });
  }
}