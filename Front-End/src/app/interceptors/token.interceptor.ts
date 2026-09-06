//Auth-Interceptor
//importamos el HTTPinterceptor
import { HttpInterceptorFn } from "@angular/common/http";

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {

  // Si la URL es la de inicio, NO agregues el token y pasa la petición limpia
  if (req.url.includes('/api/inicio')) {
      return next(req);
  }
  const auth_token = localStorage.getItem('auth_token');
  if(auth_token){
  //requests are inmuttable
    console.log('el interceptor si encontro el token y lo manda al request');
    const authRequest = req.clone({
      setHeaders: {
        'Authorization' : `Bearer ${auth_token}`
      }
    });
    return next(authRequest);
  }
  console.log('No se encontro el fockin token');
  return next(req);
}