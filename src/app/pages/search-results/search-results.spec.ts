import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchResultsComponent } from './search-results';
import { ActivatedRoute } from '@angular/router';
import { PlacesApiService } from '../../services/places-api-service';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

describe('SearchResultsComponent', () => {
  let component: SearchResultsComponent;
  let fixture: ComponentFixture<SearchResultsComponent>;
  let placesApiService: jasmine.SpyObj<PlacesApiService>;
  let activatedRoute: any;

  beforeEach(async () => {
    const placesApiSpy = jasmine.createSpyObj('PlacesApiService', ['list']);
    const activatedRouteSpy = {
      queryParams: of({})
    };

    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent, CommonModule, RouterModule],
      providers: [
        { provide: PlacesApiService, useValue: placesApiSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    placesApiService = TestBed.inject(PlacesApiService) as jasmine.SpyObj<PlacesApiService>;
    activatedRoute = TestBed.inject(ActivatedRoute);

    placesApiService.list.and.returnValue(of([]));

    fixture = TestBed.createComponent(SearchResultsComponent);
    component = fixture.componentInstance;
  });

  describe('Date Validation - toBackendDate()', () => {
    it('should convert valid DD/MM/YYYY date to backend format', () => {
      const dateStr = '05/09/2025';
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBe('2025-09-05T00:00:00');
    });

    it('should use end of day time when endOfDay=true', () => {
      const dateStr = '05/09/2025';
      const result = (component as any).toBackendDate(dateStr, true);

      expect(result).toBe('2025-09-05T23:59:59');
    });

    it('should return undefined for undefined input', () => {
      const result = (component as any).toBackendDate(undefined, false);

      expect(result).toBeUndefined();
    });

    it('should return undefined for malformed date (wrong separator)', () => {
      const dateStr = '05-09-2025'; // Guion en lugar de slash
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBeUndefined();
    });

    // ✅ FIX: Validar rango de mes
    it('should reject invalid month (> 12)', () => {
      const dateStr = '05/13/2025'; // Mes 13
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBeUndefined();
    });

    // ✅ FIX: Validar rango de mes
    it('should reject invalid month (< 1)', () => {
      const dateStr = '05/00/2025'; // Mes 0
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBeUndefined();
    });

    // ✅ FIX: Validar rango de día
    it('should reject invalid day (> 31)', () => {
      const dateStr = '32/09/2025'; // Día 32
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBeUndefined();
    });

    // ✅ FIX: Validar rango de día
    it('should reject invalid day (< 1)', () => {
      const dateStr = '00/09/2025'; // Día 0
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBeUndefined();
    });

    // ✅ FIX: Detectar febrero 31 (inválido)
    it('should reject February 31 (invalid date)', () => {
      const dateStr = '31/02/2025'; // Feb 31 no existe
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBeUndefined();
    });

    // ✅ FIX: Aceptar febrero 29 en año bisiesto
    it('should accept February 29 in leap year', () => {
      const dateStr = '29/02/2024'; // 2024 es bisiesto
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBe('2024-02-29T00:00:00');
    });

    // ✅ FIX: Rechazar febrero 29 en año no bisiesto
    it('should reject February 29 in non-leap year', () => {
      const dateStr = '29/02/2025'; // 2025 no es bisiesto
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBeUndefined();
    });

    // ✅ FIX: Validar rango de año
    it('should reject year < 2000', () => {
      const dateStr = '05/09/1999';
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBeUndefined();
    });

    // ✅ FIX: Validar rango de año
    it('should reject year > 2100', () => {
      const dateStr = '05/09/2101';
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBeUndefined();
    });

    it('should accept boundary year 2000', () => {
      const dateStr = '05/09/2000';
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBe('2000-09-05T00:00:00');
    });

    it('should accept boundary year 2100', () => {
      const dateStr = '05/09/2100';
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBe('2100-09-05T00:00:00');
    });

    it('should handle single digit day/month with padding', () => {
      const dateStr = '5/9/2025';
      const result = (component as any).toBackendDate(dateStr, false);

      expect(result).toBe('2025-09-05T00:00:00');
    });
  });

  describe('Price Filter Validation', () => {
    it('should process minPrice=0 correctly (not skip it)', () => {
      // ✅ FIX: Usar !== undefined en lugar de truthy check
      activatedRoute.queryParams = of({
        minimum: '0'
      });

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.criteria.minPrice).toBe(0); // 0 debe ser válido
    });

    it('should process maxPrice=0 correctly', () => {
      // ✅ FIX: Usar !== undefined
      activatedRoute.queryParams = of({
        maximum: '0'
      });

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.criteria.maxPrice).toBe(0);
    });

    it('should ignore missing price parameters', () => {
      activatedRoute.queryParams = of({
        location: 'Armenia'
      });

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.criteria.minPrice).toBeUndefined();
      expect(component.criteria.maxPrice).toBeUndefined();
    });

    it('should parse price as number', () => {
      activatedRoute.queryParams = of({
        minimum: '50',
        maximum: '200'
      });

      component.ngOnInit();
      fixture.detectChanges();

      expect(typeof component.criteria.minPrice).toBe('number');
      expect(typeof component.criteria.maxPrice).toBe('number');
      expect(component.criteria.minPrice).toBe(50);
      expect(component.criteria.maxPrice).toBe(200);
    });
  });

  describe('Filter Application', () => {
    it('should filter by minimum price', () => {
      component.criteria = { minPrice: 100 };

      const mockPlaces = [
        { title: 'Cheap', price: 50, city: 'Armenia' } as any,
        { title: 'Expensive', price: 150, city: 'Armenia' } as any
      ];

      const filtered = (component as any).applyFilters(mockPlaces);

      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toBe('Expensive');
    });

    it('should filter by maximum price', () => {
      component.criteria = { maxPrice: 100 };

      const mockPlaces = [
        { title: 'Cheap', price: 50, city: 'Armenia' } as any,
        { title: 'Expensive', price: 150, city: 'Armenia' } as any
      ];

      const filtered = (component as any).applyFilters(mockPlaces);

      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toBe('Cheap');
    });

    it('should filter by location', () => {
      component.criteria = { location: 'Armenia' };

      const mockPlaces = [
        { title: 'Casita', price: 50, city: 'Armenia' } as any,
        { title: 'Finca', price: 100, city: 'Manizales' } as any
      ];

      const filtered = (component as any).applyFilters(mockPlaces);

      expect(filtered.length).toBe(1);
      expect(filtered[0].city).toBe('Armenia');
    });

    it('should combine multiple filters', () => {
      component.criteria = {
        location: 'Armenia',
        minPrice: 75,
        maxPrice: 150
      };

      const mockPlaces = [
        { title: 'Cheap', price: 50, city: 'Armenia' } as any,
        { title: 'Perfect', price: 100, city: 'Armenia' } as any,
        { title: 'Expensive', price: 200, city: 'Armenia' } as any,
        { title: 'Wrong city', price: 100, city: 'Manizales' } as any
      ];

      const filtered = (component as any).applyFilters(mockPlaces);

      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toBe('Perfect');
    });
  });

  describe('Search Criteria Extraction', () => {
    it('should extract location from query params', () => {
      activatedRoute.queryParams = of({
        location: 'Armenia, Quindío'
      });

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.criteria.location).toBe('Armenia, Quindío');
    });

    it('should extract guest count', () => {
      activatedRoute.queryParams = of({
        guests: '2'
      });

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.criteria.guests).toBe(2);
    });

    it('should extract check-in/out dates', () => {
      activatedRoute.queryParams = of({
        checkIn: '05/09/2025',
        checkOut: '08/09/2025'
      });

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.criteria.checkIn).toBe('05/09/2025');
      expect(component.criteria.checkOut).toBe('08/09/2025');
    });

    it('should extract services as array', () => {
      activatedRoute.queryParams = of({
        list: ['WIFI', 'PARKING']
      });

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.criteria.services).toEqual(['WIFI', 'PARKING']);
    });

    it('should convert single service string to array', () => {
      activatedRoute.queryParams = of({
        list: 'WIFI' // String en lugar de array
      });

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.criteria.services).toEqual(['WIFI']);
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe on destroy', () => {
      fixture.detectChanges();
      const destroySpy = spyOn((component as any).destroy$, 'next');
      const completeSpy = spyOn((component as any).destroy$, 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should call loadPlaces when query params change', () => {
      const loadPlacesSpy = spyOn(component as any, 'loadPlaces');
      activatedRoute.queryParams = of({ location: 'Armenia' });

      component.ngOnInit();
      fixture.detectChanges();

      expect(loadPlacesSpy).toHaveBeenCalled();
    });
  });
});
