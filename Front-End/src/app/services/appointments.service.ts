import { effect, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // Importar HttpClient
import { UserService } from './user.service';
import { Appointment } from '../models/appointment';
import { map, tap } from 'rxjs/operators'; // Importar operadores RxJS

@Injectable({
  providedIn: 'root'
})
export class AppointmentsService {
  // Tu URL del backend
  //private apiUrl = 'https://dental-one-final.onrender.com/api/user/appointment';
  private apiUrl = 'http://localhost:3000/api/user/appointment';

  // La Signal que alimenta tu calendario
  public appointmentsArray: WritableSignal<Array<Appointment>> = signal([]);

  constructor(
    private userService: UserService,
    private http: HttpClient // Inyectamos el cliente HTTP
  ) {
    /**
     * EFECTO AUTOMÁTICO:
     * 1. Vigila al usuario (userService.userLogged).
     * 2. Si hay usuario, pide los datos al backend.
     * 3. Si no hay (logout), limpia el array.
     */
    effect(() => {
      const user = this.userService.userLogged();

      if (user) {
        // Si el usuario se loguea, cargamos sus citas desde la BD
        this.fetchAppointmentsFromBackend();
      } else {
        // Si el usuario hace logout, limpiamos las citas locales
        this.appointmentsArray.set([]);
      }
    });
  }

  /**
   * Pide las citas al servidor, convierte las fechas y actualiza la Signal.
   */
  fetchAppointmentsFromBackend() {
    // 1. Preparamos el token para que el backend sepa quién eres
    const token = localStorage.getItem('auth_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('x-auth-token', token); // O 'Authorization' según tu backend
    }

    // 2. Hacemos la petición con los headers
    this.http.get<any[]>(this.apiUrl, { headers })
      .pipe(
        // --- TRANSFORMACIÓN DE DATOS ---
        map((response) => {
          return response.map(cita => {
            
            // --- INICIO DE LA CORRECCIÓN DE FECHA ---
            
            // Paso A: Obtenemos solo la parte de la fecha YYYY-MM-DD de Mongo
            // cita.dateTime viene como "2025-12-12T00:00:00.000Z" -> Nos quedamos con "2025-12-12"
            const fechaLimpia = cita.dateTime.toString().split('T')[0];

            // Paso B: Construimos una fecha usando la HORA que guardaste explícitamente ("13:04")
            // Al crear el string así: "2025-12-12T13:04:00" (sin la Z al final),
            // el navegador asume que es la hora LOCAL de tu computadora.
            const fechaCorregida = new Date(`${fechaLimpia}T${cita.hour}:00`);

            return {
              ...cita,
              dateTime: fechaCorregida 
            };
          }) as Appointment[];
        })
      )
      .subscribe({
        next: (dataFormatted) => {
          console.log('Citas corregidas (Hora Local):', dataFormatted);
          // 3. Actualizamos la señal -> Esto dispara el Calendar automáticamente
          this.appointmentsArray.set(dataFormatted);
        },
        error: (err) => {
          console.error('Error obteniendo citas:', err);
          this.appointmentsArray.set([]); 
        }
      });
  }
}