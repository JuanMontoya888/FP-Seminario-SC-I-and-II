import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core'; // Agregue OnInit
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { UserService } from '../../services/user.service'; // Asegúrate de importar esto

@Component({
  selector: 'app-histo-clinica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // Quite FormsModule y RouterLink si no los usas directo en HTML
  templateUrl: './histo-clinica.html',
  styleUrl: './histo-clinica.css'
})
export class HistoClinica implements OnInit {
  histoForm!: FormGroup;
  //private histoURI = 'https://dental-one-final.onrender.com/api/register/histo';
  private histoURI = 'http://localhost:3000/api/register/histo';

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private userService: UserService // Inyectamos el servicio
  ) {}

  padecimientos = [{ value: 'Diabetes' }, { value: 'Enfermedades del corazón' }, { value: 'Hipertensión' }, { value: 'Cáncer' }, { value: 'Otro' }];
  booleano = [{ value: 'si' }, { value: 'no' }];
  edoSalud = [{ value: 'Bueno' }, { value: 'Regular' }, { value: 'Malo' }];

  ngOnInit(): void {
    this.histoForm = this.formBuilder.group({
      salud: ['', [Validators.required]],
      padecimiento: ['', [Validators.required]],
      fiebreReumatica: ['', [Validators.required]],
      enfermedadesCardiovasculares: ['', [Validators.required]],
      mareos: ['', [Validators.required]],
      diabetes: ['', [Validators.required]],
      hepatitis: ['', [Validators.required]],
      vih: ['', [Validators.required]],
      artritis: ['', [Validators.required]],
      gastritis: ['', [Validators.required]],
      renales: ['', [Validators.required]],
      anemia: ['', [Validators.required]],
      presionArterial: ['', [Validators.required]],
      sangradoAnormal: ['', [Validators.required]],
      moretones: ['', [Validators.required]],
      transfusiones: ['', [Validators.required]],
      tratamientoMedicoActual: ['', [Validators.required]],
      tomandoMedicamento: ['', [Validators.required]],
      alergicoMedicamento: ['', [Validators.required]],
      adiccion: ['', [Validators.required]],
      fuma: ['', [Validators.required]],
      enfermedadNoMencionada: ['', [Validators.required]],
      embarazo: ['', [Validators.required]],
      problemaHormonal: ['', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.histoForm.invalid) {
      this.histoForm.markAllAsTouched();
      Swal.fire('Atención', 'Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    const formData = this.histoForm.value;
    
    const formValues = {
      ...formData, // Copia todos los campos de texto directo
      fiebreReumatica: formData.fiebreReumatica === 'si',
      enfermedadesCardiovasculares: formData.enfermedadesCardiovasculares === 'si',
      mareos: formData.mareos === 'si',
      diabetes: formData.diabetes === 'si',
      hepatitis: formData.hepatitis === 'si',
      vih: formData.vih === 'si',
      artritis: formData.artritis === 'si',
      gastritis: formData.gastritis === 'si',
      problemaHormonal: formData.problemaHormonal === 'si'
    };

    this.http.post<any>(this.histoURI, formValues).subscribe({
      next: (data) => {
        console.log('Respuesta del servidor:', data);

        if (data && data.user) {
          this.userService.register(data.user);
        }

        // AQUÍ ESTÁ LA MAGIA PARA "INICIAR SESIÓN" (Redirigir)
        Swal.fire({
          title: "¡Todo listo!",
          text: "Tu historia clínica ha sido guardada. Un último paso.",
          icon: "success",
          confirmButtonText: 'Continuar'
        }).then((result) => {
           // Tras los formularios, preguntamos el tipo de paciente
           this.router.navigate(['/tipo-paciente']);
        });
      },
      error: (error) => {
        console.error('Error:', error);
        if (error.status === 401) {
          // Si falla el token, lo mandamos al login real
          Swal.fire('Sesión Expirada', 'Por favor inicia sesión nuevamente', 'error');
          this.router.navigate(['/login']); // O la ruta de tu login
        } else {
          Swal.fire('Error', 'No se pudo guardar la historia clínica', 'error');
        }
      }
    });
  }
}