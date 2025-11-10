import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ResponseDTO } from '../model/response-dto';
import { CreateUserDTO } from '../model/create-user-dto';
import { EditUserDTO } from '../model/edit-user-dto';
import { TokenService } from './token-service';
import { PlaceListItemDTO } from '../model/place-list-item-dto';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly usersURL = 'http://localhost:8080/api/users';

  constructor(
    private http: HttpClient,
    private token: TokenService
  ) {}

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
  /**
   * Mis alojamientos (del anfitrión autenticado)
   * Backend: GET /api/users/{id}/places/host/{page}
   */
  myPlaces(page = 0): Observable<PlaceListItemDTO[]> {
    const userId = this.token.getUserId(); // id desde el JWT
    return this.http
      .get<ResponseDTO<PlaceListItemDTO[]>>(`${this.usersURL}/${userId}/places/host/${page}`)
      .pipe(map(res => res.message));
  }

  /**
   * (Opcional) alojamientos de un usuario específico (p. ej. admin)
   * Si quieres conservar tu método anterior, apunta al endpoint real.
   */
  getHostPlacesByUserId(id: string, page = 0): Observable<PlaceListItemDTO[]> {
    return this.http
      .get<ResponseDTO<PlaceListItemDTO[]>>(`${this.usersURL}/${id}/places/host/${page}`)
      .pipe(map(res => res.message));
  }
}
