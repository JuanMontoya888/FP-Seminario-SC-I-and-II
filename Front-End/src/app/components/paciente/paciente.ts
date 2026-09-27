import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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
  user?: any;

  procedures: Procedure[] = [];
  loadingProcedures = true;
  proceduresError = false;

  constructor(
    private router: Router,
    private procedureService: ProcedureService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.fetchData();
    this.fetchProcedures();
  }

  fetchData(): void {
    const userData = localStorage.getItem('infLog');
    if (userData) {
      try {
        const userInfo = JSON.parse(userData);
        this.user = userInfo.userLogged;
        this.userName = this.user._name;
        this.userEmail = this.user._email;
      } catch (error) {
        console.error('Error al parsear JSON de localStorage', error);
      }
    } else {
      this.userName = 'Nombre';
      this.userEmail = 'email';
    }
  }

  fetchProcedures(): void {
    this.loadingProcedures = true;
    this.proceduresError = false;
    this.procedureService.getMyProcedures().subscribe({
      next: (data) => {
        this.procedures = data || [];
        this.loadingProcedures = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener procedimientos:', err);
        this.proceduresError = true;
        this.loadingProcedures = false;
        this.cdr.detectChanges();
      }
    });
  }

  goToExpediente(): void {
    this.router.navigate(['/expediente']);
  }

  goToCalendar(): void {
    this.router.navigate(['/calendar']);
  }

  navigate(): void {
    this.router.navigate(['/formulario']);
  }
}
