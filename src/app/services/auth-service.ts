import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {LoginDTO} from '../model/login-dto';
import {ResponseDTO} from '../model/response-dto';



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
  private authURL = "http://localhost:8080/api/auth";


  constructor(private http: HttpClient) {}

  public login(loginDTO: LoginDTO): Observable<ResponseDTO> {
    return this.http.post<ResponseDTO>(`${this.authURL}/login`, loginDTO);
  }
  register(dto: CreateUserDTO): Observable<ResponseDTO<string>> {
    return this.http.post<ResponseDTO<string>>(this.authURL, dto);
  }
}
