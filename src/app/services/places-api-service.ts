import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ResponseDTO } from '../model/response-dto';
import { PlaceListItemDTO } from '../model/place-list-item-dto';
import { PlaceDetailDTO } from '../model/place-detail-dto';
import { CreatePlaceDTO } from '../model/create-place-dto';
import { EditPlaceDTO } from '../model/edit-place-dto';
import { ListPlaceDTO } from '../model/list-place-dto';

@Injectable({ providedIn: 'root' })
export class PlacesApiService {
  private readonly baseUrl = '/api/places';

  constructor(private http: HttpClient) {}

  // ✅ GET listado paginado con filtros opcionales
  list(page = 0, filters?: Partial<ListPlaceDTO>): Observable<PlaceListItemDTO[]> {
    const body = filters ?? {};
    return this.http
      .request<ResponseDTO<PlaceListItemDTO[]>>('GET', `${this.baseUrl}/${page}`, { body })
      .pipe(map(res => res.message));
  }

  // ✅ Alias cómodo para tu componente actual
  getAll(): Observable<PlaceListItemDTO[]> {
    return this.list(0);
  }

  getDetail(id: string): Observable<PlaceDetailDTO> {
    return this.http
      .get<ResponseDTO<PlaceDetailDTO>>(`${this.baseUrl}/${id}/detail`)
      .pipe(map(res => res.message));
  }

  create(payload: CreatePlaceDTO): Observable<string> {
    return this.http
      .post<ResponseDTO<string>>(this.baseUrl, payload)
      .pipe(map(res => res.message));
  }

  update(id: string, payload: EditPlaceDTO): Observable<string> {
    return this.http
      .put<ResponseDTO<string>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map(res => res.message));
  }

  delete(id: string): Observable<string> {
    return this.http
      .delete<ResponseDTO<string>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.message));
  }
}
