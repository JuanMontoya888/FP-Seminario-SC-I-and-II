import { Component, signal, OnInit, NgZone, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core'; // 1. IMPORTA ChangeDetectorRef
import { RouterOutlet } from '@angular/router';
import { Footer } from './components/footer/footer';
import { NavBar } from './components/nav-bar/nav-bar';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavBar,
    Footer,
    CommonModule
  ],
  templateUrl: './app.html', // Verifica que este nombre sea correcto
  styleUrl: './app.css'
})
export class App implements OnInit {
  
  // Variable para controlar la clase CSS
  cargando: boolean = true;

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef, // 2. INYECTA ESTO
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (document.readyState === 'complete') {
        this.quitarLoader();
      } else {
        window.addEventListener('load', () => {
          this.quitarLoader();
        });
      }

      // Seguridad
      setTimeout(() => {
        if (this.cargando) {
          console.log('Forzando cierre por tiempo límite.');
          this.quitarLoader();
        }
      }, 4000);
    } else {
      this.cargando = false;
    }
  }

  quitarLoader() {
    // Usamos NgZone Y ADEMÁS detectChanges()
    this.ngZone.run(() => {
      this.cargando = false;
      this.cdr.detectChanges(); // 3. OBLIGA A LA VISTA A ACTUALIZARSE
      console.log('Loader desactivado. Estado de cargando:', this.cargando);
    });
  }
}