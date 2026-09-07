import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { UserService } from './user.service';

@Injectable({
    providedIn: 'root'
})
export class ScheduleService {
    private urapi: string = 'http://localhost:3000';

    constructor(
        private http: HttpClient,
        private userService: UserService,
    ) { }

    /**
     * @param title consulta a realizar
     * @param price precio de la consulta
     * @param appointmentId ID de la cita creada en la base de datos
     */
    processPay(title: string, price: number, appointmentId: string): Observable<any> {
        if (!this.userService.isLoggedIn()) return throwError(() => new Error('User not logged in'));

        // Obtenemos el usuario logueado
        const user = this.userService.userLogged()!!;

        // Construimos el cuerpo con TODOS los datos necesarios
        const body = {
            // Datos del Producto (Item)
            title: title,
            price: price,

            // Datos del Pagador (Payer)
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            idUser: user.idUser,

            // NUEVO: Enviamos el ID de la cita al backend
            appointmentId: appointmentId
        }

        const token = this.userService.getToken();
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        // Enviamos al backend
        return this.http.post(`${this.urapi}/mercado-pago/proccesPay`, body, { headers });
    }
}