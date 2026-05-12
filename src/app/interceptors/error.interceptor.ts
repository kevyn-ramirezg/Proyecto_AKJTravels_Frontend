import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retryWhen, delay, throwError } from 'rxjs';
import { of, mergeMap } from 'rxjs';
import Swal from 'sweetalert2';
import { TokenService } from '../services/token-service';

/**
 * Global Error Interceptor
 * Maneja errores HTTP de forma consistente en toda la aplicación
 * - Retry automático para errores 5xx
 * - Logout automático para 401
 * - Notificaciones para errores relevantes
 */
export const errorInterceptorFixed: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  return next(req).pipe(
    retryWhen(errors =>
      errors.pipe(
        mergeMap((error: any, index: number) => {
          if (index < 2 && error instanceof HttpErrorResponse && error.status >= 500) {
            return of(error).pipe(delay(1000 * (index + 1)));
          }
          return throwError(() => error);
        })
      )
    ),
    catchError((error: HttpErrorResponse) => {
      // 404 se maneja en componentes específicos
      if (error.status === 404) {
        return throwError(() => error);
      }

      // 401 - Unauthorized
      if (error.status === 401) {
        tokenService.logout(); // ✅ Sincroniza logout y cancela timers
        Swal.fire({
          icon: 'warning',
          title: 'Sesión expirada',
          text: 'Tu sesión ha caducado. Por favor inicia sesión de nuevo.',
          confirmButtonText: 'Ir a login'
        }).then(() => {
          router.navigate(['/login']);
        });
        return throwError(() => error);
      }

      // 403 - Forbidden
      // NOTA: Para endpoints de comentarios/ratings, el componente maneja el 403 específicamente
      // No mostramos alert general aquí para evitar alertas duplicadas
      if (error.status === 403) {
        // Permitir que componentes manejen el 403 sin interceptación
        return throwError(() => error);
      }

      // 5xx - Server error
      if (error.status >= 500) {
        Swal.fire({
          icon: 'error',
          title: 'Error del servidor',
          text: 'El servidor está experimentando problemas. Por favor intenta de nuevo en unos momentos.'
        });
        return throwError(() => error);
      }

      // Network error
      if (error.status === 0) {
        Swal.fire({
          icon: 'error',
          title: 'Error de conexión',
          text: 'No se pudo conectar al servidor. Verifica tu conexión a internet.'
        });
        return throwError(() => error);
      }

      // Otros errores HTTP
      return throwError(() => error);
    })
  );
};
