import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CalendarService } from '../../services/calendar.service';
import { Day_Cl, Month_Cl } from '../../models/calendar';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { AppointmentsService } from '../../services/appointments.service';
import { ProcedureService } from '../../services/procedure.service';
import { Appointment } from '../../models/appointment';
import { format, getDay } from 'date-fns';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar implements OnInit {

  // --- VARIABLES ---
  isAdmin = false;
  currentMonthCal!: Month_Cl | null;
  hours!: Array<string>;
  periodSelected!: { startDay: string, endDay: string };
  currentAppointments: Array<Appointment> = [];
  appointmentsMap: Array<Array<Appointment | null>> = [];

  // --- MODAL DE PROCEDIMIENTO (solo admin) ---
  showProcedureModal = false;
  selectedAppointment: any = null;
  savingProcedure = false;
  loadingHistory = false;
  patientHistory: any[] = [];
  procForm = {
    dentista: '',
    fecha: '',
    procedimientos: '',
    descripcion: '',
    indicaciones: '',
    costo: null as number | null,
  };
  // ----------------

  constructor(
    public calendarService: CalendarService,
    public userService: UserService,
    private appointmentsService: AppointmentsService,
    private procedureService: ProcedureService,
    private routerViews: Router,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Verificar sesión
    if (!this.userService.isLoggedIn()) {
      this.routerViews.navigate(['/']);
      return;
    }

    // 2. Determinar si es Admin
    const user = this.userService.userLogged();
    this.isAdmin = user?.isAdmin || false;

    // 3. Cargar citas + horas bloqueadas desde el backend
    this.reloadCalendar();
  }

  /** Recarga citas/disponibilidad y repinta el calendario. */
  reloadCalendar(): void {
    this.calendarService.fetchAppointments(this.isAdmin).subscribe({
      next: () => {
        this.initializeCalendarData();
      },
      error: (err) => {
        console.error('Error cargando citas:', err);
        Swal.fire('Error', 'No se pudieron cargar las citas', 'error');
      }
    });
  }

  /**
   * Lógica de inicialización visual del calendario
   */
  private initializeCalendarData(): void {
    const currentMonth = this.calendarService.selectedMonth;
    const currentYear = this.calendarService.selectedYear;

    // 1. Generar mes
    this.currentMonthCal = this.calendarService.getNewMonth(currentMonth, currentYear);

    // Encontrar primer día visible
    const firstDay = this.currentMonthCal.daysInMonth.find(d => d.dayNumber !== '') || this.currentMonthCal.daysInMonth[0];

    // 2. Establecer periodo y horas (8:00 a 15:30 = 15.5)
    this.periodSelected = this.calendarService.getWeek(firstDay);
    this.sethoursArray(8, 15.5);

    // 3. Obtener citas del periodo y llenar matriz
    // getApptBetweenPeriod usa los datos que acabamos de cargar en ngOnInit
    this.currentAppointments = this.calendarService.getApptBetweenPeriod();
    this.initializeAppointmentsMap();

    this.cdr.detectChanges();
  }

  /**
   * Genera el array de horas y limpia la matriz
   */
  sethoursArray(startHour: number, finishHour: number): void {
    this.hours = [];
    this.appointmentsMap = [];

    for (let i = startHour; i <= finishHour; i += 0.5) {
      let intHours = Math.floor(i);
      let decimalPart = i - intHours;
      let mConverted = decimalPart * 60;

      let h = (intHours < 10) ? '0' + String(intHours) : String(intHours);
      let m = (mConverted < 10) ? '0' + mConverted.toFixed(0) : mConverted.toFixed(0);

      const text = h + ':' + m;
      this.hours.push(text);

      const daysArray: Array<Appointment | null> = new Array(7).fill(null);
      this.appointmentsMap.push(daysArray);
    }
  }

  /**
   * Mapea las citas lineales a la matriz [Hora][Dia]
   */
  initializeAppointmentsMap(): void {
    if (!this.hours || !this.currentAppointments || this.appointmentsMap.length === 0) return;

    const hourIndexMap = new Map<string, number>();
    this.hours.forEach((h, index) => hourIndexMap.set(h, index));

    this.appointmentsMap = this.appointmentsMap.map(row => row.fill(null));

    this.currentAppointments.forEach(appointment => {
      // Asegurarnos que dateTime sea un objeto Date
      const date = new Date(appointment.dateTime);

      const hour = date.getHours();
      const minutes = date.getMinutes();
      const formattedTime = `${hour < 10 ? '0' : ''}${hour}:${minutes < 10 ? '0' : ''}${minutes}`;

      const hourIndex = hourIndexMap.get(formattedTime);
      const dayIndex = getDay(date); // 0=Domingo ... 6=Sabado

      if (hourIndex !== undefined && dayIndex >= 0 && dayIndex < 7) {
        const slots = Math.ceil(appointment.durationMinutes / 30);

        for (let i = 0; i < slots; i++) {
          const slotIndex = hourIndex + i;

          if (slotIndex < this.appointmentsMap.length) {
            if (this.appointmentsMap[slotIndex][dayIndex] === null) {
              this.appointmentsMap[slotIndex][dayIndex] = appointment;
            } else {
              // Solapamiento visual detectado
            }
          }
        }
      }
    });
  }

  // --- LÓGICA DE NAVEGACIÓN ---

  changeMonth(next: Boolean): void {
    this.currentMonthCal = null;

    if (next) {
      this.calendarService.selectedMonth++;
      if (this.calendarService.selectedMonth > 11) {
        this.calendarService.selectedMonth = 0;
        this.calendarService.selectedYear++;
      }
    } else {
      this.calendarService.selectedMonth--;
      if (this.calendarService.selectedMonth < 0) {
        this.calendarService.selectedMonth = 11;
        this.calendarService.selectedYear--;
      }
    }

    this.initializeCalendarData();
    this.cdr.detectChanges();
  }

  selectDay(day: Day_Cl): void {
    if (day.dayNumber == '') return;

    this.calendarService.selectedDay = Number(day.dayNumber);
    this.periodSelected = this.calendarService.getWeek(day);

    this.currentAppointments = this.calendarService.getApptBetweenPeriod();
    this.sethoursArray(day.startDay, day.endDay);
    this.initializeAppointmentsMap();

    this.cdr.detectChanges();
  }

  // --- LÓGICA DE AGENDAMIENTO ---

  // 1. Recibimos la hora (string) y el objeto Day_Cl completo
  scheduleAppointment(hour: string, dayObj: Day_Cl): void {

    // Si por alguna razón hacen clic en un espacio vacío del calendario, lo ignoramos
    if (!dayObj.formattedDate) {
      return;
    }

    Swal.fire({
      title: '¿Confirmar Agendamiento?',
      // Usamos el getter formattedDate para mostrar la fecha exacta (Ej: 2026-05-08)
      html: `¿Desea confirmar la cita para el <strong>${dayObj.formattedDate}</strong> a las <strong>${hour}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#005bb5', // Ajustado al azul de tu diseño
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.handleScheduling(hour, dayObj);
      }
    });
  }

  // 2. Guardamos la información limpia en el LocalStorage
  handleScheduling(hour: string, dayObj: Day_Cl): void {

    // Ya no necesitamos expresiones regulares (replace) ni adivinar el año/mes.
    // El objeto Day_Cl ya tiene todo calculado perfectamente.
    let cita = {
      hour: hour,
      dayInWeek: dayObj.dayOfWeek,
      fullDate: dayObj.formattedDate // YYYY-MM-DD
    };

    localStorage.setItem('cita', JSON.stringify(cita));
    this.router.navigate(['/scheduling']);
    this.cdr.detectChanges();
  }


  // --- GETTERS & HELPERS ---

  formatTime(date: Date | string): string {
    return format(new Date(date), 'HH:mm');
  }

  formatFullDateTime(date: Date | string): string {
    return format(new Date(date), 'EEE dd/MM HH:mm');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Confirmed': return 'green';
      case 'Scheduled': return 'yellow';
      case 'Completed': return 'blue';
      case 'Canceled': return 'red';
      case 'Payment_Failed': return 'red';
      case 'Payment_Pending': return 'yellow';
      case 'Pending_Clinic_Payment': return 'yellow'; // pendiente de pago en clínica
      default: return 'gray';
    }
  }

  // --- FUNCIÓN PARA OBTENER EL DÍA EXACTO DE LA TABLA ---
  getDayObjectForColumn(indDay: number): Day_Cl {
    const year = this.calendarService.selectedYear;
    const month = this.calendarService.selectedMonth;
    // Si no hay un día seleccionado aún, usamos el día 1 por defecto
    const selectedDay = this.calendarService.selectedDay || 1;

    // Fecha base sobre la que estamos parados en el calendario
    const baseDate = new Date(year, month, selectedDay);

    // Calculamos la diferencia entre la columna seleccionada y el día actual
    const diff = indDay - baseDate.getDay();

    // Creamos la fecha objetivo (JS suma y resta días mágicamente cruzando meses y años si es necesario)
    const targetDate = new Date(year, month, selectedDay + diff);

    // Retornamos un objeto Day_Cl "al vuelo" para que todo nuestro sistema lo entienda a la perfección
    return new Day_Cl(
      targetDate.getDate(),
      targetDate.getMonth(),
      targetDate.getFullYear(),
      targetDate.getDay(),
      false,
      false,
      []
    );
  }

  // ============================================
  // MODAL DE PROCEDIMIENTO (solo admin / dentista)
  // ============================================

  /** Abre el modal para registrar el procedimiento de la cita seleccionada. */
  openProcedureModal(appointment: any): void {
    if (!this.userService.userLogged()?.isAdmin || !appointment) return;

    this.selectedAppointment = appointment;

    // Prellenamos la fecha de la cita (YYYY-MM-DD) y el dentista
    const d = new Date(appointment.dateTime);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    this.procForm = {
      dentista: appointment.providerName || '',
      fecha: `${yyyy}-${mm}-${dd}`,
      procedimientos: '',
      descripcion: '',
      indicaciones: '',
      costo: null,
    };

    // Cargamos el historial del paciente (si la cita tiene paciente registrado)
    this.patientHistory = [];
    const pid = appointment.patientId;
    if (pid) {
      this.loadingHistory = true;
      this.procedureService.getPatientProcedures(pid).subscribe({
        next: (data) => {
          this.patientHistory = data || [];
          this.loadingHistory = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingHistory = false;
          this.cdr.detectChanges();
        },
      });
    }

    this.showProcedureModal = true;
    this.cdr.detectChanges();
  }

  closeProcedureModal(): void {
    this.showProcedureModal = false;
    this.selectedAppointment = null;
    this.patientHistory = [];
    this.cdr.detectChanges();
  }

  // ============================================
  // ESTADO / CANCELACIÓN / BLOQUEO (admin)
  // ============================================

  /** Etiqueta legible del estado (solo se muestra al admin). */
  statusLabel(status: string): string {
    switch (status) {
      case 'Scheduled': return 'Agendada';
      case 'Confirmed': return 'Pagada';
      case 'Completed': return 'Completada';
      case 'Canceled': return 'Cancelada';
      case 'Payment_Pending': return 'Pago pendiente';
      case 'Payment_Failed': return 'Pago fallido';
      case 'Pending_Clinic_Payment': return 'Pago en clínica';
      default: return status;
    }
  }

  /** Una cita es cancelable por el admin si NO está pagada ni completada. */
  isCancellable(status: string): boolean {
    return !['Confirmed', 'Completed', 'Canceled'].includes(status);
  }

  /** Cancela la cita seleccionada en el modal (solo no pagadas). */
  cancelSelectedAppointment(): void {
    const appt = this.selectedAppointment;
    if (!appt?._id) return;

    Swal.fire({
      title: '¿Cancelar esta cita?',
      html: `<p>${appt.patientName} · ${this.formatFullDateTime(appt.dateTime)}</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No',
      confirmButtonColor: '#c94040',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.calendarService.cancelAppointment(appt._id).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Cita cancelada', timer: 1500, showConfirmButton: false });
          this.closeProcedureModal();
          this.reloadCalendar();
        },
        error: (err) => {
          console.error(err);
          Swal.fire('Error', err?.error?.msg || 'No se pudo cancelar la cita', 'error');
        }
      });
    });
  }

  /** ¿Está bloqueada la celda (hora + columna de día)? */
  isBlocked(hour: string, indDay: number): boolean {
    const dayObj = this.getDayObjectForColumn(indDay);
    return this.calendarService.isBlocked(dayObj.formattedDate || '', hour);
  }

  /** Bloquea o desbloquea una hora del día (admin). */
  toggleBlockSlot(hour: string, indDay: number): void {
    const dayObj = this.getDayObjectForColumn(indDay);
    const date = dayObj.formattedDate || '';
    const blocked = this.calendarService.isBlocked(date, hour);

    if (blocked) {
      Swal.fire({
        title: '¿Desbloquear esta hora?',
        text: `${date} a las ${hour}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Desbloquear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#457b9d',
      }).then((r) => {
        if (!r.isConfirmed) return;
        this.calendarService.unblockSlot(date, hour).subscribe({
          next: () => this.reloadCalendar(),
          error: (err) => { console.error(err); Swal.fire('Error', 'No se pudo desbloquear', 'error'); }
        });
      });
    } else {
      Swal.fire({
        title: '¿Bloquear esta hora?',
        text: `${date} a las ${hour} — los pacientes no podrán agendar.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Bloquear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#c94040',
      }).then((r) => {
        if (!r.isConfirmed) return;
        this.calendarService.blockSlot(date, hour).subscribe({
          next: () => this.reloadCalendar(),
          error: (err) => { console.error(err); Swal.fire('Error', 'No se pudo bloquear', 'error'); }
        });
      });
    }
  }

  /** Modal para bloquear/desbloquear un RANGO de horas en una fecha (admin). */
  openBlockRangeModal(): void {
    // Prellenamos con el día seleccionado
    const y = this.calendarService.selectedYear;
    const m = String(this.calendarService.selectedMonth + 1).padStart(2, '0');
    const d = String(this.calendarService.selectedDay || 1).padStart(2, '0');
    const defaultDate = `${y}-${m}-${d}`;

    Swal.fire({
      title: 'Bloquear rango de horas',
      html:
        `<div style="text-align:left; font-size:14px;">` +
        `<label style="display:block; margin:6px 0 2px;">Fecha</label>` +
        `<input id="rng-date" type="date" class="swal2-input" style="margin:0 0 8px; width:100%;" value="${defaultDate}">` +
        `<label style="display:block; margin:6px 0 2px;">Desde</label>` +
        `<input id="rng-start" type="time" step="1800" class="swal2-input" style="margin:0 0 8px; width:100%;" value="08:00">` +
        `<label style="display:block; margin:6px 0 2px;">Hasta</label>` +
        `<input id="rng-end" type="time" step="1800" class="swal2-input" style="margin:0; width:100%;" value="10:00">` +
        `<p style="color:#888; font-size:12px; margin-top:8px;">Se bloquean las horas desde "Desde" (incluida) hasta "Hasta" (excluida).</p>` +
        `</div>`,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Bloquear rango',
      denyButtonText: 'Desbloquear rango',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c94040',
      denyButtonColor: '#457b9d',
      focusConfirm: false,
      preConfirm: () => this.readRangeInputs(),
      preDeny: () => this.readRangeInputs(),
    }).then((result) => {
      const data: any = result.value;
      if (!data) return;

      if (result.isConfirmed) {
        this.calendarService.blockRange(data.date, data.startHour, data.endHour).subscribe({
          next: (res: any) => {
            Swal.fire({ icon: 'success', title: 'Listo', text: res?.msg || 'Rango bloqueado.', timer: 1800, showConfirmButton: false });
            this.reloadCalendar();
          },
          error: (err) => { console.error(err); Swal.fire('Error', err?.error?.msg || 'No se pudo bloquear el rango', 'error'); }
        });
      } else if (result.isDenied) {
        this.calendarService.unblockRange(data.date, data.startHour, data.endHour).subscribe({
          next: (res: any) => {
            Swal.fire({ icon: 'success', title: 'Listo', text: res?.msg || 'Rango desbloqueado.', timer: 1800, showConfirmButton: false });
            this.reloadCalendar();
          },
          error: (err) => { console.error(err); Swal.fire('Error', err?.error?.msg || 'No se pudo desbloquear el rango', 'error'); }
        });
      }
    });
  }

  /** Lee y valida los inputs del modal de rango. */
  private readRangeInputs(): any {
    const date = (document.getElementById('rng-date') as HTMLInputElement)?.value;
    const startHour = (document.getElementById('rng-start') as HTMLInputElement)?.value;
    const endHour = (document.getElementById('rng-end') as HTMLInputElement)?.value;

    if (!date || !startHour || !endHour) {
      Swal.showValidationMessage('Completa fecha, hora inicial y final.');
      return false;
    }
    if (endHour <= startHour) {
      Swal.showValidationMessage('La hora final debe ser mayor que la inicial.');
      return false;
    }
    return { date, startHour, endHour };
  }

  /** Guarda el procedimiento ligado a la cita y al paciente. */
  saveProcedure(): void {
    if (!this.selectedAppointment) return;

    if (!this.procForm.dentista.trim() || !this.procForm.descripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Completa el dentista y la descripción de lo realizado.',
      });
      return;
    }

    const appt = this.selectedAppointment;
    const payload: any = {
      appointmentId: appt._id,
      fecha: this.procForm.fecha || undefined,
      dentista: this.procForm.dentista.trim(),
      procedimientos: this.procForm.procedimientos,
      descripcion: this.procForm.descripcion.trim(),
      indicaciones: this.procForm.indicaciones.trim(),
      costo: this.procForm.costo ?? undefined,
    };

    // Resolvemos el paciente por id o, si no hay, por email
    if (appt.patientId) {
      payload.patientId = appt.patientId;
    } else if (appt.email) {
      payload.patientEmail = appt.email;
    }

    this.savingProcedure = true;
    this.cdr.detectChanges();

    this.procedureService.createProcedure(payload).subscribe({
      next: () => {
        this.savingProcedure = false;
        Swal.fire({
          icon: 'success',
          title: 'Registrado',
          text: 'El procedimiento se guardó correctamente.',
          timer: 2000,
          showConfirmButton: false,
        });
        this.closeProcedureModal();
      },
      error: (err) => {
        this.savingProcedure = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.msg || 'No se pudo registrar el procedimiento. Verifica que el paciente esté registrado.',
        });
        this.cdr.detectChanges();
      },
    });
  }
}