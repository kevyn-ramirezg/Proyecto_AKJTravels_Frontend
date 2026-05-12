import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { roleGuard } from './role-guard';
import { TokenService } from '../services/token-service';

describe('roleGuard', () => {
  let tokenService: jasmine.SpyObj<TokenService>;
  let router: jasmine.SpyObj<Router>;

  function routeWithRoles(roles: string[]): ActivatedRouteSnapshot {
    return { data: { expectedRole: roles } } as unknown as ActivatedRouteSnapshot;
  }

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['isLogged', 'getRole']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: tokenService },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('debe redirigir a login si no hay sesión', () => {
    tokenService.isLogged.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => roleGuard(routeWithRoles(['HOST']), {} as any));

    expect(result).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('debe permitir acceso cuando el rol coincide', () => {
    tokenService.isLogged.and.returnValue(true);
    tokenService.getRole.and.returnValue('HOST');

    const result = TestBed.runInInjectionContext(() => roleGuard(routeWithRoles(['HOST']), {} as any));

    expect(result).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('debe aceptar roles esperados con prefijo ROLE_', () => {
    tokenService.isLogged.and.returnValue(true);
    tokenService.getRole.and.returnValue('HOST');

    const result = TestBed.runInInjectionContext(() => roleGuard(routeWithRoles(['ROLE_HOST']), {} as any));

    expect(result).toBeTrue();
  });

  it('debe redirigir a forbidden cuando el rol no coincide', () => {
    tokenService.isLogged.and.returnValue(true);
    tokenService.getRole.and.returnValue('USER');

    const result = TestBed.runInInjectionContext(() => roleGuard(routeWithRoles(['HOST']), {} as any));

    expect(result).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/forbidden');
  });

  it('debe permitir acceso si la ruta no define roles esperados', () => {
    tokenService.isLogged.and.returnValue(true);
    tokenService.getRole.and.returnValue('USER');

    const result = TestBed.runInInjectionContext(() => roleGuard(routeWithRoles([]), {} as any));

    expect(result).toBeTrue();
  });
});
