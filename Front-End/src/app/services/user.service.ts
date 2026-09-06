import { Injectable, signal, WritableSignal } from '@angular/core';
import { User, USERS_ } from '../models/user';
import { Observable, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { differenceInHours } from 'date-fns';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private users!: Array<User>;

  // Signals for session state
  public isLoggedIn: WritableSignal<boolean> = signal(false);
  public userLogged: WritableSignal<User | null> = signal(null);

  //private loginURL = 'https://dental-one-final.onrender.com/api/user/login';
  private loginURL = 'http://localhost:3000/api/user/login';

  constructor(private http: HttpClient) {
    this.users = USERS_;
    // Check for session in localStorage when the service is initialized
    this.checkUserLogged();
  }

  login(credential: string, password: string, isEmail: boolean): Observable<boolean> {
    const userCredentials = {
      email: credential,
      password: password
    }

    return this.http.post<any>(this.loginURL, userCredentials).pipe(
      tap((res: any) => {
        if (res && res.token) {
          // 1. Convertimos la respuesta cruda en Instancia de User
          const userInstance = User.fromJSON(res);

          // 2. Actualizamos señales
          this.isLoggedIn.set(true);
          this.userLogged.set(userInstance);

          // 3. Guardamos en LocalStorage (pasamos el token aparte)
          this._saveSession(userInstance, res.token);
        }
      }),
      map((res: any) => {
        return true;
      }),
      catchError((err) => {
        this.isLoggedIn.set(false);
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    this.isLoggedIn.set(false);
    this.userLogged.set(null);
    // Clear localStorage
    localStorage.removeItem('infLog');
    localStorage.removeItem('auth_token');
  }

  register(userData: any) {
    // Asumiendo userData ya es una instancia o un objeto compatible
    // Lo ideal seria convertirlo también con User.fromJSON(userData)
    this.isLoggedIn.set(true);
    this.userLogged.set(userData);
    this._saveSession(userData);
  }

  resendVerificationEmail(email: string): Observable<any> {
    const url = 'http://localhost:3000/api/resend-verification';
    return this.http.post<any>(url, { email });
  }

  forgotPassword(email: string): Observable<any> {
    const url = 'http://localhost:3000/api/forgot-password';
    return this.http.post<any>(url, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    const url = `http://localhost:3000/api/reset-password/${token}`;
    return this.http.post<any>(url, { password });
  }

  /**
   * Guarda sesión y token.
   */
  private _saveSession(user: User, token?: string): void {
    if (token) {
      localStorage.setItem('auth_token', token);
    }

    const infLog = {
      time: new Date().toISOString(),
      userLogged: user.toJSON() // Guardamos el objeto limpio usando toJSON de la clase
    };
    localStorage.setItem('infLog', JSON.stringify(infLog));
    console.log('Datos del usuario guardados en el local', infLog);
  }

  checkUserLogged(): void {
    let getUser_LS: { time: string, userLogged: any } | null = null;
    const infLogString = localStorage.getItem('infLog');

    if (infLogString) getUser_LS = JSON.parse(infLogString);

    if (getUser_LS !== null) {
      const timeLogged = new Date(getUser_LS.time);
      const currentTime = new Date();
      const hoursPassed = differenceInHours(currentTime, timeLogged);
      const SESSION_LIMIT_HOURS = 1;

      if (hoursPassed < SESSION_LIMIT_HOURS) {
        this.isLoggedIn.set(true);
        // RECONSTRUIMOS la instancia al cargar del LocalStorage
        this.userLogged.set(User.fromJSON(getUser_LS.userLogged));
      } else {
        Swal.fire({
          title: '¡Sesión Expirada!',
          text: 'Su sesión ha caducado por inactividad. Por favor, inicie sesión nuevamente.',
          icon: 'warning',
          confirmButtonText: 'Aceptar',
          timer: 5000
        });
        this.logout(); // Usamos el método logout para limpiar todo
      }
    }
  }

  // Helper simple para usar en guards o templates si prefieres no usar el signal directo
  get isAdmin(): boolean {
    return this.userLogged()?.isAdmin || false;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}