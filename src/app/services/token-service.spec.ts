import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TokenService, JWTPayload } from './token-service';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('JWT Decoding', () => {
    it('should decode valid JWT correctly', () => {
      // Token válido con exp = year 2099
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1MjMiLCJuYW1lIjoiSm9obiBEb2UiLCJyb2xlIjoiSE9TVCIsImV4cCI6NDEwMjQ0NDgwMH0.test';
      service.login(validToken);

      const payload = (service as any).getPayload();
      expect(payload).toBeTruthy();
      expect(payload.sub).toBe('523');
      expect(payload.name).toBe('John Doe');
      expect(payload.role).toBe('HOST');
    });

    it('should handle malformed token gracefully', () => {
      const malformedToken = 'invalid.token.here';
      service.login(malformedToken);

      const payload = (service as any).getPayload();
      expect(payload).toBeNull();
    });

    it('should return null for empty payload', () => {
      const emptyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..test'; // Payload vacío
      service.login(emptyToken);

      const payload = (service as any).getPayload();
      expect(payload).toBeNull();
    });
  });

  describe('isLogged() - Token Expiration', () => {
    it('should return true for non-expired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // Expira en 1 hora
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: futureExp }))}.test`;
      service.login(token);

      expect(service.isLogged()).toBe(true);
    });

    it('should return false for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // Expiró hace 1 hora
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: pastExp }))}.test`;
      service.login(token);

      expect(service.isLogged()).toBe(false);
    });

    it('should return false if no token exists', () => {
      expect(service.isLogged()).toBe(false);
    });

    // ✅ TEST CRÍTICO: Token sin campo exp debe ser rechazado
    it('should return false for token without exp field (security fix)', () => {
      const tokenWithoutExp = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ sub: '123', name: 'Test' }))}.test`;
      service.login(tokenWithoutExp);

      // ✅ FIX: Debe rechazar, no asumir válido
      expect(service.isLogged()).toBe(false);
    });

    it('should return false for token expiring in less than 500ms', () => {
      const almostExpiredExp = Math.floor(Date.now() / 1000) + 0.1; // 100ms
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: almostExpiredExp }))}.test`;
      service.login(token);

      // Token está casi expirado
      expect(service.isLogged()).toBe(false);
    });
  });

  describe('Auto-Logout Scheduling', () => {
    it('should schedule logout for future expiration', fakeAsync(() => {
      const futureExp = Math.floor(Date.now() / 1000) + 2; // Expira en 2 segundos
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: futureExp }))}.test`;
      service.login(token);

      expect(service.isLogged()).toBe(true);

      // Avanzar 3 segundos (logoutTimer debería haberse ejecutado)
      tick(3000);

      expect(service.isLogged()).toBe(false);
    }));

    it('should logout immediately if token already expired', fakeAsync(() => {
      const pastExp = Math.floor(Date.now() / 1000) - 1; // Ya expirado
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: pastExp }))}.test`;
      service.login(token);

      // Debe logout inmediatamente
      tick(100);
      expect(service.isLogged()).toBe(false);
    }));

    it('should logout immediately if expiration in <= 500ms', fakeAsync(() => {
      const veryNearExp = Math.floor(Date.now() / 1000) + 0.2; // 200ms
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: veryNearExp }))}.test`;
      service.login(token);

      // ✅ FIX: Debe logout sin esperar
      tick(100);
      expect(service.isLogged()).toBe(false);
    }));

    it('should clear previous logout timer when new token is set', fakeAsync(() => {
      // Token 1: expira en 60 segundos (con amortiguación de 30s => logout en 30s)
      const exp1 = Math.floor(Date.now() / 1000) + 60;
      const token1 = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: exp1 }))}.test`;
      service.login(token1);

      // Token 2: expira en 100 segundos (con amortiguación de 30s => logout en 70s)
      const exp2 = Math.floor(Date.now() / 1000) + 100;
      const token2 = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: exp2 }))}.test`;
      service.login(token2); // Segundo login debe cancelar el timer anterior

      // Después de 35 segundos, debería estar logueado (token2 aún válido)
      // Si no hubiera cancelado el timer anterior, estaría deslogueado en 30s
      tick(35000);
      expect(service.isLogged()).toBe(true); 

      // Después de 75 segundos total, debería estar deslogueado (expiración de token2)
      tick(40000);
      expect(service.isLogged()).toBe(false);
    }));
  });

  describe('Role Normalization', () => {
    it('should normalize ROLE_HOST to HOST', () => {
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ role: 'ROLE_HOST' }))}.test`;
      service.login(token);

      expect(service.getRole()).toBe('HOST');
    });

    it('should normalize ROLE_GUEST to GUEST', () => {
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ role: 'ROLE_GUEST' }))}.test`;
      service.login(token);

      expect(service.getRole()).toBe('GUEST');
    });

    it('should handle array of roles [ROLE_HOST]', () => {
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ roles: ['ROLE_HOST', 'ROLE_ADMIN'] }))}.test`;
      service.login(token);

      expect(service.getRole()).toBe('HOST'); // Primera rol
    });

    it('should default to GUEST if no role found', () => {
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ sub: '123' }))}.test`;
      service.login(token);

      expect(service.getRole()).toBe('GUEST');
    });
  });

  describe('Username Extraction', () => {
    it('should extract name field', () => {
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ name: 'John Doe' }))}.test`;
      service.login(token);

      expect(service.getUsername()).toBe('John Doe');
    });

    it('should extract username field if name not present', () => {
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ username: 'johndoe' }))}.test`;
      service.login(token);

      expect(service.getUsername()).toBe('johndoe');
    });

    it('should extract sub field as fallback', () => {
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ sub: '12345' }))}.test`;
      service.login(token);

      expect(service.getUsername()).toBe('12345');
    });
  });

  describe('Login/Logout', () => {
    it('should set isLoggedSig to true on login', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: futureExp }))}.test`;

      service.login(token);

      expect(service.isLoggedSig()).toBe(true);
    });

    it('should set isLoggedSig to false on logout', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: futureExp }))}.test`;

      service.login(token);
      expect(service.isLoggedSig()).toBe(true);

      service.logout();
      expect(service.isLoggedSig()).toBe(false);
    });

    it('should remove token from localStorage on logout', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ exp: futureExp }))}.test`;

      service.login(token);
      expect(localStorage.getItem('AuthToken')).toBeTruthy();

      service.logout();
      expect(localStorage.getItem('AuthToken')).toBeNull();
    });
  });
});
