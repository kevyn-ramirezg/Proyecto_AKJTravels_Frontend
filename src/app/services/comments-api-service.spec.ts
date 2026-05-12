import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CommentsApiService } from './comments-api-service';
import { API_BASE } from '../core/api-base-token';

describe('CommentsApiService', () => {
  let service: CommentsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE, useValue: '/api' }
      ]
    });

    service = TestBed.inject(CommentsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('debe responder comentario como anfitrión', () => {
    service.reply('comment-1', 'Gracias por tu visita').subscribe(value => expect(value).toBe('ok'));

    const req = httpMock.expectOne('/api/comments/comment-1/reply');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reply: 'Gracias por tu visita' });
    req.flush({ error: false, message: 'ok' });
  });

  it('debe crear comentario por reserva finalizada', () => {
    const payload = { rating: 5, comment: 'Excelente' };

    service.createForBooking('booking-1', payload).subscribe(value => expect(value).toBe('created'));

    const req = httpMock.expectOne('/api/bookings/booking-1/comments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ error: false, message: 'created' });
  });

  it('debe conservar endpoint legado de comentario por alojamiento', () => {
    const payload = { rating: 4, comment: 'Bueno' };

    service.createForPlace('place-1', payload).subscribe(value => expect(value).toBe('created'));

    const req = httpMock.expectOne('/api/places/place-1/comments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ error: false, message: 'created' });
  });
});
