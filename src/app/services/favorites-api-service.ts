// src/app/services/favorites-api-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../core/api-base-token';
import { PlaceListItemDTO } from '../model/place-dto/place-list-item-dto';

@Injectable({ providedIn: 'root' })
export class FavoritesApiService {

  private readonly baseUrl: string;

  constructor(
    private http: HttpClient,
    @Inject(API_BASE) api: string
  ) {
    this.baseUrl = `${api}/favorites`;
  }

  /** Marca un alojamiento como favorito (idempotente). */
  add(placeId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${placeId}`, {});
  }

  /** Quita un alojamiento de favoritos (idempotente). */
  remove(placeId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${placeId}`);
  }

  /** ¿Este alojamiento es favorito del usuario actual? */
  isMyFavorite(placeId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/me/${placeId}`);
  }

  /** ¿Cuántos usuarios lo han marcado como favorito? (para métricas de host más adelante). */
  countFavorites(placeId: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/count/${placeId}`);
  }

  /**
   * Lista plana de mis alojamientos favoritos.
   * El backend devuelve Page<Place>, aquí lo convertimos a PlaceListItemDTO[]
   * usando los campos básicos que necesitamos para las tarjetas.
   */
  listMyFavorites(page = 0, size = 50): Observable<PlaceListItemDTO[]> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http
      .get<any>(`${this.baseUrl}/me`, { params })
      .pipe(
        map(pageObj => {
          const content = pageObj?.content ?? [];
          return content.map((raw: any) => this.mapPlaceFromFavorite(raw));
        })
      );
  }

  // --- Mapeo Place (backend) -> PlaceListItemDTO (frontend) ---
  private mapPlaceFromFavorite(raw: any): PlaceListItemDTO {
    const pics = raw.pics_url ?? raw.picsUrl ?? [];
    const photo_url =
      Array.isArray(pics) && pics.length > 0 ? pics[0] : '';

    return {
      id: raw.id,
      title: raw.title ?? 'Alojamiento',
      city: raw.city ?? '',
      photo_url,
      average_rating: raw.averageRatings ?? raw.average_rating ?? 0,
      state: raw.state ?? 'ACTIVE'
    } as PlaceListItemDTO;
  }
}
