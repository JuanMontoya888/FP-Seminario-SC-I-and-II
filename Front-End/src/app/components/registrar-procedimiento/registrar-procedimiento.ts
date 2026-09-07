import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ProcedureService } from '../../services/procedure.service';
import { UserService } from '../../services/user.service';
import { Procedure, PacienteOption } from '../../models/procedure';

@Component({
  selector: 'app-registrar-procedimiento',
  imports: [CommonModule, FormsModule],
  templateUrl: './registrar-procedimiento.html',
  styleUrl: './registrar-procedimiento.css',
})
export class RegistrarProcedimiento implements OnInit {
  patients: PacienteOption[] = [];
  patientProcedures: Procedure[] = [];
  loadingHistory = false;
  saving = false;

  // Modelo del formulario
  form = {
    patientId: '',
    fecha: '',
    dentista: '',
    procedimientos: '', // separados por coma
    descripcion: '',
    indicaciones: '',
    costo: null as number | null,
  };

  constructor(
    private procedureService: ProcedureService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Solo el administrador (dentista) puede acceder
    if (!this.userService.userLogged()?.isAdmin) {
      this.router.navigate(['/']);
      return;
    }
    this.form.fecha = this.todayStr();
    this.loadPatients();
  }

  /** Fecha de hoy en formato 'YYYY-MM-DD' (hora local). */
  private todayStr(): string {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }

  loadPatients(): void {
    this.procedureService.getPatients().subscribe({
      next: (data) => {
        this.patients = data || [];
        this.cdr.detectChanges(); // app zoneless: forzar re-render del <select>
      },
      error: (err) => {
        console.error('Error al cargar pacientes:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar la lista de pacientes.' });
      },
    });
  }

  /** Al elegir paciente, carga su historial de procedimientos. */
  onPatientChange(): void {
    if (!this.form.patientId) {
      this.patientProcedures = [];
      return;
    }
    this.loadingHistory = true;
    this.procedureService.getPatientProcedures(this.form.patientId).subscribe({
      next: (data) => {
        this.patientProcedures = data || [];
        this.loadingHistory = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar historial:', err);
        this.loadingHistory = false;
        this.cdr.detectChanges();
      },
    });
  }

  submit(): void {
    if (!this.form.patientId || !this.form.dentista.trim() || !this.form.descripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Selecciona un paciente y completa el dentista y la descripción de lo realizado.',
      });
      return;
    }

    this.saving = true;
    const payload = {
      patientId: this.form.patientId,
      fecha: this.form.fecha || undefined,
      dentista: this.form.dentista.trim(),
      procedimientos: this.form.procedimientos,
      descripcion: this.form.descripcion.trim(),
      indicaciones: this.form.indicaciones.trim(),
      costo: this.form.costo ?? undefined,
    };

    this.procedureService.createProcedure(payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Registrado',
          text: 'El procedimiento se guardó correctamente.',
          timer: 2000,
          showConfirmButton: false,
        });
        this.saving = false;
        // Limpiamos los campos del procedimiento (mantenemos el paciente seleccionado)
        this.form.fecha = this.todayStr();
        this.form.procedimientos = '';
        this.form.descripcion = '';
        this.form.indicaciones = '';
        this.form.costo = null;
        // Refrescamos el historial del paciente
        this.onPatientChange();
      },
      error: (err) => {
        console.error('Error al registrar procedimiento:', err);
        this.saving = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.msg || 'No se pudo registrar el procedimiento.',
        });
      },
    });
  }
}
