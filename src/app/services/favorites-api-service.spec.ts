import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FavoritesApiService } from './favorites-api-service';
import { API_BASE } from '../core/api-base-token';

describe('FavoritesApiService', () => {
  let service: FavoritesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE, useValue: '/api' }
      ]
    });

    service = TestBed.inject(FavoritesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debe agregar favorito', () => {
    service.add('place-1').subscribe();

    const req = httpMock.expectOne('/api/favorites/place-1');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('debe eliminar favorito', () => {
    service.remove('place-1').subscribe();

    const req = httpMock.expectOne('/api/favorites/place-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('debe consultar si es favorito del usuario', () => {
    service.isMyFavorite('place-1').subscribe(value => expect(value).toBeTrue());

    const req = httpMock.expectOne('/api/favorites/me/place-1');
    expect(req.request.method).toBe('GET');
    req.flush(true);
  });

  it('debe contar favoritos', () => {
    service.countFavorites('place-1').subscribe(value => expect(value).toBe(3));

    const req = httpMock.expectOne('/api/favorites/count/place-1');
    expect(req.request.method).toBe('GET');
    req.flush(3);
  });

  it('debe listar favoritos y mapearlos a tarjetas de alojamiento', () => {
    service.listMyFavorites(2, 10).subscribe(rows => {
      expect(rows.length).toBe(1);
      expect(rows[0].id).toBe('place-1');
      expect(rows[0].title).toBe('Casa');
      expect(rows[0].state).toBe('ACTIVE');
    });

    const req = httpMock.expectOne(r =>
      r.url === '/api/favorites/me' &&
      r.params.get('page') === '2' &&
      r.params.get('size') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [
        { id: 'place-1', title: 'Casa', city: 'Armenia', photoUrl: 'photo.jpg', averageRating: 4.8, price: 200000, capacity: 4 }
      ],
      totalElements: 1,
      totalPages: 1,
      number: 2,
      size: 10
    });
  });

  it('debe contar favoritos por rango de fechas', () => {
    service.countFavoritesBetween('place-1', '2026-05-01', '2026-05-12').subscribe(value => expect(value).toBe(5));

    const req = httpMock.expectOne(r =>
      r.url === '/api/favorites/count/place-1/between' &&
      r.params.get('from') === '2026-05-01' &&
      r.params.get('to') === '2026-05-12'
    );
    expect(req.request.method).toBe('GET');
    req.flush(5);
  });
});
