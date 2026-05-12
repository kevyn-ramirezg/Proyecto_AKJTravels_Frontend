import {Injectable, signal} from '@angular/core';
import {environment} from '../../environments/environment';
import mapboxgl from 'mapbox-gl';

const TOKEN_KEY = 'AuthToken';

/**
 * Estructura del payload JWT decodificado
 * Soporta múltiples formatos de roles/authorities del backend
 */
export interface JWTPayload {
  sub?: string;           // Subject (user ID)
  name?: string;          // User name
  username?: string;      // Alternative name field
  email?: string;         // User email
  role?: string | string[];  // Single role or comma-separated
  roles?: string[];       // Array of roles
  authorities?: Array<{ authority?: string; role?: string; name?: string }>;
  auth?: string;          // Alternative authority field
  scope?: string;         // Alternative scope field
  exp?: number;           // Expiration time (seconds)
  iat?: number;           // Issued at (seconds)
  [key: string]: any;     // Allow additional fields
}

@Injectable({ providedIn: 'root' })
export class TokenService {

  public readonly isLoggedSig = signal<boolean>(!!localStorage.getItem(TOKEN_KEY));
  private logoutTimer: any = null;
  constructor() {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) this.scheduleAutoLogout(t);

    window.addEventListener('storage', (e) => {
      if (e.key === TOKEN_KEY) {
        this.isLoggedSig.set(!!e.newValue);
        if (e.newValue) this.scheduleAutoLogout(e.newValue);
        else this.clearLogoutTimer();
      }
    });
  }

  private setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    this.isLoggedSig.set(true);
  }
  private normalizeRole(input: string): string {
    return String(input).trim().replace(/^ROLE_/, '').toUpperCase(); // HOST | GUEST
  }

  public getRole(): string {
    const p = this.getPayload();
    if (!p) return 'GUEST';

    // roles posibles: "HOST", ["ROLE_HOST"], [{authority:"ROLE_HOST"}], "HOST,GUEST", etc.
    const candidate = p.role ?? p.roles ?? p.authorities ?? p.auth ?? p.scope ?? 'GUEST';
    const list = this.asStringList(candidate);
    const first = list[0] ?? 'GUEST';
    return this.normalizeRole(first);
  }
  public getUsername(): string {
    const p = this.getPayload();
    return p?.name ?? p?.username ?? p?.sub ?? '';
  }
  public getUserId(): string {
    return this.getPayload()?.sub || '';
  }
  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public isLogged(): boolean {
    const t = this.getToken();
    if (!t) return false;
    
    const expMs = this.getExpMs(t);
    // ✅ FIX: Si no hay exp, rechazar por seguridad (no asumir válido)
    if (!expMs) {
      console.warn('[TokenService] Token sin expiración detectado');
      return false;
    }
    
    return Date.now() < expMs;
  }

  public login(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    this.isLoggedSig.set(true);
    this.scheduleAutoLogout(token);
  }

  public logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.isLoggedSig.set(false);
    this.clearLogoutTimer();
  }

  // --- Decodificación del payload (JWT) ---
  private decodePayload(token: string): JWTPayload | null {
    try {
      const base64Url = token.split('.')[1];
      const json = atob(this.toBase64(base64Url));
      return JSON.parse(json) as JWTPayload;
    } catch {
      return null;
    }
  }

  private getPayload(): JWTPayload | null {
    const token = this.getToken();
    return token ? this.decodePayload(token) : null;
  }
  private clearLogoutTimer() {
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    this.logoutTimer = null;
  }
  private scheduleAutoLogout(token: string) {
    this.clearLogoutTimer();
    const expMs = this.getExpMs(token);
    if (!expMs) return; // sin exp => no programamos
    
    const delay = expMs - Date.now();
    
    // ✅ FIX: Si expira muy pronto, logout inmediato
    if (delay <= 500) {
      this.logout();
      return;
    }
    
    // ✅ FIX: Programar logout un poco antes (30s de amortiguación para race condition)
    const safeDelay = Math.max(delay - 30000, 1000);
    this.logoutTimer = setTimeout(() => this.logout(), safeDelay);
  }
  private getExpMs(token: string): number | null {
    const p = this.decodePayload(token);
    const expSec = p?.exp; // estándar JWT
    return typeof expSec === 'number' ? expSec * 1000 : null;
  }
  private toBase64(b64url: string): string {
    let s = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return s;
  }

  private asStringList(value: any): string[] {
    if (typeof value === 'string') {
      // "HOST" o "ROLE_HOST,ROLE_ADMIN"
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    if (Array.isArray(value)) {
      if (value.length && typeof value[0] === 'object') {
        // [{authority:"ROLE_HOST"}] / [{role:"HOST"}]
        return value
          .map(v => (v?.authority ?? v?.role ?? v?.name ?? ''))
          .map(String)
          .filter(Boolean);
      }
      // ["ROLE_HOST","ROLE_USER"]
      return value.map(String).filter(Boolean);
    }
    // objeto suelto {authority:"ROLE_HOST"}
    if (value && typeof value === 'object') {
      const s = value.authority ?? value.role ?? value.name ?? '';
      return s ? [String(s)] : [];
    }
    return [];
  }



}
