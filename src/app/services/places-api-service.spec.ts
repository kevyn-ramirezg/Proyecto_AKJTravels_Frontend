import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PlacesApiService } from './places-api-service';
import { API_BASE } from '../core/api-base-token';
import { TokenService } from './token-service';

describe('PlacesApiService', () => {
  let service: PlacesApiService;
  let httpMock: HttpTestingController;
  let tokenService: jasmine.SpyObj<TokenService>;

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['getUserId']);
    tokenService.getUserId.and.returnValue('host-1');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE, useValue: '/api' },
        { provide: TokenService, useValue: tokenService }
      ]
    });

    service = TestBed.inject(PlacesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debe listar alojamientos con filtros', () => {
    service.list(2, {
      city: 'Armenia',
      checkIn: '2026-05-20T00:00:00',
      checkOut: '2026-05-22T00:00:00',
      guest_number: 2,
      minimum: 100000,
      maximum: 400000,
      list: ['WIFI', 'POOL']
    } as any).subscribe(rows => expect(rows.length).toBe(1));

    const req = httpMock.expectOne(r =>
      r.url === '/api/places/2' &&
      r.params.get('page') === '2' &&
      r.params.get('city') === 'Armenia' &&
      r.params.get('guest_number') === '2' &&
      r.params.get('minimum') === '100000' &&
      r.params.get('maximum') === '400000' &&
      (r.params.getAll('list') ?? []).join(',') === 'WIFI,POOL'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ error: false, message: [{ id: 'place-1', title: 'Casa' }] });
  });

  it('debe obtener detalle del alojamiento', () => {
    service.getDetail('place-1').subscribe(detail => expect(detail.id).toBe('place-1'));

    const req = httpMock.expectOne('/api/places/place-1/detail');
    expect(req.request.method).toBe('GET');
    req.flush({ error: false, message: { id: 'place-1', title: 'Casa' } });
  });

  it('debe crear alojamiento y devolver id', () => {
    const payload = { title: 'Casa', price: 200000 } as any;

    service.create(payload).subscribe(id => expect(id).toBe('place-1'));

    const req = httpMock.expectOne('/api/places');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ error: false, message: 'place-1' });
  });

  it('debe actualizar alojamiento', () => {
    const payload = { title: 'Casa actualizada' } as any;

    service.update('place-1', payload).subscribe(msg => expect(msg).toBe('updated'));

    const req = httpMock.expectOne('/api/places/place-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ error: false, message: 'updated' });
  });

  it('debe eliminar alojamiento', () => {
    service.delete('place-1').subscribe(msg => expect(msg).toBe('deleted'));

    const req = httpMock.expectOne('/api/places/place-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ error: false, message: 'deleted' });
  });

  it('debe listar comentarios de alojamiento', () => {
    service.listComments('place-1', 3).subscribe(rows => expect(rows.length).toBe(1));

    const req = httpMock.expectOne('/api/places/place-1/comments/3');
    expect(req.request.method).toBe('GET');
    req.flush({ error: false, message: [{ id: 'comment-1', comment: 'Excelente' }] });
  });

  it('debe obtener alojamientos propios del anfitrión autenticado', () => {
    service.getMine(1).subscribe(rows => expect(rows.length).toBe(1));

    const req = httpMock.expectOne('/api/users/host-1/places/host/1');
    expect(req.request.method).toBe('GET');
    req.flush({ error: false, message: [{ id: 'place-1' }] });
  });

  it('debe consultar estadísticas del alojamiento con rango de fechas', () => {
    service.stats('place-1', '2026-05-01', '2026-05-12').subscribe(stats => expect(stats.totalBookings).toBe(2));

    const req = httpMock.expectOne(r =>
      r.url === '/api/places/place-1/stats' &&
      r.params.get('from') === '2026-05-01' &&
      r.params.get('to') === '2026-05-12'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ error: false, message: { totalBookings: 2 } });
  });

  it('debe subir una imagen individual y devolver la URL', () => {
    const file = new File([new Uint8Array([1])], 'photo.png', { type: 'image/png' });

    service.uploadImage(file).subscribe(url => expect(url).toBe('https://cdn/photo.png'));

    const req = httpMock.expectOne('/api/images');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ error: false, message: { url: 'https://cdn/photo.png' } });
  });

  it('debe subir imágenes de alojamiento con mainIndex', () => {
    const file = new File([new Uint8Array([1])], 'photo.png', { type: 'image/png' });

    service.uploadImages('place-1', [file], 0).subscribe(msg => expect(msg).toEqual({ ok: true }));

    const req = httpMock.expectOne('/api/places/place-1/images');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    req.flush({ error: false, message: { ok: true } });
  });
});
