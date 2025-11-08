import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ResponseDTO<T = any> {
  error: boolean;
  content: T;
}

export type Role = 'USER' | 'HOST';

export interface CreateUserDTO {
  name: string;
  surname: string;
  email: string;
  phone: string;
  birthDate: string;   // yyyy-MM-dd
  password: string;
  role: Role;
  country: string;     // <-- AÑADE ESTO
  photoUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AuthRegisterService {
  private readonly baseUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  register(dto: CreateUserDTO): Observable<ResponseDTO<string>> {
    return this.http.post<ResponseDTO<string>>(this.baseUrl, dto);
  }
}
