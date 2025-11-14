import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PlacesApiService } from '../../services/places-api-service';

type SearchCriteria = {
  location?: string;
  checkIn?: string;   // viene como "DD/MM/YYYY" desde el Home
  checkOut?: string;  // idem
  guests?: number;
};

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './search-results.html',
  styleUrls: ['./search-results.css']
})
export class SearchResultsComponent implements OnInit {

  criteria: SearchCriteria = {};
  loading = false;
  error: string | null = null;

  places: any[] = [];
  filteredPlaces: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private placesApi: PlacesApiService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.criteria = {
        location: params['location'] || undefined,
        checkIn: params['checkIn'] || undefined,
        checkOut: params['checkOut'] || undefined,
        guests: params['guests'] ? Number(params['guests']) : undefined
      };

      this.loadPlaces();
    });
  }

  private loadPlaces(): void {
    this.loading = true;
    this.error = null;

    const filters: any = {};

    const loc = this.criteria.location?.trim();

    // 👇 Lógica para city
    if (loc) {
      if (loc.includes(',')) {
        // Caso "Armenia, Quindio" → al backend solo le mandamos "Armenia"
        filters.city = loc.split(',')[0].trim();
      } else {
        // Caso texto libre "Mocawa" → NO mandamos city al backend,
        // el filtro por nombre lo hace applyFilters() en el front.
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

    this.placesApi.list(0, filters).subscribe({
      next: (rows) => {
        this.places = rows ?? [];
        // Filtro extra en el FRONT (por texto: "Armenia", "Mocawa", etc.)
        this.filteredPlaces = this.applyFilters(this.places);
        this.loading = false;

        console.log('Criterios front:', this.criteria);
        console.log('Filtros al backend:', filters);
      },
      error: (err) => {
        console.error('Error cargando alojamientos', err);
        this.error = 'No fue posible cargar los alojamientos. Intenta de nuevo más tarde.';
        this.loading = false;
      }
    });
  }

  /**
   * Convierte "DD/MM/YYYY" a "YYYY-MM-DDTHH:mm:ss"
   * para que encaje con LocalDateTime (ListPlaceDTO.checkIn/checkOut)
   */
  private toBackendDate(dateStr?: string, endOfDay = false): string | undefined {
    if (!dateStr) return undefined;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return undefined;

    const [dd, mm, yyyy] = parts;
    const day   = dd.padStart(2, '0');
    const month = mm.padStart(2, '0');
    const year  = yyyy;

    const time = endOfDay ? '23:59:59' : '00:00:00';
    return `${year}-${month}-${day}T${time}`;
  }

  /**
   * Filtro adicional en el FRONT:
   *  - location: city/title contiene el texto
   */
  private applyFilters(rows: any[]): any[] {
    let filtered = [...rows];

    const { location } = this.criteria;

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

    return filtered;
  }

  // placeholder para errores de imagen
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/img/place-placeholder.jpg';
  }

}
