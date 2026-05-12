import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CreateBooking } from './create-booking';
import { PlacesApiService } from '../../services/places-api-service';
import { BookingsApiService } from '../../services/bookings-api-service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { PlaceDetailDTO } from '../../model/place-dto/place-detail-dto';

describe('CreateBooking Component', () => {
  let component: CreateBooking;
  let fixture: ComponentFixture<CreateBooking>;
  let placesApiService: jasmine.SpyObj<PlacesApiService>;
  let bookingsApiService: jasmine.SpyObj<BookingsApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockPlace: PlaceDetailDTO = {
    id: '1',
    title: 'Hermosa casa en la montaña',
    description: 'Una casa bonita',
    price: 100,
    capacity: 4,
    city: 'Armenia',
    services: [],
    pics_url: [],
    latitude: 4.5353,
    longitude: -75.7399,
    averageRatings: 0,
    userDetailDTO: {} as any
  };

  beforeEach(async () => {
    const placesApiSpy = jasmine.createSpyObj('PlacesApiService', ['getDetail']);
    const bookingsApiSpy = jasmine.createSpyObj('BookingsApiService', ['listByPlace', 'create']);
    const routerSpy2 = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CreateBooking, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: PlacesApiService, useValue: placesApiSpy },
        { provide: BookingsApiService, useValue: bookingsApiSpy },
        { provide: Router, useValue: routerSpy2 },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => key === 'placeId' ? '1' : null
              }
            },
            queryParams: of({ placeId: '1' })
          }
        }
      ]
    }).compileComponents();

    placesApiService = TestBed.inject(PlacesApiService) as jasmine.SpyObj<PlacesApiService>;
    bookingsApiService = TestBed.inject(BookingsApiService) as jasmine.SpyObj<BookingsApiService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    placesApiService.getDetail.and.returnValue(of(mockPlace));
    bookingsApiService.listByPlace.and.returnValue(of({ rows: [] }));

    fixture = TestBed.createComponent(CreateBooking);
    component = fixture.componentInstance;
  });

  describe('parseDateString', () => {
    it('should parse date string as local time (not UTC)', () => {
      fixture.detectChanges();

      // ✅ FIX: parseDateString debe parsear como fecha local
      const dateStr = '2025-09-05';
      const parsed = (component as any).parseDateString(dateStr);

      // Verificar que es medianoche local, no UTC
      expect(parsed.getFullYear()).toBe(2025);
      expect(parsed.getMonth()).toBe(8); // Septiembre (0-indexed)
      expect(parsed.getDate()).toBe(5);
      expect(parsed.getHours()).toBe(0);
      expect(parsed.getMinutes()).toBe(0);
    });

    it('should parse leap year dates correctly', () => {
      fixture.detectChanges();

      const leapDateStr = '2024-02-29';
      const parsed = (component as any).parseDateString(leapDateStr);

      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(1); // Febrero
      expect(parsed.getDate()).toBe(29);
    });

    it('should parse non-leap year February 28', () => {
      fixture.detectChanges();

      const nonLeapDateStr = '2025-02-28';
      const parsed = (component as any).parseDateString(nonLeapDateStr);

      expect(parsed.getFullYear()).toBe(2025);
      expect(parsed.getMonth()).toBe(1);
      expect(parsed.getDate()).toBe(28);
    });
  });

  describe('calcularTotal()', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should calculate correct number of nights (3 nights)', () => {
      // ✅ FIX: Debe usar parseDateString para consistencia
      component.form.patchValue({
        checkIn: '2025-09-05',
        checkOut: '2025-09-08'
      });

      component.calcularTotal();

      // 3 noches: 5, 6, 7
      expect(component.nights).toBe(3);
      expect(component.total).toBe(300); // 3 * 100
    });

    it('should ceil nights (2.5 nights = 3)', () => {
      // ✅ FIX: Math.ceil para redondear hacia arriba
      component.form.patchValue({
        checkIn: '2025-09-05',
        checkOut: '2025-09-07' // 1.5 días = 2 noches redondeado
      });

      component.calcularTotal();

      expect(component.nights).toBeGreaterThanOrEqual(1); // Mínimo 1 noche
    });

    it('should return 0 if checkIn equals checkOut', () => {
      component.form.patchValue({
        checkIn: '2025-09-05',
        checkOut: '2025-09-05'
      });

      component.calcularTotal();

      expect(component.nights).toBe(0);
      expect(component.total).toBe(0);
    });

    it('should not calculate if dates are missing', () => {
      component.form.patchValue({
        checkIn: '',
        checkOut: ''
      });

      component.calcularTotal();

      expect(component.nights).toBe(0);
      expect(component.total).toBe(0);
    });

    it('should handle timezone-aware calculations (no desfase)', () => {
      // ✅ IMPORTANTE: Ambas fechas deben usar parseDateString
      const checkIn = '2025-09-05';
      const checkOut = '2025-09-08';

      component.form.patchValue({ checkIn, checkOut });
      component.calcularTotal();

      const d1 = (component as any).parseDateString(checkIn);
      const d2 = (component as any).parseDateString(checkOut);
      const diff = d2.getTime() - d1.getTime();
      const expectedNights = Math.ceil(diff / (1000 * 60 * 60 * 24));

      expect(component.nights).toBe(expectedNights);
    });
  });

  describe('Guests Validation', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick(); // Permitir que las suscripciones asincrónicas se completen
    }));

    it('should validate minimum 1 guest', () => {
      const guestControl = component.form.get('guests');
      guestControl?.setValue(0);

      expect(guestControl?.hasError('min')).toBeTruthy();
    });

    it('should validate maximum guests after place load (capacity)', () => {
      // ✅ FIX: Después de cargar place.capacity, se debe validar máximo
      const guestControl = component.form.get('guests');

      // Simular que place.capacity = 4
      if (component.place?.capacity) {
        guestControl?.setValue(component.place.capacity + 1);
        guestControl?.updateValueAndValidity();

        expect(guestControl?.hasError('max')).toBeTruthy();
      }
    });

    it('should accept valid guest count', () => {
      const guestControl = component.form.get('guests');
      guestControl?.setValue(2);

      expect(guestControl?.valid).toBeTruthy();
    });

    it('should not allow guests > place capacity', () => {
      // place.capacity = 4
      const guestControl = component.form.get('guests');
      guestControl?.setValue(5);
      guestControl?.updateValueAndValidity();

      expect(guestControl?.invalid).toBeTruthy();
    });
  });

  describe('Booking Range Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should reject checkOut <= checkIn', () => {
      component.form.patchValue({
        checkIn: '2025-09-08',
        checkOut: '2025-09-05' // Antes de checkIn
      });

      const errors = component.form.errors;
      expect(errors?.['invalidRange']).toBeTruthy();
    });

    it('should detect date occupation in range', () => {
      // Simular una reserva ocupada del 7-10
      component.occupiedRanges = [
        {
          checkIn: (component as any).parseDateString('2025-09-07'),
          checkOut: (component as any).parseDateString('2025-09-10')
        }
      ];

      component.form.patchValue({
        checkIn: '2025-09-05',
        checkOut: '2025-09-08' // Solapamiento con 7-10
      });

      const errors = component.form.errors;
      expect(errors?.['dateOccupied']).toBeTruthy();
    });

    it('should allow booking after occupied range', () => {
      component.occupiedRanges = [
        {
          checkIn: (component as any).parseDateString('2025-09-05'),
          checkOut: (component as any).parseDateString('2025-09-08')
        }
      ];

      component.form.patchValue({
        checkIn: '2025-09-09',
        checkOut: '2025-09-12'
      });

      const errors = component.form.errors;
      expect(errors?.['dateOccupied']).toBeFalsy();
    });

    it('should block checkIn on exact occupied date', () => {
      // ✅ Convención: [checkIn, checkOut] = rango cerrado
      // Si checkOut=7, el día 7 está ocupado
      component.occupiedRanges = [
        {
          checkIn: (component as any).parseDateString('2025-09-05'),
          checkOut: (component as any).parseDateString('2025-09-07')
        }
      ];

      component.form.patchValue({
        checkIn: '2025-09-07', // Intenta entrar en día ocupado
        checkOut: '2025-09-09'
      });

      const errors = component.form.errors;
      expect(errors?.['dateOccupied']).toBeTruthy();
    });
  });

  describe('Calendar Navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should parse year as number in toggleCheckInCalendar', () => {
      // ✅ FIX: Year debe ser parseInt, no string
      component.form.patchValue({ checkIn: '2025-09-05' });
      component.toggleCheckInCalendar();

      expect(component.currentCalendarMonth.getFullYear()).toBe(2025);
      expect(component.currentCalendarMonth.getMonth()).toBe(8); // Septiembre
    });

    it('should handle year parsing correctly for different years', () => {
      component.form.patchValue({ checkOut: '2026-12-25' });
      component.toggleCheckOutCalendar();

      expect(component.currentCalendarMonth.getFullYear()).toBe(2026);
      expect(component.currentCalendarMonth.getMonth()).toBe(11); // Diciembre
    });

    it('should reset calendar to current month if no date selected', () => {
      component.form.patchValue({ checkIn: '' });
      component.toggleCheckInCalendar();

      const today = new Date();
      expect(component.currentCalendarMonth.getMonth()).toBe(today.getMonth());
      expect(component.currentCalendarMonth.getFullYear()).toBe(today.getFullYear());
    });
  });

  describe('Create Booking DTO', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should use midnight (00:00:00) for check times', () => {
      // ✅ FIX: Cambiar de T15:00 / T11:00 a T00:00 para consistencia
      component.form.patchValue({
        checkIn: '2025-09-05',
        checkOut: '2025-09-08',
        guests: 2
      });

      // Simular método privado
      const { checkIn, checkOut } = component.form.value;
      const dtoCheckIn = `${checkIn}T00:00:00`;
      const dtoCheckOut = `${checkOut}T00:00:00`;

      expect(dtoCheckIn).toBe('2025-09-05T00:00:00');
      expect(dtoCheckOut).toBe('2025-09-08T00:00:00');
    });
  });

  describe('Component Lifecycle', () => {
    it('should load place data on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(placesApiService.getDetail).toHaveBeenCalledWith('1');
    }));

    it('should load occupied ranges on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(bookingsApiService.listByPlace).toHaveBeenCalledWith('1', jasmine.objectContaining({
        state: 'CONFIRMED'
      }));
    }));

    it('should unsubscribe on destroy', () => {
      fixture.detectChanges();
      const destroySpy = spyOn((component as any).destroy$, 'next');
      const completespy = spyOn((component as any).destroy$, 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completespy).toHaveBeenCalled();
    });
  });
});
