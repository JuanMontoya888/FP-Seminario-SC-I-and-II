import { Injectable } from "@angular/core";
import { Servicio } from "../models/servicio";
import { Servicios } from "../models/misServicios";

@Injectable({
    providedIn : 'root'
})
export class ServicioService{
    private servicios : Servicio[] = Servicios;

    constructor(){

    }
    getServicios(): Servicio[]{
        return this.servicios;
    }
    getUnServicio(posicion : number){
        return this.servicios[posicion];
    }
}