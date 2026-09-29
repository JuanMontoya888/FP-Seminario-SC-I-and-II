import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

const API = 'http://localhost:3000/api';

@Component({
  selector: 'app-expediente',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  datosForm: any = {};

  // --- ANTECEDENTES MÉDICOS ---
  medicalHistory: any = null;
  editingMedico = false;
  savingMedico = false;
  medicoForm: any = {};

  // --- NOTAS DE EVOLUCIÓN ---
  evoluciones: any[] = [];
  loadingEvoluciones = true;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    let count = 0;
    const done = () => { if (++count === 2) { this.loading = false; this.cdr.detectChanges(); } };

    this.http.get<any>(`${API}/get/patientDetails`).subscribe({
      next: (d) => { this.patientDetails = d; this.datosForm = { ...d }; done(); },
      error: () => done()
    });

    this.http.get<any>(`${API}/get/histo`).subscribe({
      next: (d) => { this.medicalHistory = d; this.medicoForm = { ...d }; done(); },
      error: () => done()
    });

    // Notas de evolución del paciente (procedimientos con descripción de doctor)
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

  // --- EDICIÓN DATOS PERSONALES ---
  startEditDatos(): void {
    this.datosForm = { ...this.patientDetails };
    this.editingDatos = true;
  }

  cancelEditDatos(): void {
    this.editingDatos = false;
    this.datosForm = { ...this.patientDetails };
  }

  saveDatos(): void {
    this.savingDatos = true;
    this.http.post<any>(`${API}/register/patientDetails`, this.datosForm).subscribe({
      next: (res) => {
        this.patientDetails = res.patientDetails || this.datosForm;
        this.editingDatos = false;
        this.savingDatos = false;
        Swal.fire({ icon: 'success', title: 'Datos actualizados', timer: 1500, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingDatos = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron guardar los cambios.' });
        this.cdr.detectChanges();
      }
    });
  }

  // --- EDICIÓN ANTECEDENTES MÉDICOS ---
  startEditMedico(): void {
    this.medicoForm = { ...this.medicalHistory };
    this.editingMedico = true;
  }

  cancelEditMedico(): void {
    this.editingMedico = false;
    this.medicoForm = { ...this.medicalHistory };
  }

  saveMedico(): void {
    this.savingMedico = true;
    this.http.post<any>(`${API}/register/histo`, this.medicoForm).subscribe({
      next: (res) => {
        this.medicalHistory = res.history || this.medicoForm;
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
