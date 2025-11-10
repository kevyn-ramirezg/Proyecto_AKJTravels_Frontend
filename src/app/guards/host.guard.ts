import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token-service';

export const hostGuard: CanActivateFn = () => {
  const token = inject(TokenService);
  const router = inject(Router);
  if (token.getRole() === 'HOST') return true;
  router.navigateByUrl('/'); // o página “acceso denegado”
  return false;
};
