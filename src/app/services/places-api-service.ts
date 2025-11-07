import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ResponseDTO } from '../model/response-dto';
import { PlaceListItemDTO } from '../model/place-list-item-dto';
import { PlaceDetailDTO } from '../model/place-detail-dto';
import { CreatePlaceDTO } from '../model/create-place-dto';
import { EditPlaceDTO } from '../model/edit-place-dto';
import { ListPlaceDTO } from '../model/list-place-dto';
import {PlaceDTO} from '../model/place-dto';

@Injectable({ providedIn: 'root' })
export class PlacesApiService {
  private readonly baseUrl = 'http://localhost:8080/api/places';

  constructor(private http: HttpClient) {}

  // LISTA paginada (GET con body: filtros)
  list(page = 0, filters?: Partial<ListPlaceDTO>): Observable<PlaceListItemDTO[]> {
    const body = filters ?? {};
    return this.http
      .get<ResponseDTO<PlaceListItemDTO[]>>(`${this.baseUrl}/${page}`)
      .pipe(map(res => res.message));
  }

  // Alias “cómodo” para tu pantalla /my-places
  getAll(): Observable<PlaceListItemDTO[]> {
    return this.list(0);
  }

  // DETALLE
  getDetail(id: string): Observable<PlaceDetailDTO> {
    return this.http
      .get<ResponseDTO<PlaceDetailDTO>>(`${this.baseUrl}/${id}/detail`)
      .pipe(map(res => res.message));
  }

  // CREAR
  create(payload: CreatePlaceDTO): Observable<string> {
    return this.http
      .post<ResponseDTO<string>>(this.baseUrl, payload)
      .pipe(map(res => res.message));
  }

  // EDITAR
  update(id: string, payload: EditPlaceDTO): Observable<string> {
    return this.http
      .put<ResponseDTO<string>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map(res => res.message));
  }

  // ELIMINAR
  delete(id: string): Observable<string> {
    return this.http
      .delete<ResponseDTO<string>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.message));
  }

  // AMENITIES
  listAmenities(id: string): Observable<string[]> {
    return this.http
      .get<ResponseDTO<string[]>>(`${this.baseUrl}/${id}/amenities`)
      .pipe(map(res => res.message));
  }

  // COMENTARIOS (paginado)
  listComments(id: string, page = 0): Observable<any[]> {
    return this.http
      .get<ResponseDTO<any[]>>(`${this.baseUrl}/${id}/comments/${page}`)
      .pipe(map(res => res.message));
  }

  // RESERVAS (GET con body: filtros)
  listBookings(id: string, page = 0, filters?: any): Observable<any[]> {
    const body = filters ?? {};
    return this.http
      .request<ResponseDTO<any[]>>('GET', `${this.baseUrl}/${id}/bookings/${page}`, { body })
      .pipe(map(res => res.message));
  }

  // STATS (query params opcionales)
  stats(placeId: string, from?: string, to?: string): Observable<any> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http
      .get<ResponseDTO<any>>(`${this.baseUrl}/${placeId}/stats`, { params })
      .pipe(map(res => res.message));
  }

  // UPLOAD IMÁGENES (multipart)
  uploadImages(placeId: string, files: File[], mainIndex: number): Observable<any> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    form.append('mainIndex', String(mainIndex));
    return this.http
      .post<ResponseDTO<any>>(`${this.baseUrl}/${placeId}/images`, form)
      .pipe(map(res => res.message));
  }
}
