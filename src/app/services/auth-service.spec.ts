import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthRegisterService } from './auth-service';
import { API_BASE } from '../core/api-base-token';

describe('AuthRegisterService', () => {
  let service: AuthRegisterService;
  let httpMock: HttpTestingController;
  const apiBase = '/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE, useValue: apiBase }
      ]
    });

    service = TestBed.inject(AuthRegisterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debe enviar login a POST /api/auth/login', () => {
    const dto = { email: 'user@mail.com', password: 'secret1' };

    service.login(dto).subscribe(res => expect(res.message.token).toBe('jwt'));

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ error: false, message: { token: 'jwt' } });
  });

  it('debe registrar usuario con POST /api/auth', () => {
    const dto = {
      name: 'Ana',
      surname: 'Gomez',
      email: 'ana@mail.com',
      phone: '3001234567',
      birthDate: '2000-01-01',
      password: 'secret1',
      role: 'USER' as const,
      country: 'Colombia',
      photoUrl: ''
    };

    service.register(dto).subscribe(res => expect(res.message).toBe('created'));

    const req = httpMock.expectOne('/api/auth');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ error: false, message: 'created' });
  });

  it('debe solicitar recuperación de contraseña como texto plano', () => {
    service.requestResetPassword({ email: 'ana@mail.com' }).subscribe(res => expect(res).toBe('sent'));

    const req = httpMock.expectOne('/api/auth/forgot-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('text');
    req.flush('sent');
  });

  it('debe restablecer contraseña como texto plano', () => {
    const payload = { email: 'ana@mail.com', code: '123456', newPassword: 'secret2' };

    service.resetPassword(payload).subscribe(res => expect(res).toBe('reset'));

    const req = httpMock.expectOne('/api/auth/reset-password');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.responseType).toBe('text');
    expect(req.request.body).toEqual(payload);
    req.flush('reset');
  });
});
