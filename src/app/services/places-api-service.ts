// src/app/services/places-api-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ResponseDTO } from '../model/response-dto';
import { PlaceListItemDTO } from '../model/place-list-item-dto';
import { PlaceDetailDTO } from '../model/place-detail-dto';
import { CreatePlaceDTO } from '../model/create-place-dto';
import { EditPlaceDTO } from '../model/edit-place-dto';
import { ListPlaceDTO } from '../model/list-place-dto';
import { API_BASE } from '../core/api-base-token';
import {normalizeListFromMessage, PageMeta} from '../utils/normalize';
import {CommentDTO} from '../model/comment-dto';

@Injectable({ providedIn: 'root' })
export class PlacesApiService {
  private readonly baseUrl: string;     // /api/places
  private readonly bookingsUrl: string;// /api/places  (para .../{placeId}/bookings)
  private readonly imagesBaseUrl = 'http://localhost:8080/api/images';

  constructor(private http: HttpClient, @Inject(API_BASE) private api: string) {
    this.baseUrl     = `${this.api}/places`;
    this.bookingsUrl = `${this.api}/bookings`;

  }



  // LISTA lugares
// LISTA lugares con filtros opcionales (ListPlaceDTO)
  list(page = 0, _filters?: Partial<ListPlaceDTO>): Observable<PlaceListItemDTO[]> {
    let params = new HttpParams();

    if (_filters) {
      if (_filters.city) {
        params = params.set('city', _filters.city);
      }
      if (_filters.checkIn) {
        params = params.set('checkIn', String(_filters.checkIn));
      }
      if (_filters.checkOut) {
        params = params.set('checkOut', String(_filters.checkOut));
      }
      if (_filters.guest_number != null) {
        params = params.set('guest_number', String(_filters.guest_number));
      }
      if (_filters.minimum != null) {
        params = params.set('minimum', String(_filters.minimum));
      }
      if (_filters.maximum != null) {
        params = params.set('maximum', String(_filters.maximum));
      }
      if (_filters.list && _filters.list.length > 0) {
        _filters.list.forEach(svc => {
          params = params.append('list', String(svc));
        });
      }
    }

    return this.http
      .get<ResponseDTO<PlaceListItemDTO[]>>(`${this.baseUrl}/${page}`, { params })
      .pipe(map(res => res.message));
  }


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
      .pipe(map(res => res.message));  // ← AHORA devolvemos el ID
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

  // COMENTARIOS
  listComments(id: string, page = 0): Observable<CommentDTO[]> {
    return this.http
      .get<ResponseDTO<CommentDTO[]>>(`${this.baseUrl}/${id}/comments/${page}`)
      .pipe(map(res => res.message));
  }

  // ---- RESERVAS por alojamiento (BookingController) ----
  private toIsoDateTime(date?: string, end = false): string | undefined {
    if (!date) return undefined;
    if (date.includes('T')) return date;
    return `${date}T${end ? '23:59:59' : '00:00:00'}`;
  }


  listBookings(
    placeId: string,
    page = 0,
    filters?: { from?: string; to?: string; state?: string; guest_number?: number }
  ): Observable<{ rows: any[]; page?: PageMeta<any> }> {
    let params = new HttpParams().set('page', String(page));
    if (filters) {
      const fromISO = this.toIsoDateTime(filters.from, false);
      const toISO   = this.toIsoDateTime(filters.to, true);
      if (fromISO) params = params.set('from', fromISO);
      if (toISO)   params = params.set('to', toISO);
      if (filters.state) params = params.set('state', filters.state);
      if (filters.guest_number != null) params = params.set('guest_number', String(filters.guest_number));
    }

    return this.http
      .get<ResponseDTO<any[] | { content: any[] }>>(`${this.bookingsUrl}/${placeId}/bookings`, { params })
      .pipe(map(res => normalizeListFromMessage<any>(res.message)));
  }
  getMine(page = 0) {
    return this.http
      .get<ResponseDTO<PlaceListItemDTO[]>>(`http://localhost:8080/api/places/me/${page}`)
      .pipe(map(res => res.message));
  }
  // STATS
  stats(placeId: string, from?: string, to?: string): Observable<any> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);

    return this.http
      .get<ResponseDTO<any>>(`${this.baseUrl}/${placeId}/stats`, { params })
      .pipe(map(res => res.message));
  }
  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ResponseDTO<Record<string, any>>>(this.imagesBaseUrl, formData)
      .pipe(
        map(res => {
          const data = res.message as any;
          // Ajusta la clave según lo que devuelva tu Map en el backend
          // por ejemplo: data.url, data.imageUrl, data.location...
          return data.url as string;
        })
      );
  }
  // SUBIR IMÁGENES
  uploadImages(placeId: string, files: File[], mainIndex: number): Observable<any> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    form.append('mainIndex', String(mainIndex));
    return this.http
      .post<ResponseDTO<any>>(`${this.baseUrl}/${placeId}/images`, form)
      .pipe(map(res => res.message));
  }

}
