import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  // Inyectamos el Router para poder navegar
  const router = inject(Router);
  // Buscamos el token
  const token = localStorage.getItem('auth_token');
  if (token) {
    // Si hay token, permitimos la entrada
    return true;
  } else {
    // Redirigimos si no hay token
    router.navigate(['/']); // O la ruta donde tengas tu login/registro
    return false;
  }
};