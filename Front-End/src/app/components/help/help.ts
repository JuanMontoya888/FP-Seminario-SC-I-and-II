import { CommonModule } from '@angular/common';
import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-help',
  imports: [
    CommonModule
  ],
  templateUrl: './help.html',
  styleUrl: './help.css'
})
export class Help {
  openIndex: number | null = 0;  // Primer elemento abierto por defecto

  faqs = [
    {
      question: '¿Cómo puedo agendar una cita dental?',
      answer: 'Selecciona el servicio que necesitas desde la sección “Servicios Dentales” y completa el formulario. Recibirás una confirmación de tu cita en minutos.'
    },
    {
      question: '¿Puedo modificar o cancelar mi cita?',
      answer: 'Puedes escribirnos desde el formulario de contacto o llamarnos directamente. Te ayudaremos con cualquier cambio según nuestra disponibilidad.'
    },
    {
      question: '¿Qué tratamientos odontológicos ofrecen?',
      answer: 'Contamos con limpieza dental, resinas, endodoncia, ortodoncia, blanqueamiento, extracciones, odontología estética y más.'
    },
    {
      question: '¿Los tratamientos son dolorosos?',
      answer: 'La mayoría de los procedimientos son indoloros gracias a la anestesia local y técnicas modernas. Nuestro equipo asegura tu comodidad.'
    },
    {
      question: '¿Aceptan seguros dentales?',
      answer: 'Por el momento no estamos trabajando con ninguna aseguradora.'
    }
  ];

  toggleAccordion(index: number) {
    this.openIndex = this.openIndex === index ? null : index;
  }
  
}
