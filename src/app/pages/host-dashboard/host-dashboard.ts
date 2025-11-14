import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { UserService } from '../../services/user-service';
import { PlacesApiService } from '../../services/places-api-service';
import { BookingsApiService } from '../../services/bookings-api-service';
import { PlaceListItemDTO } from '../../model/place-list-item-dto';
import { PlaceStatsDTO } from '../../model/place-stats-dto';
import { BookingDTO, BookingState } from '../../model/booking-dto';
import { TokenService } from '../../services/token-service';
import { PageMeta } from '../../utils/normalize';

type Section = 'places' | 'metrics' | 'bookings' | 'comments';

interface HostComment {
  id: string;
  placeTitle: string;   // nombre del alojamiento
  guestName: string;    // nombre del huésped
  rating: number;       // 1–5
  comment: string;      // texto del comentario
  date: string;         // ISO: '2025-08-01' o fecha completa
  reply?: string | null;
}

@Component({
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './host-dashboard.html'
})
export class HostDashboard implements OnInit {
  // =====================
  // Estado de navegación
  // =====================
  section = signal<Section>('places');
  setSection = (s: Section) => this.section.set(s);

  comments: HostComment[] = [];
  filteredComments: HostComment[] = [];

  commentSearchText = '';
  commentFromDate?: string;
  commentToDate?: string;

// texto de respuesta por comentario (diccionario id → texto)
  replyDrafts: Record<string, string> = {};

  commentsLoading = false;
  commentsError?: string;


  // =====================
  // Usuario
  // =====================
  username = computed(() => this.token.getUsername?.() || '');

  // =====================
  // Mis alojamientos (CRUD)
  // =====================
  places = signal<PlaceListItemDTO[]>([]);
  searchTerm = signal<string>('');
  loadingPlaces = signal<boolean>(false);

  selectedPlaceId = signal<string | null>(null);
  selectedPlace = computed(() => {
    const id = this.selectedPlaceId();
    return id ? this.places().find(p => String((p as any).id) === String(id)) ?? null : null;
  });

  // =====================
  // Métricas por alojamiento
  // =====================
  from = signal<string>(''); // YYYY-MM-DD
  to   = signal<string>('');
  stats = signal<PlaceStatsDTO | null>(null);
  loadingStats = signal<boolean>(false);

  // =====================
  // Reservas por alojamiento
  // =====================
  bookings = signal<BookingDTO[]>([]);
  pageMeta = signal<PageMeta<BookingDTO> | undefined>(undefined);
  loadingBookings = signal<boolean>(false);
  bookingStatus = signal<BookingState | ''>(''); // '', 'PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED'

  filteredPlaces = computed(() => {
    const q = (this.searchTerm() || '').trim().toLowerCase();
    const data = this.places() || [];
    if (!q) return data;
    return data.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.city  || '').toLowerCase().includes(q)
    );
  });

  constructor(
    private readonly router: Router,
    private readonly userService: UserService,
    private readonly token: TokenService,
    private readonly placesApi: PlacesApiService,
    private readonly bookingsApi: BookingsApiService,
  ) {}

  ngOnInit(): void {
    this.loadMyPlaces();
    this.initMockComments();
    this.applyCommentFilters();

  }

  // =====================
  // Utilidades locales
  // =====================
  private resetFilters() {
    this.from.set('');
    this.to.set('');
    this.bookingStatus.set('');
    this.stats.set(null);
    this.bookings.set([]);
    this.pageMeta.set(undefined);
  }

  pickPlaceFor(section: Section, id: string | number) {
    this.selectedPlaceId.set(String(id));
    this.resetFilters();
    this.section.set(section);
  }

  // =====================
  // MIS ALOJAMIENTOS
  // =====================
  loadMyPlaces() {
    this.loadingPlaces.set(true);
    this.placesApi.getMine(0).subscribe({
      next: (list) => { this.places.set(list ?? []); this.loadingPlaces.set(false); },
      error: (err) => { console.error('[HostDashboard] getMine error', err); this.loadingPlaces.set(false);
        Swal.fire({ icon:'error', title:'No se pudieron cargar tus alojamientos' }); }
    });
  }

  navigateCreatePlace() {
    this.router.navigateByUrl('/create-place');
  }

  navigateEditPlace(id: string | number) {
    this.router.navigate(['/edit-place', String(id)]);
  }

  navigateViewPlace(id: string | number) {
    this.router.navigate(['/place', String(id)]);
  }

  deletePlace(id: string | number) {
    const today = new Date(); today.setHours(0,0,0,0);
    const from = today.toISOString().slice(0,10); // YYYY-MM-DD

    Swal.fire({ title: 'Verificando reservas…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    this.bookingsApi.listByPlace(String(id), { from, state: 'CONFIRMED', page: 0 }).subscribe({
      next: ({ rows, page }) => {
        const total = (page?.totalElements ?? rows.length) || 0;
        if (total > 0) {
          Swal.fire({
            icon: 'info',
            title: 'No se puede eliminar',
            text: 'Este alojamiento tiene reservas futuras confirmadas.'
          });
          return;
        }

        Swal.fire({
          icon: 'warning',
          title: 'Eliminar alojamiento',
          text: 'Se marcará como eliminado (soft delete). ¿Continuar?',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar',
          cancelButtonText: 'Cancelar'
        }).then(res => {
          if (!res.isConfirmed) return;

          Swal.fire({ title: 'Eliminando…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

          this.placesApi.delete(String(id)).subscribe({
            next: () => {
              Swal.fire({ icon: 'success', title: 'Alojamiento eliminado' });
              this.places.set(this.places().filter(p => String((p as any).id) !== String(id)));
              if (this.selectedPlaceId() === String(id)) this.selectedPlaceId.set(null);
            },
            error: (err) => {
              Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: err?.error?.message ?? 'Inténtalo de nuevo.' });
            }
          });
        });
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'Error verificando reservas', text: 'Inténtalo de nuevo.' });
      }
    });
  }

  // =====================
  // MÉTRICAS
  // =====================
  loadStats() {
    const pid = this.selectedPlaceId();
    if (!pid) {
      Swal.fire({ icon: 'info', title: 'Selecciona un alojamiento', text: 'Elige un alojamiento en “Mis alojamientos”.' });
      return;
    }
    this.loadingStats.set(true);
    this.placesApi.stats(String(pid), this.from() || undefined, this.to() || undefined).subscribe({
      next: (data) => { this.stats.set(data); this.loadingStats.set(false); },
      error: (err) => {
        console.error('[HostDashboard] stats error', err);
        this.loadingStats.set(false);
        Swal.fire({ icon: 'error', title: 'No se pudieron cargar métricas' });
      }
    });
  }

  // =====================
  // RESERVAS
  // =====================
  loadBookings() {
    const pid = this.selectedPlaceId();
    if (!pid) {
      Swal.fire({ icon:'info', title:'Selecciona un alojamiento', text:'Elige un alojamiento para ver reservas.' });
      return;
    }

    const q: any = { page: 0 };
    if (this.from()) q.from = this.from();
    if (this.to())   q.to = this.to();
    if (this.bookingStatus()) q.state = this.bookingStatus();

    this.loadingBookings.set(true);
    this.bookingsApi.listByPlace(String(pid), q).subscribe({
      next: ({ rows, page }) => { this.bookings.set(rows || []); this.pageMeta.set(page); this.loadingBookings.set(false); },
      error: (err) => {
        console.error('[HostDashboard] listByPlace error', err);
        this.loadingBookings.set(false);
        Swal.fire({ icon:'error', title:'No se pudieron cargar reservas' });
      }
    });
  }

  confirmBooking(bookingId: string) {
    Swal.fire({ title: 'Confirmando…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    this.bookingsApi.confirm(bookingId).subscribe({
      next: () => { Swal.fire({ icon:'success', title:'Reserva confirmada' }); this.loadBookings(); },
      error: (err) => { Swal.fire({ icon:'error', title:'No se pudo confirmar', text: err?.error?.message ?? 'Inténtalo de nuevo.' }); }
    });
  }

  rejectBooking(bookingId: string) {
    Swal.fire({
      icon: 'warning',
      title: 'Rechazar reserva',
      text: '¿Seguro que deseas rechazar esta reserva?',
      showCancelButton: true,
      confirmButtonText: 'Sí, rechazar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      Swal.fire({ title: 'Rechazando…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
      this.bookingsApi.reject(bookingId).subscribe({
        next: () => { Swal.fire({ icon:'success', title:'Reserva rechazada' }); this.loadBookings(); },
        error: (err) => { Swal.fire({ icon:'error', title:'No se pudo rechazar', text: err?.error?.message ?? 'Verifica que el endpoint /reject esté habilitado.' }); }
      });
    });
  }

  deleteBooking(bookingId: string) {
    Swal.fire({
      icon:'warning',
      title:'Eliminar reserva',
      text:'¿Seguro que deseas eliminar esta reserva?',
      showCancelButton:true,
      confirmButtonText:'Sí, eliminar',
      cancelButtonText:'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      Swal.fire({ title: 'Eliminando…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
      this.bookingsApi.delete(bookingId).subscribe({
        next: () => { Swal.fire({ icon:'success', title:'Reserva eliminada' }); this.loadBookings(); },
        error: (err) => { Swal.fire({ icon:'error', title:'No se pudo eliminar', text: err?.error?.message ?? 'Inténtalo de nuevo.' }); }
      });
    });
  }

  // Info rápida de reserva
  showBookingInfo(b: BookingDTO) {
    Swal.fire({
      icon: 'info',
      title: b.placeTitle || 'Reserva',
      html: `
        <div style="text-align:left">
          <div><b>Huésped:</b> ${b.guestName ?? '—'}</div>
          <div><b>Entrada:</b> ${new Date(b.checkIn).toLocaleString()}</div>
          <div><b>Salida:</b> ${new Date(b.checkOut).toLocaleString()}</div>
          <div><b>Estado:</b> ${b.state}</div>
        </div>
      `
    });
  }

  // ===================== COMENTARIOS =====================
  private initMockComments(): void {
    this.comments = [
      {
        id: 'c1',
        placeTitle: 'Casa El Poblado',
        guestName: 'Juan',
        rating: 5,
        comment: 'Excelente servicio y muy aseado, recomendado',
        date: '2025-08-01',
        reply: null
      },
      {
        id: 'c2',
        placeTitle: 'Apartamento Laureles',
        guestName: 'Ana',
        rating: 4,
        comment: 'El alojamiento era lindo y aseado, pero tenía un olor extraño',
        date: '2025-08-15',
        reply: null
      }
    ];
  }
  onCommentSearchChange(): void {
    this.applyCommentFilters();
  }

  onCommentDateChange(): void {
    this.applyCommentFilters();
  }
  private applyCommentFilters(): void {
    const text = this.commentSearchText.trim().toLowerCase();
    const from = this.commentFromDate ? new Date(this.commentFromDate) : null;
    const to = this.commentToDate ? new Date(this.commentToDate) : null;

    this.filteredComments = this.comments.filter(c => {
      const matchesText =
        !text ||
        c.placeTitle.toLowerCase().includes(text);

      const dateObj = new Date(c.date);
      const matchesFrom = !from || dateObj >= from;
      const matchesTo = !to || dateObj <= to;

      return matchesText && matchesFrom && matchesTo;
    });
  }

  // Cuando escribes en el textarea
  onReplyDraftChange(comment: HostComment, value: string): void {
    this.replyDrafts[comment.id] = value;
  }

  //Click en el botón "Responder"
  onSendReply(comment: HostComment): void {
    const text = (this.replyDrafts[comment.id] || '').trim();
    if (!text) {
      // aquí podrías mostrar un toast/alerta si quieres
      return;
    }

    // TODO: aquí va la llamada real al backend:
    // POST /api/comments/{commentId}/reply con { reply: text }

    // Por ahora, simulamos que se envió bien:
    comment.reply = text;
    this.replyDrafts[comment.id] = '';

    console.log('Responder a comentario', comment.id, 'con:', text);
  }

}
