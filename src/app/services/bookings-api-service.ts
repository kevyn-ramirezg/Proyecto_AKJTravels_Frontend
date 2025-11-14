// src/app/services/bookings-api-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ResponseDTO } from '../model/response-dto';
import { BookingDTO, SearchBookingsParams } from '../model/booking-dto/booking-dto';
import { API_BASE } from '../core/api-base-token';
import{normalizeListFromMessage, PageMeta } from '../utils/normalize';


/*type Page<T> = { content: T[]; totalPages?: number; totalElements?: number; number?: number; size?: number };*/

@Injectable({ providedIn: 'root' })
export class BookingsApiService {
  private readonly baseUrl: string; // raíz /api

  constructor(private http: HttpClient, @Inject(API_BASE) private api: string) {
    this.baseUrl = this.api;
  }

  private toLocalDateTime(d: string) {
    return d?.length === 10 ? `${d}T00:00:00` : d;
  }

  /**
   * Lista reservas por alojamiento con filtros.
   * GET /api/places/{placeId}/bookings?state=&from=&to=&guest_number=&page=
   */
  listByPlace(
    placeId: string,
    q: SearchBookingsParams = {}
  ): Observable<{ rows: BookingDTO[]; page?: PageMeta<BookingDTO> }> {
    let params = new HttpParams();
    if (q.state)        params = params.set('state', q.state);
    if (q.from)         params = params.set('from', this.toLocalDateTime(q.from));
    if (q.to)           params = params.set('to',   this.toLocalDateTime(q.to));
    if (q.guest_number) params = params.set('guest_number', String(q.guest_number));
    if (q.page !== undefined) params = params.set('page', String(q.page));

    return this.http
      .get<ResponseDTO<BookingDTO[] | PageMeta<BookingDTO>>>(`${this.baseUrl}/bookings/${placeId}/bookings`, { params })
      .pipe(map(res => normalizeListFromMessage<BookingDTO>(res.message)));
  }

  confirm(bookingId: string) {
    return this.http.post<ResponseDTO>(`${this.baseUrl}/bookings/${bookingId}/confirm`, {});
  }
  reject(bookingId: string) {
    return this.http.post<ResponseDTO>(`${this.baseUrl}/bookings/${bookingId}/reject`, {});
  }
  delete(bookingId: string) {
    return this.http.delete<ResponseDTO>(`${this.baseUrl}/bookings/${bookingId}`);
  }
  create(placeId: string, dto: any) {
    return this.http.post(`${this.baseUrl}/bookings/${placeId}`, dto);
  }
  listUserBookings(page: number = 0) {
    return this.http.get<ResponseDTO<BookingDTO[]>>(
      `${this.baseUrl}/bookings/user?page=${page}`
    );
  }


}
/*aa*/
