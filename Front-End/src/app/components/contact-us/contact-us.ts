import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { UserService } from '../../services/user.service';
import { ContactService, ContactData } from '../../services/contact.service';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-us.html',
  styleUrls: ['./contact-us.css'] // Asegúrate de que este CSS tenga las clases del Login
})
export class ContactUs {
  
  contactoForm: FormGroup;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private contactService: ContactService
  ) {
    // Definimos los campos del formulario de CONTACTO
    this.contactoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      celular: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      asunto: ['', Validators.required],
      mensaje: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  // Getter para acceder fácil a los controles en el HTML
  get f() { return this.contactoForm.controls; }

  enviar() {
    this.submitted = true;

    const userLogueado = this.userService.userLogged();
    if (!userLogueado) {
      Swal.fire({
        title: 'No autorizado',
        text: 'Debes iniciar sesión para enviar un comentario.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ir al Login',
        cancelButtonText: 'Cancelar'
      }).then(res => {
        if (res.isConfirmed) this.router.navigate(['/login']);
      });
      return;
    }

    if (this.contactoForm.invalid) {
      // Marcar todos como tocados para que salgan los errores rojos
      this.contactoForm.markAllAsTouched();
      return;
    }

    // Si todo está bien
    Swal.fire({
      title: '¿Enviar mensaje?',
      text: 'Verifica tus datos antes de enviar.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        Swal.fire({
            title: 'Enviando...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const contactData: ContactData = this.contactoForm.value;

        this.contactService.submitContactForm(contactData).subscribe({
            next: (res) => {
                this.contactoForm.reset();
                this.submitted = false;
                Swal.fire('¡Enviado!', res.msg || 'Gracias por contactarnos.', 'success');
            },
            error: (err) => {
                console.error(err);
                Swal.fire('Error', err.error?.msg || 'No se pudo enviar el mensaje. Intenta más tarde.', 'error');
            }
        });
      }
    });
  }
}