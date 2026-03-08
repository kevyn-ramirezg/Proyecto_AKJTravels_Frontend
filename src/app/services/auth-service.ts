// src/app/services/auth-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginDTO } from '../model/auth-dto/login-dto';
import { ResponseDTO } from '../model/response-dto';
import { TokenDTO } from '../model/auth-dto/token-dto';
import { API_BASE } from '../core/api-base-token';
import { CreateUserDTO } from '../model/user-dto/create-user-dto';

// ⬇️ Exporta los DTOs para que el componente pueda importarlos
export interface RequestResetPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  email: string;
  code: string;
  newPassword: string;
}
//
@Injectable({ providedIn: 'root' })
export class AuthRegisterService {
  private readonly base: string;

  constructor(private http: HttpClient, @Inject(API_BASE) private api: string) {
    this.base = `${this.api}/auth`;
  }

  public login(dto: LoginDTO): Observable<ResponseDTO<TokenDTO>> {
    return this.http.post<ResponseDTO<TokenDTO>>(`${this.base}/login`, dto);
  }

  public register(dto: CreateUserDTO): Observable<ResponseDTO<string>> {
    // El backend expone POST /api/auth (sin /register)
    return this.http.post<ResponseDTO<string>>(this.base, dto);
  }

  // Devuelven String plano, por eso usamos responseType: 'text'
  public requestResetPassword(payload: RequestResetPasswordDTO): Observable<string> {
    return this.http.post(`${this.base}/forgot-password`, payload, {
      responseType: 'text'
    });
  }

  public resetPassword(payload: ResetPasswordDTO): Observable<string> {
    return this.http.patch(`${this.base}/reset-password`, payload, {
      responseType: 'text'
    });
  }
}

