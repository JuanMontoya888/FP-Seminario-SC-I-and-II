
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, RequiredValidator, Validators } from "@angular/forms";
import Swal from 'sweetalert2';
import { HttpClient} from '@angular/common/http';
import { Router } from "@angular/router";

//datos obtenidos del register
  interface userProfile {
    nombre: string,
    apellidos: string,
    email: string
  }
@Component({
  selector: 'app-formulario-inicial',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './formulario-inicial.html',
  styleUrl: './formulario-inicial.css'
})
export class FormularioInicial {
  //Formulario
  generalForm!: FormGroup;

  //private profileUrl = 'https://dental-one-final.onrender.com/api/user/profile';
  //private profileDataUrl = 'https://dental-one-final.onrender.com/api/register/patientDetails';
  private profileUrl = 'http://localhost:3000/api/user/profile';
  private profileDataUrl = 'http://localhost:3000/api/register/patientDetails';
  //selectores
  escolaridades: any[] = [];
  civil : any [] = [];
  genero: any [] = [];

  

  constructor(private formBuilder: FormBuilder, private http: HttpClient, private router: Router){}

  ngOnInit(): void{
    this.escolaridades =  [{ value: 'Básica', label: 'Option 1' },
        { value: 'Media Superior', label: 'Option 2' },
        { value: 'Superior', label: 'Option 3' }];

    this.civil = [{value: 'Solter@', label: 'Option 1'},
      {value: 'Casad@', label: 'Option 2'},
    ];
    this.genero = [{value: 'Hombre'}, {value: 'Mujer'}, {value: 'Otro'}];
    
    this.generalForm = this.formBuilder.group({
      nombre: ['', [Validators.required]],
      apep: ['', [Validators.required]],
      apem: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      cp: ['', [Validators.required,Validators.pattern('^\\d{5}$')]],
      telCasa: ['',[Validators.pattern('^$|^\\d{10}?$')]],
      //preguntar por oficina- considero que no es obligatorio
      //oficina: ['', [Validators.required]],
      numcel: ['', [Validators.required, Validators.pattern('^\\d{10}$')]],//10 digitos solamente,
      email: ['', [Validators.required, Validators.email]],
      escolaridad: ['', [Validators.required]],
      edoCivil: ['', Validators.required],
      estatura: ['', [Validators.required, Validators.pattern('^\\d\\.\\d+$')]],
      peso: ['', [Validators.required, Validators.pattern('^\\d+$')]],
      nacimiento: ['', [Validators.required]],
      //recomendado: ['', [Validators.required]],
      genero: ['', [Validators.required]]
    });
    const tokenActual = localStorage.getItem('auth_token');
    console.log('Token antes de loadUserData:', tokenActual); 
    if (!tokenActual) {
        console.error('ALERTA: Llegué al formulario pero NO hay token guardado');
    }
    this.loadUserData();
  }

  loadUserData() : void{
    this.http.get(this.profileUrl).subscribe({
      next: (data: any) => {
        console.log('Datos del perfil', data);
        let apem ='';
        let apep = '';
        if (data.apellidos) {
          const partes = data.apellidos.trim().split(" ");
          apep = partes[0] || ''; // Primer apellido
          apem = partes[1] || ''; // Segundo apellido   
        }
        this.generalForm.patchValue({//con patch value solo actualiza los campos que encuentra
          nombre: data.nombre,
          apep: apep,
          apem: apem,
          email: data.email
        });
        this.loadPatientDetails();
      },
      error: (error) => {
        if(error.status == 401){
          console.error('No autorizado. El token ha expirado o es invalido');
        }else{
          console.error('Error al solicitar el perfil');
        }
      }
    });
  }

  loadPatientDetails(): void {
    this.http.get('http://localhost:3000/api/get/patientDetails').subscribe({
      next: (data: any)=> {
        console.log('Patient Details: ', data);
        this.generalForm.patchValue(data);
      }
    })
  }
 
  onSubmit(){
    //para testing
    console.log("Si entro");
   //verificamos que el formulario sea valido
    if(this.generalForm.invalid){
      //testing
      console.log('--- Formulario Inválido ---');
    
      Object.keys(this.generalForm.controls).forEach(key => {
          const control = this.generalForm.get(key);
          
          // Verifica si el control tiene errores
          if (control && control.errors) {
              console.log(`Campo fallido: ${key}`, control.errors);
          }
      });

      this.generalForm.markAllAsTouched();
      return;
    }

    //obtenemos el formulario
    const formData = this.generalForm.value;
    const formValues = {
      nombre: formData.nombre,
      apep: formData.apep,
      apem: formData.apem,
      direccion: formData.direccion,
      cp: formData.cp,
      telCasa: formData.telCasa,
      numcel: formData.numcel,
      email: formData.email,
      escolaridad: formData.escolaridad,
      edoCivil: formData.edoCivil,
      estatura: formData.estatura,
      peso: formData.peso,
      nacimiento:formData.nacimiento,
      recomendado: formData.recomendado,
      genero: formData.genero
    };


    //enviamos el post al back
    this.http.post(this.profileDataUrl, formValues).subscribe({
      next: (res: any) => {
        console.log('Registro de los datos del paciente exitoso', res)
        Swal.fire({
                  title: "Registro Exitoso",
                  text: "Te has registrado",
                  icon: "success"
        });
        this.router.navigate(['/histo']);
      },
      error : (err) => {
        console.error('No se pudo realizar el registro', err);
        let errorMsg = "Ocurrio un error";
        Swal.fire({
          title: "Problema en el registro de los datos del paciente",
          text: errorMsg,
          icon: "error"
        });
      }
    });

  }

}



