import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const REDIRECT_URL_KEY = 'authRedirectUrl';
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    constructor(private http: HttpClient, private baseUrl: URL ){}
    googleLogin(token: string): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/google-login`, { token });
    }
    
}