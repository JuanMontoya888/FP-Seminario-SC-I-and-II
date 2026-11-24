import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly baseUrl = `${environment.apiUrl}/api`;

    constructor(private http: HttpClient) {}

    googleLogin(token: string): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/login`, { token });
    }
}