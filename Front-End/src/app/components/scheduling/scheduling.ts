import { ChangeDetectorRef, Component, effect, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { HttpClient } from '@angular/common/http';

import Swal from 'sweetalert2';
import { ScheduleService } from '../../services/schedule.service';
import { environment } from '../../../environments/environment';

export interface TreatmentOption {
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

  private urlScheduling = `${environment.apiUrl}/api/register/appointment`;
  private profileUrl = `${environment.apiUrl}/api/user/profile`;
  private treatmentsUrl = `${environment.apiUrl}/api/treatments`;

  // Gate de pago según el tipo de paciente (CDONE-59)
  patientType: string | null = null;
  canPayAtClinic = false;

  // Modalidad de pago seleccionada: 'full' (100%), 'partial' (50% anticipo), 'clinic' (CDONE-66)
  selectedPaymentMode: 'full' | 'partial' | 'clinic' = 'full';

  availableHours: string[] = [];
  schedulForm!: FormGroup;
  isFormReady = false;

  scheduleStatus = [
    { value: 'Scheduled' },
    { value: 'Confirmed' },
    { value: 'Canceled' },
    { value: 'Completed' },
  ];

  // Catálogo de tratamientos: se carga del backend (GET /api/treatments), que es
  // quien define precio y duración. El cobro real también se calcula en el servidor.
  reasonSchedule: TreatmentOption[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private routerSchedule: Router,
    public userService: UserService,
    private http: HttpClient,
    private scheduleService: ScheduleService,
    private cdr: ChangeDetectorRef
  ) {
    this.generateTimeSlots();

    effect(() => {
      const user = this.userService.userLogged();

      if (user && this.schedulForm) {
        const nombreCompleto = user.name ? `${user.name} ${user.lastname || ''}`.trim() : '';

        this.schedulForm.patchValue({
          patientName: nombreCompleto,
          patientId: user.idUser || '',
          contactNumber: user.phone || '',
          email: user.email || ''
        });
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.initializeFormSync();
    this.loadTreatments();
    this.fetchPaymentEligibility();
    this.fetchPatientDetails();
  }

  /** Carga el catálogo de tratamientos del backend y muestra el formulario. */
  loadTreatments(): void {
    this.http.get<TreatmentOption[]>(this.treatmentsUrl).subscribe({
      next: (treatments) => {
        this.reasonSchedule = treatments || [];
        const first = this.reasonSchedule[0];
        if (first && !this.schedulForm.get('reason')?.value) {
          this.schedulForm.patchValue({
            reason: first.reason,
            durationMinutes: first.duration,
            providerName: first.assignDoctor
          });
        }
        this.isFormReady = this.reasonSchedule.length > 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('No se pudo cargar el catálogo de tratamientos:', err);
        Swal.fire('Error', 'No se pudo cargar la lista de tratamientos. Intenta de nuevo más tarde.', 'error');
      }
    });
  }

  fetchPatientDetails(): void {
    this.http.get<any>(`${environment.apiUrl}/api/get/patientDetails`).subscribe({
      next: (details) => {
        if (details && details.numcel) {
          this.schedulForm.patchValue({ contactNumber: details.numcel });
        }
      },
      error: (err) => console.error('No se pudo obtener el patientDetails:', err)
    });
  }

  fetchPaymentEligibility(): void {
    this.http.get<any>(this.profileUrl).subscribe({
      next: (profile) => {
        this.patientType = profile?.patientType ?? null;
        this.canPayAtClinic = profile?.canPayAtClinic === true;

        // Si no puede pagar en clínica, asegurar que no esté seleccionada esa opción
        if (!this.canPayAtClinic && this.selectedPaymentMode === 'clinic') {
          this.selectedPaymentMode = 'full';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
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

  initializeFormSync(): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    let preSelectedDate = `${yyyy}-${mm}-${dd}`;

    let preSelectedHour = '';
    const citaStorage = localStorage.getItem('cita');

    if (citaStorage) {
      try {
        const citaObj = JSON.parse(citaStorage);
        if (citaObj.hour && this.availableHours.includes(citaObj.hour)) {
          preSelectedHour = citaObj.hour;
        }
        if (citaObj.fullDate) {
          preSelectedDate = citaObj.fullDate;
        }
      } catch (e) {
        console.error('Error leyendo cita del storage', e);
      }
    }

    this.schedulForm = this.formBuilder.group({
      dateTime: [preSelectedDate, [Validators.required]],
      hour: [preSelectedHour, [Validators.required]],
      durationMinutes: [null, [Validators.required, Validators.min(1)]],
      patientName: ['', [Validators.required, Validators.minLength(2)]],
      patientId: ['', []],
      contactNumber: ['', [Validators.required]],
      email: ['', [Validators.required]],
      reason: ['', [Validators.required, Validators.minLength(5)]],
      providerName: ['', [Validators.required]],
      status: ['Scheduled', [Validators.required]],
      notes: ['', []],
    });
    // isFormReady se activa cuando llega el catálogo de tratamientos (loadTreatments)
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

  // --- HELPERS PARA CHECKOUT Y PAGOS PARCIALES (CDONE-59 & CDONE-66) ---
  getSelectedTreatment(): TreatmentOption {
    const reason = this.schedulForm?.get('reason')?.value;
    return this.reasonSchedule.find(item => item.reason === reason) || this.reasonSchedule[0];
  }

  getAdvanceAmount(): number {
    return Math.round(this.getSelectedTreatment().price * 0.5);
  }

  getRemainingBalance(): number {
    return this.getSelectedTreatment().price - this.getAdvanceAmount();
  }

  selectPaymentMode(mode: 'full' | 'partial' | 'clinic'): void {
    // Sin permiso explícito (paciente nuevo o tipo aún sin elegir) no se puede pagar en clínica;
    // el backend también lo valida.
    if (mode === 'clinic' && !this.canPayAtClinic) {
      Swal.fire({
        icon: 'info',
        title: 'Primera cita en línea',
        text: 'Como paciente nuevo, tu primera consulta requiere pago en línea (Total o Anticipo del 50%). Una vez completada, podrás pagar directamente en clínica.',
        confirmButtonColor: '#009ee3'
      });
      return;
    }
    this.selectedPaymentMode = mode;
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

    const selectedDate = new Date(formData.dateTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha no válida',
        text: 'No puedes agendar citas en fechas anteriores a hoy.',
        confirmButtonColor: '#457b9d'
      });
      return;
    }

    const dow = selectedDate.getDay();
    if (dow === 0 || dow === 6) {
      Swal.fire({
        icon: 'info',
        title: 'Día no hábil',
        text: 'Los sábados y domingos no son días de atención. Selecciona un día entre lunes y viernes.',
        confirmButtonColor: '#457b9d'
      });
      return;
    }

    const selectedTreatment = this.getSelectedTreatment();

    if (!selectedTreatment) {
      Swal.fire('Error', 'El tratamiento seleccionado no es válido', 'error');
      return;
    }

    // Modal de confirmación de Checkout
    const isPartial = this.selectedPaymentMode === 'partial';
    const isClinic = this.selectedPaymentMode === 'clinic';

    let montoPagar = selectedTreatment.price;
    let balanceRestante = 0;
    let modalTitle = 'Confirmar y Pagar';
    let modalBtnText = `Pagar en línea $${montoPagar} MXN`;

    if (isPartial) {
      montoPagar = this.getAdvanceAmount();
      balanceRestante = this.getRemainingBalance();
      modalTitle = 'Confirmar Pago de Anticipo (50%)';
      modalBtnText = `Pagar Anticipo de $${montoPagar} MXN`;
    } else if (isClinic) {
      modalTitle = 'Confirmar Cita en Clínica';
      modalBtnText = 'Confirmar y Pagar en Clínica';
    }

    const detalleHtml = `
      <div style="text-align: left; font-size: 14.5px; line-height: 1.6; color: #374151;">
        <p><strong>Tratamiento:</strong> ${selectedTreatment.reason}</p>
        <p><strong>Especialista:</strong> ${selectedTreatment.assignDoctor}</p>
        <p><strong>Fecha y Hora:</strong> ${formData.dateTime} a las ${formData.hour} hrs</p>
        <p><strong>Duración estimada:</strong> ${selectedTreatment.duration} min</p>
        <hr style="margin: 12px 0; border: 0; border-top: 1px solid #e5e7eb;">
        <p><strong>Costo Total del Tratamiento:</strong> $${selectedTreatment.price} MXN</p>
        <p style="color: ${isClinic ? '#457b9d' : '#009ee3'}; font-weight: 600;">
          <strong>Modalidad:</strong> ${
            isPartial 
              ? 'Pago Parcial (Anticipo 50%)' 
              : isClinic 
                ? 'Pago Completo en Recepción de Clínica' 
                : 'Pago Total en Línea (100%)'
          }
        </p>
        <p style="font-size: 17px; margin-top: 8px;">
          <strong>Monto a pagar hoy: <span style="color:#009ee3;">$${isClinic ? 0 : montoPagar} MXN</span></strong>
        </p>
        ${isPartial ? `<p style="font-size: 13px; color: #e63946;">Saldo pendiente a liquidar en clínica: $${balanceRestante} MXN</p>` : ''}
      </div>
    `;

    Swal.fire({
      title: modalTitle,
      html: detalleHtml,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: modalBtnText,
      cancelButtonText: 'Regresar',
      confirmButtonColor: isClinic ? '#457b9d' : '#009ee3',
    }).then((result) => {
      if (result.isConfirmed) {
        if (isClinic) {
          this.payAtClinic(formData, selectedTreatment);
        } else {
          this.payOnline(formData, selectedTreatment, isPartial ? 'partial' : 'full', montoPagar, balanceRestante);
        }
      }
    });
  }

  /** Crea la cita y redirige al checkout de Mercado Pago (CDONE-59 & CDONE-66). */
  private payOnline(
    formData: any,
    selectedTreatment: TreatmentOption,
    mode: 'full' | 'partial',
    amountToPay: number,
    remainingBalance: number
  ): void {
    Swal.fire({
      title: 'Generando orden de pago...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // El detalle del cobro lo agrega el backend a las notas al crear el pago
    const payload = { ...formData };

    // 1. Guardamos la cita en la base de datos
    this.http.post(this.urlScheduling, payload).subscribe({
      next: (saveRes: any) => {
        const appointmentId = saveRes.appointment?._id;

        // Guardamos los datos completos de la transacción para emitir comprobante (CDONE-61, CDONE-64)
        const citaPagoInfo = {
          appointmentId: appointmentId || '',
          treatmentName: selectedTreatment.reason,
          doctor: selectedTreatment.assignDoctor,
          patientName: formData.patientName,
          patientEmail: formData.email,
          contactNumber: formData.contactNumber,
          dateTime: formData.dateTime,
          hour: formData.hour,
          totalPrice: selectedTreatment.price,
          paidAmount: amountToPay,
          pendingBalance: remainingBalance,
          paymentMode: mode === 'partial' ? 'Pago Parcial (Anticipo 50%)' : 'Pago Completo (100%)',
          generatedAt: new Date().toISOString()
        };
        localStorage.setItem('citaPagoInfo', JSON.stringify(citaPagoInfo));

        // 2. Generamos la orden de pago en Mercado Pago (el backend calcula el monto)
        this.scheduleService.processPay(appointmentId, mode).subscribe({
          next: (payRes: any) => {
            if (!payRes.init_point) {
              Swal.fire('Error', 'No se recibió el enlace de pago de Mercado Pago', 'error');
              return;
            }
            // Montos confirmados por el servidor para el comprobante
            if (typeof payRes.amount === 'number' && typeof payRes.total === 'number') {
              citaPagoInfo.totalPrice = payRes.total;
              citaPagoInfo.paidAmount = payRes.amount;
              citaPagoInfo.pendingBalance = payRes.total - payRes.amount;
              localStorage.setItem('citaPagoInfo', JSON.stringify(citaPagoInfo));
            }
            localStorage.removeItem('cita');
            window.location.href = payRes.init_point;
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', err.error?.msg || 'No se pudo generar la orden de pago', 'error');
          }
        });
      },
      error: (err) => {
        console.error(err);
        if (err.status === 409) {
          Swal.fire('Horario no disponible', err.error?.msg || 'El horario ya fue reservado.', 'warning');
        } else {
          Swal.fire('Error', 'No se pudo registrar la cita', 'error');
        }
      }
    });
  }

  /** Crea la cita sin pago en línea; el cobro se hace en la clínica. */
  private payAtClinic(formData: any, selectedTreatment: TreatmentOption): void {
    Swal.fire({
      title: 'Agendando cita...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const payload = {
      ...formData,
      status: 'Pending_Clinic_Payment',
      notes: `${formData.notes ? formData.notes + ' · ' : ''}Pago directo en clínica: $${selectedTreatment.price} MXN`
    };

    this.http.post(this.urlScheduling, payload).subscribe({
      next: () => {
        localStorage.removeItem('cita');
        Swal.fire({
          icon: 'success',
          title: 'Cita Agendada con Éxito',
          text: `Tu cita quedó registrada. El pago de $${selectedTreatment.price} MXN se realizará directamente en recepción de la clínica.`,
          confirmButtonText: 'Ver Mis Citas'
        }).then(() => this.routerSchedule.navigate(['/calendar']));
      },
      error: (err) => {
        console.error(err);
        if (err.status === 409) {
          Swal.fire('Horario no disponible', err.error?.msg || 'El horario ya fue reservado.', 'warning');
        } else if (err.status === 403) {
          Swal.fire('Pago en línea requerido', err.error?.msg || 'Tu primera cita debe pagarse en línea.', 'info');
        } else {
          Swal.fire('Error', err.error?.msg || 'No se pudo registrar la cita', 'error');
        }
      }
    });
  }
}
