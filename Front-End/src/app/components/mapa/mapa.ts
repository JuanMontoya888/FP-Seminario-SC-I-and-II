import { AfterViewInit, Component } from '@angular/core';
import * as L from 'leaflet'; // se importa la libreria leaflet

@Component({
  selector: 'app-mapa',
  imports: [],
  templateUrl: './mapa.html',
  styleUrl: './mapa.css'
})
export class Mapa implements AfterViewInit{
  private map!: L.Map;

  // Coordenadas iniciales (Ej: Aguascalientes, México)
  private center: L.LatLngExpression = [21.8853, -102.2916];
  private zoom = 13;

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    // 1. Inicializar el mapa, usando el ID del contenedor
    this.map = L.map('mapa-leaflet').setView(this.center, this.zoom);

    // 2. Agregar los "tiles" (mosaicos) de OpenStreetMap
    // ESTA ES LA CLAVE: No necesitas API Key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);

    // Opcional: Agregar un marcador
    L.marker(this.center)
      .bindPopup('Aquí estamos')
      .addTo(this.map)
      .openPopup();
  }

}
