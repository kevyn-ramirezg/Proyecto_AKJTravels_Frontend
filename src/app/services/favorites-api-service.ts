// src/app/services/favorites-api-service.ts
import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE } from '../core/api-base-token';
import { PlaceListItemDTO } from '../model/place-dto/place-list-item-dto';
import {FavoritePlaceDTO} from '../model/favorite-dto/favorite-place-dto';
import {PageResponse} from '../model/page-response';

@Injectable({ providedIn: 'root' })
export class FavoritesApiService {

  private readonly baseUrl: string;

  constructor(
    private http: HttpClient,
    @Inject(API_BASE) api: string
  ) {
    this.baseUrl = `${api}/favorites`;
  }

  add(placeId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${placeId}`, {});
  }

  remove(placeId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${placeId}`);
  }

  isMyFavorite(placeId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/me/${placeId}`);
  }

  countFavorites(placeId: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/count/${placeId}`);
  }

  listMyFavorites(page = 0, size = 50): Observable<PlaceListItemDTO[]> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http
      .get<PageResponse<FavoritePlaceDTO>>(`${this.baseUrl}/me`, { params })
      .pipe(
        map(pageObj => (pageObj.content ?? []).map(item => this.mapFavoriteToPlaceCard(item)))
      );
  }

  private mapFavoriteToPlaceCard(raw: FavoritePlaceDTO): PlaceListItemDTO {
    return {
      id: raw.id,
      title: raw.title ?? 'Alojamiento',
      city: raw.city ?? '',
      photo_url: raw.photoUrl ?? '',
      average_rating: raw.averageRating ?? 0,
      price: raw.price ?? 0,
      capacity: raw.capacity ?? 0,
      state: 'ACTIVE'
    } as PlaceListItemDTO;
  }

  countFavoritesBetween(placeId: string, from?: string, to?: string) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get<number>(`${this.baseUrl}/count/${placeId}/between`, { params });
  }
}
