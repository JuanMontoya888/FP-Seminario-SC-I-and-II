import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Procedure, PacienteOption } from '../models/procedure';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProcedureService {
  // URL base del backend (definida en src/environments)
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  /** Headers con el token. Se mandan ambos formatos por compatibilidad. */
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || '';
    return new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('x-auth-token', token);
  }

  /** Procedimientos del paciente autenticado. */
  getMyProcedures(): Observable<Procedure[]> {
    return this.http.get<Procedure[]>(`${this.apiUrl}/user/procedures`, { headers: this.authHeaders() });
  }

  /** Lista de pacientes (solo admin) para el selector del dentista. */
  getPatients(): Observable<PacienteOption[]> {
    return this.http.get<PacienteOption[]>(`${this.apiUrl}/admin/patients`, { headers: this.authHeaders() });
  }

  /** Procedimientos de un paciente específico (solo admin). */
  getPatientProcedures(patientId: string): Observable<Procedure[]> {
    return this.http.get<Procedure[]>(`${this.apiUrl}/admin/procedures/${patientId}`, { headers: this.authHeaders() });
  }

  /** Registrar un procedimiento (solo admin). */
  createProcedure(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/procedures`, data, { headers: this.authHeaders() });
  }
}
