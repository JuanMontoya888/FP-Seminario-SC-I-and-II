import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoaderService } from '../../services/loader.service';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import { UserService } from '../../services/user.service';
//google sign in
declare const google: any;
import { HttpClient } from '@angular/common/http';
import { AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-log-in',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './log-in.html',
  styleUrl: './log-in.css'
})
export class LogIn implements AfterViewInit{
  loginForm!: FormGroup;
  showPassword = false;
  //para el google sign in
  //private backendUrl = 'https://dental-one-final.onrender.com/api/login';
  private backendUrl = 'http://localhost:3000/api/login';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Create reactive form
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Method to login with username and password
  logIn(): void {
    if (this.loginForm.invalid) {
      Swal.fire('Atención', 'Por favor llena todos los campos', 'warning');
      return;
    }

    LoaderService.show();

    const username = this.loginForm.get('username')!!.value;
    const password = this.loginForm.get('password')!!.value;

    this.userService.login(username, password, true)
      .subscribe({
        next: (isSuccessful) => {
          Swal.fire({
          title: '¡Bienvenido!',
          text: 'Inicio de sesión correcto',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
           this.router.navigate(['/']); 
        });
        },
        error: (err: any) => {
          if (err.status === 401 && err.error && err.error.msg === 'Por favor verifica tu correo electrónico antes de iniciar sesión.') {
            Swal.fire({
              title: 'Correo no verificado',
              text: err.error.msg,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Reenviar confirmación',
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#009ee3',
            }).then((result) => {
              if (result.isConfirmed) {
                LoaderService.show();
                this.userService.resendVerificationEmail(username).subscribe({
                  next: (res) => {
                    LoaderService.close();
                    Swal.fire('¡Enviado!', 'Se ha reenviado el correo. Revisa tu bandeja de entrada o spam.', 'success');
                  },
                  error: (reErr) => {
                    LoaderService.close();
                    Swal.fire('Error', 'No se pudo reenviar el correo.', 'error');
                  }
                });
              }
            });
          } else {
            const errorMsg = err.error && err.error.msg ? err.error.msg : 'Sucedio algun error';
            Swal.fire('Error', errorMsg, 'error');
          }
        },
        complete: () => {
          LoaderService.close();
        }

      });
  }

  onForgotPassword(): void {
    Swal.fire({
      title: 'Recuperar Contraseña',
      text: 'Ingresa tu correo electrónico para enviarte un enlace de recuperación.',
      input: 'email',
      inputPlaceholder: 'ejemplo@correo.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar enlace',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#009ee3',
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        LoaderService.show();
        this.userService.forgotPassword(result.value).subscribe({
          next: (res) => {
            LoaderService.close();
            Swal.fire('¡Correo enviado!', res.msg || 'Revisa tu bandeja de entrada o spam.', 'success');
          },
          error: (err) => {
            LoaderService.close();
            Swal.fire('Error', 'No se pudo procesar tu solicitud.', 'error');
          }
        });
      }
    });
  }

  // Función de callback que Google llamará al iniciar sesión
  handleCredentialResponse = (response: any) => {
    // 1. Recibimos el token JWT de Google 
    const idToken = response.credential;
    console.log("Token JWT recibido en el front", idToken);
    
    // 2. Enviamos el token a tu backend para verificación y login
    this.http.post(this.backendUrl, { token: idToken }).subscribe({
      next: (res: any) => {
        if(res && res.token){
          localStorage.setItem('auth_token', res.token);
          this.userService.register(res.user);
          
        }
        Swal.fire({
          title: "¡Todo listo!",
          text: "Tu historia clínica ha sido guardada. Bienvenido.",
          icon: "success",
          confirmButtonText: 'Ir al Inicio'
        }).then((result) => {
          // Navegamos SOLO cuando el usuario cierra la alerta
          this.router.navigate(['/']); 
        });
      },
      // en caso de error
      error: (err) => {
        console.error('Error al enviar el token al backend', err);
      }
    });
  }
  ngAfterViewInit(): void {
    // Check if the Google object is available
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: "305375866482-j66uhnuh0t4hjk67bb7dd2js5glqn6hg.apps.googleusercontent.com",
        context: "signin",
        // añadimos el callback, asegurando el contexto (this)
        callback: this.handleCredentialResponse.bind(this),
        login_uri: "http://localhost:3000/api/login",
        auto_select: true,
        itp_support: true
      });

      google.accounts.id.renderButton(
        document.getElementById("google-button-container"),
        { // Button configuration
          type: "standard",
          shape: "rectangular",
          theme: "outline",
          text: "signin_with",
          size: "large",
          logo_alignment: "left",
        }
      );
    }
  }
}