import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Servicio } from '../../models/servicio';
import { ServicioService } from '../../services/servicio.service';

@Component({
  selector: 'app-services',
  imports: [RouterModule],
  templateUrl: './services.html',
  styleUrl: './services.css'
})
export class Services {
    misServicios: Servicio[] = []; //array con los servicios
    constructor(public miservicio: ServicioService){
      //prueba
      //console.log("constructor de servicios");
    }
    ngOnInit(): void{
      //prueba
      //console.log("ngOnInit de servicios");
      //se extraen los servicios y se guardan en el array
      this.misServicios = this.miservicio.getServicios();
      //prueba para ver que se hayan guardado correctamente los servicios
      //console.log(this.misServicios);
    }
}
