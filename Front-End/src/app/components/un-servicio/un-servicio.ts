import { Component , Input} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Servicio } from '../../models/servicio';
import { ServicioService } from '../../services/servicio.service';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-un-servicio',
  imports: [RouterModule],
  templateUrl: './un-servicio.html',
  styleUrl: './un-servicio.css'
})
export class UnServicio {
      @Input() servicio!:Servicio;
      constructor(public unservicio:ServicioService, public activatedRoute : ActivatedRoute, private location: Location){
        this.activatedRoute.params.subscribe(params =>{
          this.servicio = unservicio.getUnServicio(params['id']);
        })

      }
  volver(): void {
    this.location.back();
  }
}
