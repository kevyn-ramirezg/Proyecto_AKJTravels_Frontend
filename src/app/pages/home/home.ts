import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import Litepicker from 'litepicker';

import { MapService } from '../../services/map-service';
import { PlacesApiService } from '../../services/places-api-service';

type Destination = { label: string; type: 'Ciudad' | 'Región' | 'País' };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements AfterViewInit, OnDestroy, OnInit {

  // ====== AUTOCOMPLETE ======
  destQuery = '';
  destOpen = false;
  destActiveIndex = -1;

  destinations: Destination[] = [
    { label: 'Armenia, Quindío',    type: 'Ciudad' },
    { label: 'Filandia, Quindío',   type: 'Ciudad' },
    { label: 'Circasia, Quindío',   type: 'Ciudad' },
    { label: 'Salento, Quindío',    type: 'Ciudad' },
    { label: 'Pereira, Risaralda',  type: 'Ciudad' },
    { label: 'Manizales, Caldas',   type: 'Ciudad' }
  ];
  filteredDestinations: Destination[] = [];

  openDest() { this.destOpen = true; this.filterDest(this.destQuery); }
  closeDest() { this.destOpen = false; this.destActiveIndex = -1; }

  onDestInput(ev: Event) {
    const value = (ev.target as HTMLInputElement).value;
    this.destQuery = value;
    this.destOpen = true;
    this.filterDest(value);
  }

  onDestKey(ev: KeyboardEvent) {
    if (!this.destOpen && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      this.openDest();
      return;
    }
    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault();
        if (this.filteredDestinations.length) {
          this.destActiveIndex =
            (this.destActiveIndex + 1) % this.filteredDestinations.length;
          this.scrollActiveIntoView();
        }
        break;
      case 'ArrowUp':
        ev.preventDefault();
        if (this.filteredDestinations.length) {
          this.destActiveIndex =
            (this.destActiveIndex - 1 + this.filteredDestinations.length) %
            this.filteredDestinations.length;
          this.scrollActiveIntoView();
        }
        break;
      case 'Enter':
        if (this.destOpen && this.destActiveIndex >= 0) {
          ev.preventDefault();
          this.pickDestination(this.filteredDestinations[this.destActiveIndex]);
        }
        break;
      case 'Escape':
        this.closeDest();
        break;
    }
  }

  pickDestination(opt: Destination) {
    this.destQuery = opt.label;
    this.closeDest();
  }

  private filterDest(q: string) {
    const term = q.trim().toLowerCase();
    if (!term) {
      this.filteredDestinations = this.destinations.slice(0, 6);
      this.destActiveIndex = -1;
      return;
    }
    this.filteredDestinations = this.destinations
      .filter(d => d.label.toLowerCase().includes(term))
      .slice(0, 8);
    this.destActiveIndex = this.filteredDestinations.length ? 0 : -1;
  }

  private scrollActiveIntoView() {
    const list = document.getElementById('dest-listbox');
    if (!list) return;
    const active = list.querySelector<HTMLElement>('li.active');
    active?.scrollIntoView({ block: 'nearest' });
  }

  private onDocumentClick = (ev: MouseEvent) => {
    const box = document.getElementById('destBox');
    if (!box) return;
    if (!box.contains(ev.target as Node)) this.closeDest();
  };

  // ====== DATEPICKER ======
  private picker?: Litepicker;

  private checkInDate?: string;
  private checkOutDate?: string;

  openPicker() { this.picker?.show(); }

  ngAfterViewInit(): void {
    document.addEventListener('click', this.onDocumentClick, true);

    const input    = document.getElementById('dateRange') as HTMLInputElement | null;
    const checkin  = document.getElementById('checkin')  as HTMLInputElement | null;
    const checkout = document.getElementById('checkout') as HTMLInputElement | null;

    if (!input) return;

    this.picker = new Litepicker({
      element: input,
      singleMode: false,
      format: 'DD/MM/YYYY',
      numberOfMonths: 1,
      numberOfColumns: 1,
      autoApply: false,
      tooltipText: { one: 'día', other: 'días' },
      tooltipNumber: (n: number) => n,
      mobileFriendly: true,
      resetButton: false
    });

    const fmtLong = (d?: Date | null) =>
      d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : '—';

    const updateSide = (start: Date | null, end: Date | null) => {
      const root = document.querySelector('.litepicker') as HTMLElement | null;
      if (!root) return;
      const $in  = root.querySelector('.akj-date-in')  as HTMLElement | null;
      const $out = root.querySelector('.akj-date-out') as HTMLElement | null;
      if ($in)  $in.textContent  = fmtLong(start);
      if ($out) $out.textContent = fmtLong(end);
    };

    const buildSidePanel = () => {
      const root = document.querySelector('.litepicker') as HTMLElement | null;
      if (!root || root.querySelector('.akj-sidepanel')) return;
      const side = document.createElement('div');
      side.className = 'akj-sidepanel';
      side.innerHTML = `
        <div class="akj-col"><label>Entrada</label><div class="akj-date akj-date-in">—</div></div>
        <div class="akj-col"><label>Salida</label><div class="akj-date akj-date-out">—</div></div>
      `;
      root.querySelector('.container__main')?.appendChild(side);
    };

    this.picker.on('show', () => buildSidePanel());

    this.picker.on('selected', () => {
      const s = this.picker?.getStartDate()?.format('DD/MM/YYYY') || '';
      const e = this.picker?.getEndDate()?.format('DD/MM/YYYY') || '';

      if (input)    input.value    = (s && e) ? `${s} – ${e}` : s || e || '';
      if (checkin)  checkin.value  = s;
      if (checkout) checkout.value = e;

      this.checkInDate  = s || undefined;
      this.checkOutDate = e || undefined;

      const start = this.picker?.getStartDate()?.toJSDate?.() ?? null;
      const end   = this.picker?.getEndDate()?.toJSDate?.() ?? null;
      updateSide(start, end);
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.onDocumentClick, true);
    this.picker?.destroy();
  }

  // ====== HUÉSPEDES ======
  guests = 2;

  onGuestsInput(ev: Event) {
    const raw = (ev.target as HTMLInputElement).value;
    let n = parseInt(raw, 10);
    if (isNaN(n)) n = 1;
    if (n < 1) n = 1;
    if (n > 16) n = 16;
    this.guests = n;
    (ev.target as HTMLInputElement).value = String(this.guests);
  }

  // ====== DESTACADOS (3 alojamientos reales) ======
  featuredPlaces: any[] = [];

  ngOnInit(): void {
    this.loadFeaturedPlaces();
  }

  private loadFeaturedPlaces(): void {
    this.placesApi.list(0).subscribe({
      next: (rows) => {
        this.featuredPlaces = (rows ?? []).slice(0, 3);
      },
      error: (err) => {
        console.error('Error cargando alojamientos destacados', err);
        this.featuredPlaces = [];
      }
    });
  }

  constructor(
    private mapService: MapService,
    private placesApi: PlacesApiService,
    private router: Router
  ) {}

  // ====== ACCIÓN DE BÚSQUEDA ======
  onSearch(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const location = this.destQuery.trim() || undefined;
    const checkIn  = this.checkInDate;
    const checkOut = this.checkOutDate;
    const guests   = this.guests || 1;

    this.router.navigate(['/search'], {
      queryParams: { location, checkIn, checkOut, guests }
    });
  }

  // ================== MAPBOX + BACKEND ==================
  // (lo que tengas irá aquí)
}
