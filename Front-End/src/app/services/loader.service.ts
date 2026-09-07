import Swal from 'sweetalert2';

export class LoaderService {
  static show(mensaje: string = 'Procesando...') {
    Swal.fire({
      title: mensaje,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  static close() {
    Swal.close();
  }
}