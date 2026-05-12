import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { TokenService } from '../services/token-service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenService: jasmine.SpyObj<TokenService>;

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['getToken']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenService, useValue: tokenService }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe agregar Authorization a endpoints protegidos cuando existe token', () => {
    tokenService.getToken.and.returnValue('jwt-token');

    http.get('/api/bookings/user').subscribe();

    const req = httpMock.expectOne('/api/bookings/user');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({});
  });

  it('no debe agregar Authorization cuando no existe token', () => {
    tokenService.getToken.and.returnValue(null);

    http.get('/api/bookings/user').subscribe();

    const req = httpMock.expectOne('/api/bookings/user');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no debe agregar Authorization al login', () => {
    tokenService.getToken.and.returnValue('jwt-token');

    http.post('/api/auth/login', { email: 'test@mail.com', password: '123456' }).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('no debe agregar Authorization a recuperación de contraseña', () => {
    tokenService.getToken.and.returnValue('jwt-token');

    http.post('/api/auth/forgot-password', { email: 'test@mail.com' }).subscribe();

    const req = httpMock.expectOne('/api/auth/forgot-password');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush('ok');
  });

  it('no debe agregar Authorization a restablecimiento de contraseña', () => {
    tokenService.getToken.and.returnValue('jwt-token');

    http.patch('/api/auth/reset-password', { email: 'test@mail.com', code: '123456', newPassword: 'secret1' }).subscribe();

    const req = httpMock.expectOne('/api/auth/reset-password');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush('ok');
  });
});
