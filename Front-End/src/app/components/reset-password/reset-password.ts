import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { UserService } from '../../services/user.service';
import { LoaderService } from '../../services/loader.service';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]).{8,15}$/;

export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmpsswd = control.get('confirmpsswd');
  if (password && confirmpsswd && password.value !== confirmpsswd.value) {
    return { mismatch: true };
  }
  return null;
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  resetForm!: FormGroup;
  token: string = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';

    this.resetForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.pattern(passwordRegex)]],
      confirmpsswd: ['', [Validators.required, Validators.pattern(passwordRegex)]]
    }, {
      validators: passwordsMatchValidator 
    });
  }

  get passwordControl() {
    return this.resetForm.get('password');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (!this.token) {
      Swal.fire('Error', 'Token no válido', 'error');
      return;
    }

    LoaderService.show();
    const newPassword = this.resetForm.value.password;

    this.userService.resetPassword(this.token, newPassword).subscribe({
      next: (res) => {
        LoaderService.close();
        Swal.fire('¡Éxito!', res.msg || 'Contraseña actualizada. Ya puedes iniciar sesión.', 'success').then(() => {
          this.router.navigate(['/log-in']);
        });
      },
      error: (err) => {
        LoaderService.close();
        const msg = err.error && err.error.msg ? err.error.msg : 'Error al restablecer la contraseña.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }
}
