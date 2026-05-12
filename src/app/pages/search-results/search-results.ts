import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PlacesApiService } from '../../services/places-api-service';
import { PlaceListItemDTO } from '../../model/place-dto/place-list-item-dto';
import { ListPlaceDTO } from '../../model/place-dto/list-place-dto';

type SearchCriteria = {
  location?: string;
  checkIn?: string;   // "DD/MM/YYYY"
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  services?: string[];
};

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchResultsComponent implements OnInit, OnDestroy {

  criteria: SearchCriteria = {};
  loading = false;
  error: string | null = null;

  places: PlaceListItemDTO[] = [];
  filteredPlaces: PlaceListItemDTO[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private placesApi: PlacesApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
      // normalizar servicios (list puede ser string o string[])
      let services: string[] | undefined;
      const rawList = params['list'];
      if (Array.isArray(rawList)) {
        services = rawList;
      } else if (typeof rawList === 'string') {
        services = [rawList];
      }

      this.criteria = {
        location: params['location'] || undefined,
        checkIn: params['checkIn'] || undefined,
        checkOut: params['checkOut'] || undefined,
        guests: params['guests'] ? Number(params['guests']) : undefined,
        // ✅ FIX: Use !== undefined instead of truthy check (0 is valid)
        minPrice: params['minimum'] !== undefined ? Number(params['minimum']) : undefined,
        maxPrice: params['maximum'] !== undefined ? Number(params['maximum']) : undefined,
        services
      };

      this.cdr.markForCheck();
      this.loadPlaces();
    });
  }

  private loadPlaces(): void {
    this.loading = true;
    this.error = null;

    const filters: Partial<ListPlaceDTO> = {};

    const loc = this.criteria.location?.trim();

    // city → solo si es un destino tipo "Armenia, Quindío"
    if (loc) {
      if (loc.includes(',')) {
        filters.city = loc.split(',')[0].trim();
      }
    }

    if (this.criteria.guests && this.criteria.guests > 0) {
      filters.guest_number = this.criteria.guests;
    }

    const checkInBackend  = this.toBackendDate(this.criteria.checkIn, false);
    const checkOutBackend = this.toBackendDate(this.criteria.checkOut, true);

    if (checkInBackend) {
      filters.checkIn = checkInBackend;
    }
    if (checkOutBackend) {
      filters.checkOut = checkOutBackend;
    }

    // precio
    if (this.criteria.minPrice != null) {
      filters.minimum = this.criteria.minPrice;
    }
    if (this.criteria.maxPrice != null) {
      filters.maximum = this.criteria.maxPrice;
    }

    // servicios
    if (this.criteria.services && this.criteria.services.length > 0) {
      filters.list = this.criteria.services;
    }

    this.placesApi.list(0, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.places = rows ?? [];
          this.filteredPlaces = this.applyFilters(this.places);
          this.loading = false;
          this.cdr.markForCheck();

          console.log('Criterios front:', this.criteria);
          console.log('Filtros al backend:', filters);
        },
        error: (err) => {
          console.error('Error cargando alojamientos', err);
        this.error = 'No fue posible cargar los alojamientos. Intenta de nuevo más tarde.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private toBackendDate(dateStr?: string, endOfDay = false): string | undefined {
    if (!dateStr) return undefined;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return undefined;

    const [dd, mm, yyyy] = parts;
    const day = parseInt(dd, 10);
    const month = parseInt(mm, 10);
    const year = parseInt(yyyy, 10);
    
    // ✅ FIX: Validar rango de fecha
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
      return undefined;  // Fecha inválida
    }
    
    const dateObj = new Date(year, month - 1, day);
    // Validar que la fecha sea válida (ej: 31 febrero es inválido)
    if (dateObj.getMonth() !== month - 1) {
      return undefined;
    }

    const padDay = String(day).padStart(2, '0');
    const padMonth = String(month).padStart(2, '0');
    const time = endOfDay ? '23:59:59' : '00:00:00';
    return `${year}-${padMonth}-${padDay}T${time}`;
  }

  /**
   * Filtro adicional en el FRONT:
   *  - location: city/title contiene el texto
   *  - precio: min/max
   */
  private applyFilters(rows: PlaceListItemDTO[]): PlaceListItemDTO[] {
    let filtered = [...rows];

    const { location, minPrice, maxPrice } = this.criteria;

    if (location) {
      const term = location.toLowerCase().trim();

      filtered = filtered.filter(p => {
        const city  = (p.city  || '').toLowerCase();
        const title = (p.title || '').toLowerCase();

        return (
          city.includes(term) ||
          term.includes(city) ||   // "Armenia, Quindio" incluye "armenia"
          title.includes(term)
        );
      });
    }

    if (minPrice != null) {
      filtered = filtered.filter(p => p.price >= minPrice);
    }
    if (maxPrice != null) {
      filtered = filtered.filter(p => p.price <= maxPrice);
    }

    return filtered;
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/img/place-placeholder.jpg';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
