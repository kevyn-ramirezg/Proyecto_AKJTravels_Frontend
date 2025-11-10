import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token-service';

function normalize(role: string | null | undefined): string {
  return (role ?? '').replace(/^ROLE_/, '').toUpperCase(); // ROLE_HOST -> HOST
}

export const roleGuard: CanActivateFn = (next: ActivatedRouteSnapshot) => {
  const token = inject(TokenService);
  const router = inject(Router);

  if (!token.isLogged()) {
    router.navigateByUrl('/login');
    return false;
  }

  const expected = (next.data['expectedRole'] as string[] | undefined) ?? [];
  // Acepta HOST y ROLE_HOST en data:
  const normalizedExpected = expected.map(r => normalize(r));
  const real = normalize(token.getRole()); // tu getRole() ya normaliza, igual reforzamos

  if (normalizedExpected.length > 0 && !normalizedExpected.includes(real)) {
    router.navigateByUrl('/forbidden');
    return false;
  }
  return true;
};
