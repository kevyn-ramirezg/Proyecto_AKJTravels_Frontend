// auth interceptor removed (reverted). If you need it again, re-create the interceptor
// and register it in app config.
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const token = tokenService.getToken();

  // evita añadir Authorization al endpoint de login/registro si quieres
  const isAuthEndpoint = /\/api\/auth(\/|$)/.test(req.url);

  if (token && !isAuthEndpoint) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req);
};
