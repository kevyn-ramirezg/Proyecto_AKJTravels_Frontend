import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { loginGuard } from './login-guard';
import { TokenService } from '../services/token-service';

describe('loginGuard', () => {
  let tokenService: jasmine.SpyObj<TokenService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['isLogged']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: tokenService },
        { provide: Router, useValue: router }
      ]
    });
  });

  it('debe permitir acceso a login/register si no hay sesión', () => {
    tokenService.isLogged.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => loginGuard({} as any, {} as any));

    expect(result).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('debe redirigir al home si ya hay sesión', () => {
    tokenService.isLogged.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => loginGuard({} as any, {} as any));

    expect(result).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
