import {Injectable, signal} from '@angular/core';

const TOKEN_KEY = 'AuthToken';

@Injectable({ providedIn: 'root' })
export class TokenService {

  public readonly isLoggedSig = signal<boolean>(!!sessionStorage.getItem(TOKEN_KEY));
  private setToken(token: string) {
    sessionStorage.setItem(TOKEN_KEY, token);
    this.isLoggedSig.set(true);
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
    sessionStorage.removeItem(TOKEN_KEY);
    this.isLoggedSig.set(false);
  }

  // --- Decodificación del payload (JWT) ---
  private decodePayload(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
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
