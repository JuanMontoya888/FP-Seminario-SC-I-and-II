import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true, // Asegúrate de que sea standalone si usas imports directos
  imports: [RouterModule, CommonModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {
  wasOpenMenu: boolean = false;

  constructor(public userService: UserService) { }

  toggleMenu() {
    this.wasOpenMenu = !this.wasOpenMenu;
    this.toggleBodyScroll();
  }

  cerrarMenu() {
    this.wasOpenMenu = false;
    this.toggleBodyScroll();
  }

  // Bloquea el scroll del fondo para que no "estorbe" al navegar el menú
  private toggleBodyScroll() {
    if (this.wasOpenMenu) {
      document.body.style.overflow = 'clip';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  logOut(): void {
    Swal.fire({
      title: "Cerrar Sesión",
      text: "¿Estás seguro que quieres cerrar tu sesión?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, Cerrar Sesión"
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.logout();
        this.cerrarMenu(); // Cerramos menú si estaba abierto en móvil
      }
    });
  }
}