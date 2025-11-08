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

  public create(createUserDTO: CreateUserDTO): Observable<ResponseDTO<string>> {
    return this.http.post<ResponseDTO<string>>(this.usersURL, createUserDTO);
  }

  public edit(editUserDTO: EditUserDTO): Observable<ResponseDTO<string>> {
    return this.http.put<ResponseDTO<string>>(this.usersURL, editUserDTO);
  }

  public delete(id: string): Observable<ResponseDTO<string>> {
    return this.http.delete<ResponseDTO<string>>(`${this.usersURL}/${id}`);
  }

  public get(id: string): Observable<ResponseDTO<any>> {
    return this.http.get<ResponseDTO<any>>(`${this.usersURL}/${id}`);
  }

  public getPlaces(id: string, page: number): Observable<ResponseDTO<any>> {
    return this.http.get<ResponseDTO<any>>(`${this.usersURL}/${id}/places`, {
      params: { page }
    });
  }
}
