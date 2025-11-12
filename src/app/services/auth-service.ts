// src/app/services/auth-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginDTO } from '../model/login-dto';
import { ResponseDTO } from '../model/response-dto';
import { TokenDTO } from '../model/token-dto';
import { API_BASE } from '../core/api-base-token';
import { CreateUserDTO } from '../model/create-user-dto';

@Injectable({ providedIn: 'root' })
export class AuthRegisterService {
  private readonly base: string;

  constructor(private http: HttpClient, @Inject(API_BASE) private api: string) {
    this.base = `${this.api}/auth`;
  }

  public login(dto: LoginDTO): Observable<ResponseDTO<TokenDTO>> {
    return this.http.post<ResponseDTO<TokenDTO>>(`${this.base}/login`, dto);
  }

  register(dto: CreateUserDTO): Observable<ResponseDTO<string>> {
    // El backend expone POST /api/auth (sin /register)
    return this.http.post<ResponseDTO<string>>(this.base,dto);
  }
}
