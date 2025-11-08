import { Injectable } from '@angular/core';

const TOKEN_KEY = 'AuthToken';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private setToken(token: string) {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  public getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  public isLogged(): boolean {
    return !!this.getToken();
  }

  public login(token: string) {
    this.setToken(token);
  }

  public logout() {
    sessionStorage.clear();
  }

  // --- Decodificación del payload (JWT) ---
  private decodePayload(token: string): any {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }

  private getPayload(): any {
    const token = this.getToken();
    return token ? this.decodePayload(token) : null;
  }

  public getUserId(): string {
    return this.getPayload()?.sub || '';
  }

  public getRole(): string {
    return this.getPayload()?.role || '';
  }
}
