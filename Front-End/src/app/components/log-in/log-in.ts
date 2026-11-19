import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoaderService } from '../../services/loader.service';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import { UserService } from '../../services/user.service';
//google sign in
declare const google: any;
import { AfterViewInit } from '@angular/core';
import { environment } from '../../../environments/environment';

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

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService
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
    const idToken = response?.credential;
    if (!idToken) {
      Swal.fire('Error', 'Google no devolvió una credencial válida.', 'error');
      return;
    }

    this.userService.loginWithGoogle(idToken).subscribe({
      next: () => {
        Swal.fire({
          title: '¡Bienvenido!',
          text: 'Iniciaste sesión con Google correctamente.',
          icon: 'success',
          confirmButtonText: 'Ir al inicio'
        }).then(() => this.router.navigate(['/']));
      },
      error: (err: any) => {
        if (err.status === 404 && err.error?.needRegister) {
          Swal.fire({
            title: 'Cuenta no registrada',
            text: 'Primero crea tu cuenta en Dental One con este correo de Google.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Ir a registro',
            cancelButtonText: 'Cerrar'
          }).then((result) => {
            if (result.isConfirmed) this.router.navigate(['/register']);
          });
          return;
        }

        Swal.fire('Error', err.error?.msg || 'No se pudo iniciar sesión con Google.', 'error');
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.loadGoogleIdentityServices();
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        context: 'signin',
        callback: this.handleCredentialResponse,
        auto_select: false,
        itp_support: true
      });

      const buttonContainer = document.getElementById('google-button-container');
      if (buttonContainer) {
        google.accounts.id.renderButton(buttonContainer, {
          type: 'standard',
          shape: 'rectangular',
          theme: 'outline',
          text: 'signin_with',
          size: 'large',
          logo_alignment: 'left'
        });
      }
    } catch (error) {
      console.error('No se pudo inicializar Google Sign-In:', error);
      Swal.fire('Google no disponible', 'No se pudo cargar el inicio de sesión con Google.', 'error');
    }
  }

  private loadGoogleIdentityServices(): Promise<void> {
    if (!environment.googleClientId) {
      return Promise.reject(new Error('Falta configurar googleClientId en el ambiente de Angular.'));
    }
    if (typeof google !== 'undefined' && google.accounts?.id) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo descargar Google Identity Services.'));
      document.head.appendChild(script);
    });
  }
}