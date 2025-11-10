import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ResponseDTO } from '../model/response-dto';
import { BookingDTO, SearchBookingsParams } from '../model/booking-dto';

type Page<T> = { content: T[]; totalPages?: number; totalElements?: number; number?: number; size?: number };

@Injectable({ providedIn: 'root' })
export class BookingsApiService {
  private readonly baseUrl = 'http://localhost:8080/api'; // raíz

  constructor(private http: HttpClient) {}

  /**
   * Lista reservas por alojamiento con filtros (GET con query params).
   * Endpoint esperado: GET /api/places/{placeId}/bookings?state=&from=&to=&guest_number=&page=
   * Si tu backend devuelve lista simple o página, lo normalizamos a {rows, page?}
   */
  listByPlace(placeId: string, q: SearchBookingsParams = {}): Observable<{ rows: BookingDTO[]; page?: Page<BookingDTO> }> {
    let params = new HttpParams();
    if (q.state)         params = params.set('state', q.state);
    if (q.from)          params = params.set('from', q.from);
    if (q.to)            params = params.set('to', q.to);
    if (q.guest_number)  params = params.set('guest_number', String(q.guest_number));
    if (q.page !== undefined) params = params.set('page', String(q.page));

    return this.http
      .get<ResponseDTO<BookingDTO[] | Page<BookingDTO>>>(`${this.baseUrl}/places/${placeId}/bookings`, { params })
      .pipe(
        map(res => {
          const msg = res.message as any;
          // normaliza: si viene paginado
          if (msg && Array.isArray(msg.content)) {
            return { rows: msg.content as BookingDTO[], page: msg as Page<BookingDTO> };
          }
          // si viene lista simple
          return { rows: (msg ?? []) as BookingDTO[] };
        })
      );
  }

  /** Confirmar (aprobar) reserva */
  confirm(bookingId: string) {
    return this.http.post<ResponseDTO>(`${this.baseUrl}/bookings/${bookingId}/confirm`, {});
  }

  /** Rechazar/cancelar (si habilitas endpoint /reject en el back) */
  reject(bookingId: string) {
    return this.http.post<ResponseDTO>(`${this.baseUrl}/bookings/${bookingId}/reject`, {});
  }

  /** Eliminar reserva (si la gestión borra/soft) */
  delete(bookingId: string) {
    return this.http.delete<ResponseDTO>(`${this.baseUrl}/bookings/${bookingId}`);
  }
}
