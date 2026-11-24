import { Component, OnInit } from '@angular/core';
import { RouterLink } from "@angular/router";
import { CommonModule } from '@angular/common';
//importamos el servicio para strapi.js
import { Cms } from '../../services/cms';
import { UserService } from '../../services/user.service';


@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  strapiData:any = null;
  bandAnim: Boolean = true;

  constructor(
    public strapiService: Cms,
    private userService: UserService
  ){}

  get userIsLogged(): boolean {
    return this.userService.isLoggedIn();
  }

  ngOnInit(): void {
    // 1. Iniciamos la petición
    this.strapiService.getInicio().subscribe({
      next: (data) => {
        console.log('Datos recibidos de Strapi:', data);
        this.strapiData = data;
        
        // 2. ¡YA LLEGARON LOS DATOS! Ahora sí quitamos el loader
        this.bandAnim = false; 
      },
      error: (err) => {
        console.error('Error al conectarse con strapi', err);
        // 3. Importante: Quitar el loader también si hay error, 
        // si no, el usuario se quedará viendo la animación infinitamente.
        this.bandAnim = false; 
      }
    });
  }
  

  ngAfterViewInit(): void{
    
  }
}
