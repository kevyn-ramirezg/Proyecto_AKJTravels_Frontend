import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import Litepicker from 'litepicker';

type Destination = { label: string; type: 'Ciudad' | 'Región' | 'País' };
type Suggestion = { city: string; desc: string; img: string };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements AfterViewInit, OnDestroy {
  // ======= NUEVO: alojamientos quemados con imagen =======
  suggestions: Suggestion[] = [
    {
      city: 'Pereira, Risaralda',
      desc: 'Apartamento 2 alcobas',
      img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60'
    },
    {
      city: 'Armenia, Quindío',
      desc: 'Apartamento 3 habitaciones',
      img: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1200&q=60' // ← nuevo
    },
    {
      city: 'Filandia, Quindío',
      desc: 'Cabaña habitación doble',
      img: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=60'
    }
  ];
  // ====== AUTOCOMPLETE (Destino) ======
  destQuery = '';
  destOpen = false;
  destActiveIndex = -1;
  destinations: Destination[] = [
    { label: 'Armenia, Quindío', type: 'Ciudad' },
    { label: 'Filandia, Quindío', type: 'Ciudad' },
    { label: 'Pereira, Risaralda', type: 'Ciudad' },
    { label: 'Salento, Quindío', type: 'Ciudad' },
    { label: 'Manizales, Caldas', type: 'Ciudad' },
    { label: 'Quindío', type: 'Región' },
    { label: 'Risaralda', type: 'Región' },
    { label: 'Caldas', type: 'Región' },
    { label: 'Colombia', type: 'País' }
  ];
  filteredDestinations: Destination[] = [];

  openDest() {
    this.destOpen = true;
    this.filterDest(this.destQuery);
  }
  closeDest() {
    this.destOpen = false;
    this.destActiveIndex = -1;
  }
  onDestInput(ev: Event) {
    const value = (ev.target as HTMLInputElement).value;
    this.destQuery = value;
    this.destOpen = true;
    this.filterDest(value);
  }
  onDestKey(ev: KeyboardEvent) {
    if (!this.destOpen && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      this.openDest(); return;
    }
    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault();
        if (this.filteredDestinations.length) {
          this.destActiveIndex = (this.destActiveIndex + 1) % this.filteredDestinations.length;
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

  // ====== DATEPICKER (Litepicker) ======
  private picker?: Litepicker;

  openPicker() {
    this.picker?.show();
  }

  ngAfterViewInit(): void {
    document.addEventListener('click', this.onDocumentClick, true);

    const input = document.getElementById('dateRange') as HTMLInputElement | null;
    if (!input) return;

    const checkin  = document.getElementById('checkin')  as HTMLInputElement | null;
    const checkout = document.getElementById('checkout') as HTMLInputElement | null;

    this.picker = new Litepicker({
      element: input,
      singleMode: false,
      format: 'DD/MM/YYYY',
      numberOfMonths: 1,
      numberOfColumns: 1,
      autoApply: false, // mantiene botones nativos Cancel / Apply
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

      // Solo el panel lateral de "Entrada / Salida" (SIN footer custom)
      const side = document.createElement('div');
      side.className = 'akj-sidepanel';
      side.innerHTML = `
        <div class="akj-col">
          <label>Entrada</label>
          <div class="akj-date akj-date-in">—</div>
        </div>
        <div class="akj-col">
          <label>Salida</label>
          <div class="akj-date akj-date-out">—</div>
        </div>
      `;
      root.querySelector('.container__main')?.appendChild(side);
    };

    this.picker.on('show', () => buildSidePanel());

    // Con autoApply:false, el valor final queda tras "Apply" nativo;
    // 'selected' funciona para actualizar preview/panel.
    this.picker.on('selected', () => {
      const s = (this.picker?.getStartDate()?.format('DD/MM/YYYY')) || '';
      const e = (this.picker?.getEndDate()?.format('DD/MM/YYYY')) || '';
      if (input)   input.value   = (s && e) ? `${s} – ${e}` : s || e || '';
      if (checkin) checkin.value = s;
      if (checkout) checkout.value = e;

      const start = this.picker?.getStartDate()?.toJSDate?.() ?? null;
      const end   = this.picker?.getEndDate()?.toJSDate?.() ?? null;
      updateSide(start, end);
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.onDocumentClick, true);
    this.picker?.destroy();
  }
  // Valor por defecto
  guests = 2;

// Mantiene el valor en rango 1–16 y sin NaN
  onGuestsInput(ev: Event) {
    const raw = (ev.target as HTMLInputElement).value;
    let n = parseInt(raw, 10);
    if (isNaN(n)) n = 1;
    if (n < 1) n = 1;
    if (n > 16) n = 16;
    this.guests = n;
    (ev.target as HTMLInputElement).value = String(this.guests);
  }
}
