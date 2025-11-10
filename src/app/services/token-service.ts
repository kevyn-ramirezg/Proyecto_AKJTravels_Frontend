import {Injectable, signal} from '@angular/core';

const TOKEN_KEY = 'AuthToken';

@Injectable({ providedIn: 'root' })
export class TokenService {

  public readonly isLoggedSig = signal<boolean>(!!localStorage.getItem(TOKEN_KEY));
  private logoutTimer: any = null;
  constructor() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) this.scheduleAutoLogout(token);

    // Sincroniza login/logout entre pestañas/ventanas
    window.addEventListener('storage', (e) => {
      if (e.key === TOKEN_KEY) {
        this.isLoggedSig.set(!!e.newValue);
        // si cambió el token, reprograma el auto-logout
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
    return expMs ? Date.now() < expMs : true; // si no hay exp, asumimos válido
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
  private decodePayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const json = atob(this.toBase64(base64Url));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private getPayload(): any {
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
    if (delay <= 0) { this.logout(); return; }
    this.logoutTimer = setTimeout(() => this.logout(), delay);
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
