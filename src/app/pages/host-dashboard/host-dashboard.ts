import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PlaceListItemDTO } from '../../model/place-list-item-dto';
import {FormsModule} from '@angular/forms';

type Section = 'overview' | 'places' | 'bookings' | 'comments';

// Interfaces locales (solo para la vista; no toco /model/)
interface BookingItem {
  id: string;
  guestName: string;
  placeTitle: string;
  checkIn: string;   // ISO
  checkOut: string;  // ISO
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface CommentItem {
  id: string;
  placeTitle: string;
  authorName: string;
  rating: number;   // 1..5
  content: string;
  createdAt: string; // ISO
  reply?: string;
}

@Component({
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './host-dashboard.html',
  styleUrls: ['./host-dashboard.css']
})
export class HostDashboardComponent {

  // sección activa
  section = signal<Section>('overview');

  // ——— Mock DATA SOLO VISUAL (puedes borrar cuando conectes API) ———
  welcomeName = 'Alex';

  places = signal<PlaceListItemDTO[]>([
    { id: '1', title: 'Apartamento Centro', price: 160000, photo_url: 'assets/demo/lodgings/loft-armenia.jpg', average_rating: 4.2, city: 'Armenia' },
    { id: '2', title: 'Casa de Playa', price: 220000, photo_url: 'assets/demo/lodgings/cabana-salento.jpg', average_rating: 4.8, city: 'Cartagena' },
    { id: '3', title: 'Estudio Céntrico', price: 130000, photo_url: 'assets/demo/lodgings/estudio-pereira.jpg', average_rating: 4.5, city: 'Pereira' },
  ]);

  // estados de alojamiento solo para la vista
  placeStatus: Record<string, 'active' | 'deleted'> = { '1': 'active', '2': 'active', '3': 'deleted' };
  futureBookingsCount: Record<string, number> = { '1': 2, '2': 0, '3': 0 };

  bookings = signal<BookingItem[]>([
    { id: 'b1', guestName: 'Juan Pérez', placeTitle: 'Apartamento Centro', checkIn: '2025-09-15', checkOut: '2025-09-18', status: 'pending' },
    { id: 'b2', guestName: 'Ana Gómez', placeTitle: 'Casa de Playa', checkIn: '2025-10-02', checkOut: '2025-10-05', status: 'confirmed' },
    { id: 'b3', guestName: 'Luis Díaz', placeTitle: 'Apartamento Centro', checkIn: '2025-11-12', checkOut: '2025-11-15', status: 'cancelled' },
  ]);

  comments = signal<CommentItem[]>([
    { id:'c1', placeTitle:'Apartamento Centro', authorName:'Juan', rating:5, content:'Excelente servicio y muy aseado, recomendado', createdAt:'2025-08-01' },
    { id:'c2', placeTitle:'Casa de Playa', authorName:'Ana', rating:4, content:'Lindo y aseado, pero tenía un olor extraño', createdAt:'2025-08-15' },
  ]);

  // filtros (Alojamientos)
  search = signal<string>('');

  filteredPlaces = computed(() => {
    const q = this.search().toLowerCase().trim();
    return this.places().filter(p =>
      !q || `${p.title} ${p.city}`.toLowerCase().includes(q)
    );
  });

  // KPIs del resumen (desde datos locales para que ya se vea)
  activeListings = computed(() =>
    this.places().filter(p => this.placeStatus[p.id] === 'active').length
  );
  upcomingBookings = computed(() =>
    Object.values(this.futureBookingsCount).reduce((a,b)=>a+b,0)
  );
  ratingAvg = computed(() => {
    const arr = this.places().map(p => p.average_rating);
    return arr.length ? (arr.reduce((a,b)=>a+b,0) / arr.length) : 0;
  });

  cop(n: number) {
    return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(n);
  }
  onSearchInput(ev: Event) {
    const value = (ev.target as HTMLInputElement)?.value ?? '';
    this.search.set(value);
  }
  setSection(s: Section) { this.section.set(s); }

  protected readonly HTMLInputElement = HTMLInputElement;
}
