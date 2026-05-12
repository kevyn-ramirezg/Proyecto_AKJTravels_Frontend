import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BookingsApiService } from './bookings-api-service';
import { API_BASE } from '../core/api-base-token';

describe('BookingsApiService', () => {
  let service: BookingsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE, useValue: '/api' }
      ]
    });

    service = TestBed.inject(BookingsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debe crear reserva', () => {
    const dto = { checkIn: '2026-05-20T00:00:00', checkOut: '2026-05-22T00:00:00', guest_number: 2 };

    service.create('place-1', dto).subscribe();

    const req = httpMock.expectOne('/api/bookings/place-1');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush({ error: false, message: 'created' });
  });

  it('debe listar reservas del usuario autenticado', () => {
    service.listUserBookings().subscribe(res => expect(res.message.length).toBe(1));

    const req = httpMock.expectOne('/api/bookings/user');
    expect(req.request.method).toBe('GET');
    req.flush({ error: false, message: [{ id: 'booking-1' }] });
  });

  it('debe cancelar reserva con DELETE', () => {
    service.cancel('booking-1').subscribe(res => expect(res.message).toBe('canceled'));

    const req = httpMock.expectOne('/api/bookings/booking-1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ error: false, message: 'canceled' });
  });

  it('debe confirmar reserva como anfitrión', () => {
    service.confirm('booking-1').subscribe();

    const req = httpMock.expectOne('/api/bookings/booking-1/confirm');
    expect(req.request.method).toBe('POST');
    req.flush({ error: false, message: 'confirmed' });
  });

  it('debe rechazar reserva como anfitrión', () => {
    service.reject('booking-1').subscribe();

    const req = httpMock.expectOne('/api/bookings/booking-1/reject');
    expect(req.request.method).toBe('PATCH');
    req.flush({ error: false, message: 'rejected' });
  });

  it('debe listar reservas por alojamiento con filtros normalizados', () => {
    service.listByPlace('place-1', {
      state: 'PENDING',
      from: '2026-05-20',
      to: '2026-05-22',
      guest_number: 2,
      page: 1
    }).subscribe(result => {
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe('booking-1');
      expect(result.rows[0].guestName).toBe('Ana Gomez');
      expect(result.rows[0].state).toBe('PENDING');
    });

    const req = httpMock.expectOne(r =>
      r.url === '/api/bookings/place-1/bookings' &&
      r.params.get('state') === 'PENDING' &&
      r.params.get('from') === '2026-05-20T00:00:00' &&
      r.params.get('to') === '2026-05-22T00:00:00' &&
      r.params.get('guest_number') === '2' &&
      r.params.get('page') === '1'
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      error: false,
      message: [
        {
          id: 'booking-1',
          checkIn: '2026-05-20T00:00:00',
          checkOut: '2026-05-22T00:00:00',
          bookingState: 'PENDING',
          user: { name: 'Ana', lastName: 'Gomez' }
        }
      ]
    });
  });
});
