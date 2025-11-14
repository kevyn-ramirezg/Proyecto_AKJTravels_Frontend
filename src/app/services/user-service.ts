// src/app/services/user-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ResponseDTO } from '../model/response-dto';
import { CreateUserDTO } from '../model/user-dto/create-user-dto';
import { EditUserDTO } from '../model/user-dto/edit-user-dto';
import { TokenService } from './token-service';
import { PlaceListItemDTO } from '../model/place-dto/place-list-item-dto';
import { API_BASE } from '../core/api-base-token';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly usersURL: string; // /api/users

  constructor(
    private http: HttpClient,
    private token: TokenService,
    @Inject(API_BASE) private api: string
  ) {
    this.usersURL = `${this.api}/users`;
  }
  // ---------- CRUD usuario ----------
  create(dto: CreateUserDTO): Observable<ResponseDTO> {
    return this.http.post<ResponseDTO>(this.usersURL, dto);
  }

  edit(dto: EditUserDTO): Observable<ResponseDTO> {
    return this.http.put<ResponseDTO>(this.usersURL, dto);
  }

  delete(id: string): Observable<ResponseDTO> {
    return this.http.delete<ResponseDTO>(`${this.usersURL}/${id}`);
  }

  get(id: string): Observable<ResponseDTO> {
    return this.http.get<ResponseDTO>(`${this.usersURL}/${id}`);
  }

  // ---------- Host dashboard ----------
  myPlaces(page = 0): Observable<PlaceListItemDTO[]> {
    const userId = this.token.getUserId();
    return this.http
      .get<ResponseDTO<PlaceListItemDTO[]>>(`${this.usersURL}/${userId}/places/host/${page}`)
      .pipe(map(res => res.message));
  }

  getHostPlacesByUserId(id: string, page = 0): Observable<PlaceListItemDTO[]> {
    return this.http
      .get<ResponseDTO<PlaceListItemDTO[]>>(`${this.usersURL}/${id}/places/host/${page}`)
      .pipe(map(res => res.message));
  }
}
