import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { User } from '../../models/user';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProcedureService } from '../../services/procedure.service';
import { Procedure } from '../../models/procedure';


@Component({
  selector: 'app-paciente',
  imports: [CommonModule],
  templateUrl: './paciente.html',
  styleUrl: './paciente.css',
})

export class Paciente implements OnInit {
  userName?: string;
  userEmail?: string;
  //any para acceder a sus propiedades
  user?: any;

  // Procedimientos / últimas consultas del paciente
  procedures: Procedure[] = [];
  loadingProcedures = true;
  proceduresError = false;

  constructor(
    private router: Router,
    private procedureService: ProcedureService,
    private cdr: ChangeDetectorRef
  ){

  }

  ngOnInit() {
    this.fetchData();
    this.fetchProcedures();
  }

  fetchData(): void {
    const userData = localStorage.getItem('infLog');
    if (userData) {
      try {
        const userInfo = JSON.parse(userData);

        // Accedemos al objeto userLogged
        this.user = userInfo.userLogged;

        // Asignamos las propiedades específicas usando los nombres exactos del JSON
        // Nota: En tu JSON los campos empiezan con guion bajo (_name, _email)
        this.userName = this.user._name;
        this.userEmail = this.user._email;
      } catch (error) {
        console.error('Error al parsear JSON de localStorage', error);
      }
    } else {
      this.userName = "Nombre";
      this.userEmail = "email";
      console.warn('No se encontró infLog en localStorage');
    }
  }

  /** Trae los procedimientos del paciente desde el backend. */
  fetchProcedures(): void {
    this.loadingProcedures = true;
    this.proceduresError = false;
    this.procedureService.getMyProcedures().subscribe({
      next: (data) => {
        this.procedures = data || [];
        this.loadingProcedures = false;
        this.cdr.detectChanges(); // app zoneless: forzar re-render de la lista
      },
      error: (err) => {
        console.error('Error al obtener procedimientos:', err);
        this.proceduresError = true;
        this.loadingProcedures = false;
        this.cdr.detectChanges();
      }
    });
  }

  navigate(): void{
    this.router.navigate(['/formulario']);
  }
}
