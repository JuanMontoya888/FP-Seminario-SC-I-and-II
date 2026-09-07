import { CommonModule } from '@angular/common';
import { HttpClient} from '@angular/common/http';
import { Component, OnInit } from '@angular/core'; // Añadido OnInit
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms'; // Añadidos ValidatorFn, AbstractControl, ValidationErrors
import { Router } from "@angular/router";
import Swal from 'sweetalert2';


// Expresión regular para contraseña
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]).{8,15}$/;

// Validador personalizado para la confirmacion de contrasena
export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmpsswd = control.get('confirmpsswd');

  // Solo validar si ambos controles existen y si tienen valores diferentes
  if (password && confirmpsswd && password.value !== confirmpsswd.value) {
    // Si no coinciden, retornamos el error 'mismatch'
    return { mismatch: true };
  }

  // Si coinciden (o si algún campo está vacío/no disponible), retornamos null (válido)
  return null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {

  registerForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  //private registerUrl = 'https://dental-one-final.onrender.com/api/register'
  private registerUrl = 'http://localhost:3000/api/register'

  constructor(private http: HttpClient, private router: Router, private builder: FormBuilder) {}


  ngOnInit(): void {
    this.registerForm = this.builder.group({
      nombre: ['', [Validators.required]],
      apellidos: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.pattern(passwordRegex)]],
      confirmpsswd: ['', [Validators.required, Validators.pattern(passwordRegex)]]
    }, {
      validators: passwordsMatchValidator 
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Opcional: Getter para el control de la contraseña, útil en el HTML
  get passwordControl() {
    return this.registerForm.get('password');
  }

  // Opcional: Getter para el control de confirmación, útil en el HTML
  get confirmPasswordControl() {
    return this.registerForm.get('confirmpsswd');
  }

  onSubmit(){
    //primero verificamos que el form sea valido
    if(this.registerForm.invalid){
      this.registerForm.markAllAsTouched(); //Muestra los errores al usuario
      return;
    }
    
    //en caso de ser valid, se extraen los datos
    const formData = this.registerForm.value;
    const userRegisterData = {
      nombre: formData.nombre,
      apellidos: formData.apellidos,
      email: formData.email,
      password: formData.password
    };

    //enviamos el post al back
    this.http.post(this.registerUrl, userRegisterData).subscribe({
      next: (res: any) =>{
        console.log('Registro completado', res);
         Swal.fire({
          title: "Registro Exitoso",
          text: "Te has registrado correctamente. Por favor, revisa tu correo electrónico para verificar tu cuenta antes de iniciar sesión.",
          icon: "info"
        }).then((result) => {
          if(result.isConfirmed || result.isDismissed){
            this.router.navigate(['/log-in']);
          }
        })
      },
      error : (err: any) => {
        console.error('No se pudo realizar el registro', err);
        let errorMsg = "Ocurrio un error";
        Swal.fire({
          title: "Problema en el registro",
          text: errorMsg,
          icon: "error"
        })
      }

    })
  }


  
}