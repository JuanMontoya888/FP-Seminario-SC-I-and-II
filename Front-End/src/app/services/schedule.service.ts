import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { UserService } from './user.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ScheduleService {
    private urapi: string = environment.apiUrl;

    constructor(
        private http: HttpClient,
        private userService: UserService,
    ) { }

    /**
     * Crea la orden de pago de una cita. El backend calcula el monto a partir del
     * tratamiento de la cita (no se manda precio ni título desde aquí).
     * @param appointmentId ID de la cita creada en la base de datos
     * @param paymentMode 'full' (100%) o 'partial' (anticipo 50%)
     */
    processPay(appointmentId: string, paymentMode: 'full' | 'partial'): Observable<any> {
        if (!this.userService.isLoggedIn()) return throwError(() => new Error('User not logged in'));

        const body = { appointmentId, paymentMode };

        const token = this.userService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        // Enviamos al backend
        return this.http.post(`${this.urapi}/mercado-pago/proccesPay`, body, { headers });
    }
}