import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

const API = 'http://localhost:3000/api';

@Component({
  selector: 'app-expediente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './expediente.html',
  styleUrl: './expediente.css'
})
export class Expediente implements OnInit {

  loading = true;
  activeTab: 'datos' | 'medico' | 'evoluciones' = 'datos';

  // --- DATOS PERSONALES ---
  patientDetails: any = null;
  editingDatos = false;
  savingDatos = false;
  datosForm!: FormGroup;

  // --- ANTECEDENTES MÉDICOS ---
  medicalHistory: any = null;
  editingMedico = false;
  savingMedico = false;
  medicoForm!: FormGroup;

  // --- NOTAS DE EVOLUCIÓN (CDONE-49) ---
  evoluciones: any[] = [];
  loadingEvoluciones = true;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.buildForms();
  }

  ngOnInit(): void {
    this.loadAll();
  }

  private buildForms(): void {
    // Formulario Reactivo para Datos Personales (CDONE-48)
    this.datosForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apep: ['', [Validators.required, Validators.minLength(2)]],
      apem: ['', [Validators.required]],
      nacimiento: ['', [Validators.required]],
      genero: ['Masculino', [Validators.required]],
      edoCivil: ['Soltero(a)', [Validators.required]],
      numcel: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      telCasa: ['', [Validators.pattern('^$|^[0-9]{10}$')]],
      direccion: ['', [Validators.required]],
      cp: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      escolaridad: ['', [Validators.required]],
      estatura: ['', [Validators.required, Validators.min(30), Validators.max(250)]],
      peso: ['', [Validators.required, Validators.min(2), Validators.max(300)]]
    });

    // Formulario Reactivo para Antecedentes Médicos (CDONE-48)
    this.medicoForm = this.fb.group({
      salud: ['buena', [Validators.required]],
      padecimiento: [''],
      presionArterial: ['Normal', [Validators.required]],
      alergicoMedicamento: ['no'],
      tratamiendoMedicoActual: ['no'],
      tomandoMedicamento: ['no'],
      enfermedadNoMencionada: [''],
      diabetes: [false],
      enfermedadesCardiovasculares: [false],
      artritis: [false],
      gastritis: [false],
      hepatitis: [false],
      vih: [false],
      fiebreReumatica: [false],
      mareos: [false]
    });
  }

  private formatDateForInput(dateVal: any): string {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }

  loadAll(): void {
    this.loading = true;
    let count = 0;
    const done = () => { if (++count === 2) { this.loading = false; this.cdr.detectChanges(); } };

    this.http.get<any>(`${API}/get/patientDetails`).subscribe({
      next: (d) => {
        this.patientDetails = d;
        if (d) {
          this.datosForm.patchValue({
            ...d,
            nacimiento: this.formatDateForInput(d.nacimiento)
          });
        }
        done();
      },
      error: () => done()
    });

    this.http.get<any>(`${API}/get/histo`).subscribe({
      next: (d) => {
        this.medicalHistory = d;
        if (d) {
          this.medicoForm.patchValue({ ...d });
        }
        done();
      },
      error: () => done()
    });

    // CDONE-49: Notas de evolución del paciente (procedimientos con descripción de doctor)
    this.http.get<any[]>(`${API}/procedures/my`).subscribe({
      next: (d) => { this.evoluciones = d || []; this.loadingEvoluciones = false; this.cdr.detectChanges(); },
      error: () => { this.loadingEvoluciones = false; this.cdr.detectChanges(); }
    });
  }

  setTab(tab: 'datos' | 'medico' | 'evoluciones'): void {
    this.activeTab = tab;
    this.editingDatos = false;
    this.editingMedico = false;
  }

  // --- MÉTODOS DE VALIDACIÓN REACTIVA (CDONE-48) ---
  isInvalidField(form: FormGroup, field: string): boolean {
    const control = form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // --- EDICIÓN DATOS PERSONALES ---
  startEditDatos(): void {
    if (this.patientDetails) {
      this.datosForm.patchValue({
        ...this.patientDetails,
        nacimiento: this.formatDateForInput(this.patientDetails.nacimiento)
      });
    }
    this.editingDatos = true;
  }

  cancelEditDatos(): void {
    this.editingDatos = false;
    if (this.patientDetails) {
      this.datosForm.patchValue({
        ...this.patientDetails,
        nacimiento: this.formatDateForInput(this.patientDetails.nacimiento)
      });
    }
  }

  saveDatos(): void {
    if (this.datosForm.invalid) {
      this.datosForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Formulario Incompleto',
        text: 'Por favor verifica los campos marcados en rojo antes de guardar.'
      });
      return;
    }

    this.savingDatos = true;
    const payload = this.datosForm.getRawValue();

    this.http.post<any>(`${API}/register/patientDetails`, payload).subscribe({
      next: (res) => {
        this.patientDetails = res.patientDetails || payload;
        this.editingDatos = false;
        this.savingDatos = false;
        Swal.fire({ icon: 'success', title: 'Datos actualizados', timer: 1500, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingDatos = false;
        const msg = err.error?.msg || 'No se pudieron guardar los cambios.';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
        this.cdr.detectChanges();
      }
    });
  }

  // --- EDICIÓN ANTECEDENTES MÉDICOS ---
  startEditMedico(): void {
    if (this.medicalHistory) {
      this.medicoForm.patchValue({ ...this.medicalHistory });
    }
    this.editingMedico = true;
  }

  cancelEditMedico(): void {
    this.editingMedico = false;
    if (this.medicalHistory) {
      this.medicoForm.patchValue({ ...this.medicalHistory });
    }
  }

  saveMedico(): void {
    if (this.medicoForm.invalid) {
      this.medicoForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Formulario Incompleto',
        text: 'Por favor verifica la información ingresada.'
      });
      return;
    }

    this.savingMedico = true;
    const payload = this.medicoForm.getRawValue();

    this.http.post<any>(`${API}/register/histo`, payload).subscribe({
      next: (res) => {
        this.medicalHistory = res.history || payload;
        this.editingMedico = false;
        this.savingMedico = false;
        Swal.fire({ icon: 'success', title: 'Historial actualizado', timer: 1500, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingMedico = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron guardar los cambios.' });
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/paciente']);
  }
}
