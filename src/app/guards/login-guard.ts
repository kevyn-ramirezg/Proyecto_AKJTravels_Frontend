import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token-service';

export const loginGuard: CanActivateFn = () => {
  const token = inject(TokenService);
  const router = inject(Router);

  if (token.isLogged()) {
    router.navigateByUrl('/');
    return false;
  }
  return true;
};
