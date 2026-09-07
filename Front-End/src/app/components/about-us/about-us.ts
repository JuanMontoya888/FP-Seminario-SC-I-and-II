import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type SeccionMVV = 'mision' | 'vision' | 'valores';

@Component({
  selector: 'app-about-us',
  imports: [CommonModule],
  templateUrl: './about-us.html',
  styleUrl: './about-us.css'
})
export class AboutUs {
  // Ninguna sección seleccionada al cargar la página
  seccionActiva: SeccionMVV | null = null;

  mision = 'Brindar atención odontológica integral y especializada con calidad, calidez y profesionalismo, enfocándonos en la salud, estética y bienestar de cada paciente. En Dental One trabajamos para generar confianza, comodidad y experiencias positivas que permitan a nuestra comunidad sonreír con seguridad y felicidad.';

  vision = 'Ser una clínica odontológica reconocida por su excelencia, innovación y trato humano, convirtiéndonos en una referencia de confianza para nuestra comunidad, destacando por transformar sonrisas y mejorar la calidad de vida de nuestros pacientes.';

  valores = [
    { titulo: 'Compromiso', descripcion: 'Trabajamos con dedicación y responsabilidad en cada tratamiento.' },
    { titulo: 'Empatía', descripcion: 'Escuchamos y comprendemos las necesidades de cada paciente.' },
    { titulo: 'Profesionalismo', descripcion: 'Contamos con especialistas capacitados y en constante actualización.' },
    { titulo: 'Calidad', descripcion: 'Ofrecemos atención y tratamientos con altos estándares.' },
    { titulo: 'Confianza', descripcion: 'Creamos relaciones honestas y seguras con nuestros pacientes.' },
    { titulo: 'Trabajo en equipo', descripcion: 'La unión de nuestras especialidades nos permite brindar atención integral.' },
    { titulo: 'Humanidad', descripcion: 'Tratamos a cada persona con respeto, calidez y cercanía.' }
  ];

  seleccionar(seccion: SeccionMVV) {
    // Si se hace click en la card ya activa, se cierra; si no, se abre la nueva
    this.seccionActiva = this.seccionActiva === seccion ? null : seccion;
  }
}
