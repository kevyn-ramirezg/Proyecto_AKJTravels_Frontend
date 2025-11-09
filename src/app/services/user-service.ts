import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResponseDTO } from '../model/response-dto';
import { CreateUserDTO } from '../model/create-user-dto';
import { EditUserDTO } from '../model/edit-user-dto';

@Injectable({ providedIn: 'root' })
export class UserService {
  private usersURL = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) {}

  public create(createUserDTO: CreateUserDTO): Observable<ResponseDTO> {
    return this.http.post<ResponseDTO>(this.usersURL, createUserDTO);
  }

  public edit(editUserDTO: EditUserDTO): Observable<ResponseDTO> {
    return this.http.put<ResponseDTO>(this.usersURL, editUserDTO);
  }

  public delete(id: string): Observable<ResponseDTO> {
    return this.http.delete<ResponseDTO>(`${this.usersURL}/${id}`);
  }

  public get(id: string): Observable<ResponseDTO> {
    return this.http.get<ResponseDTO>(`${this.usersURL}/${id}`);
  }

  public getPlaces(id: string, page: number): Observable<ResponseDTO> {
    return this.http.get<ResponseDTO>(`${this.usersURL}/${id}/places`, { params: { page } }); // Si el backend usa @RequestParam para paginación se debe enviar así
  }
}
