import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { UserService } from '../../services/user-service';
import { PlacesApiService } from '../../services/places-api-service';
import { BookingsApiService } from '../../services/bookings-api-service';
import { PlaceListItemDTO } from '../../model/place-dto/place-list-item-dto';
import { PlaceStatsDTO } from '../../model/place-dto/place-stats-dto';
import { BookingDTO, BookingState } from '../../model/booking-dto/booking-dto';
import { TokenService } from '../../services/token-service';
import { PageMeta } from '../../utils/normalize';
import {CommentsApiService} from '../../services/comments-api-service';
import {forkJoin, map, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {CommentDTO} from '../../model/comment-dto/comment-dto';

type Section = 'places' | 'metrics' | 'bookings' | 'comments';

interface HostComment {
  id: string;
  placeTitle: string;// nombre del alojamiento
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
    private readonly commentsApi: CommentsApiService,
  ) {}

  ngOnInit(): void {
    this.loadMyPlaces();
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
      next: (list) => {
        this.places.set(list ?? []);
        this.loadingPlaces.set(false);

        // 👉 nuevo: carga comentarios de todos mis alojamientos
        this.loadHostCommentsFromPlaces(this.places());
      },
      error: (err) => {
        console.error('[HostDashboard] getMine error', err);
        this.loadingPlaces.set(false);
        Swal.fire({ icon:'error', title:'No se pudieron cargar tus alojamientos' });
      }
    });
  }

  navigateCreatePlace() {
    this.router.navigateByUrl('/create-place');
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
      Swal.fire({
        icon: 'info',
        title: 'Escribe una respuesta',
        text: 'No puedes enviar una respuesta vacía.'
      });
      return;
    }

    Swal.fire({
      title: 'Enviando respuesta…',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      allowEscapeKey: false
    });

    this.commentsApi.reply(comment.id, text).subscribe({
      next: () => {
        comment.reply = text;           // ya queda visible
        this.replyDrafts[comment.id] = '';
        Swal.fire({
          icon: 'success',
          title: 'Respuesta enviada'
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo enviar la respuesta',
          text: err?.error?.message ?? 'El recurso solicitado no existe o el endpoint no coincide.'
        });
      }
    });
  }
  private loadComments(): void {
    const places = this.places() || [];

    if (!places.length) {
      this.comments = [];
      this.filteredComments = [];
      return;
    }

    this.commentsLoading = true;
    this.commentsError = undefined;

    const calls = places.map(p =>
      this.placesApi.listComments(String((p as any).id), 0).pipe(
        map((list: any[]) => list.map(raw => this.mapToHostComment(raw, p))),
        catchError(err => {
          console.error('[HostDashboard] listComments error for place', p.id, err);
          // devolvemos lista vacía para no romper el forkJoin
          return of([] as HostComment[]);
        })
      )
    );

    forkJoin(calls).subscribe({
      next: (arrays: HostComment[][]) => {
        this.comments = arrays.flat();
        this.applyCommentFilters();
        this.commentsLoading = false;
      },
      error: (err) => {
        console.error('[HostDashboard] loadComments error', err);
        this.commentsLoading = false;
        this.commentsError = err?.error?.message ?? 'No se pudieron cargar los comentarios.';
        this.comments = [];
        this.filteredComments = [];


        this.applyCommentFilters();
      }
    });
  }

  private mapToHostComment(raw: any, place: PlaceListItemDTO | null): HostComment {
    // raw ≈ CommentDTO del backend:
    // { comment, commentDate, rating, user: { name, photoUrl } }

    const user = raw?.user ?? {};
    const commentDateIso: string = raw?.commentDate ?? new Date().toISOString();

    return {
      // id sólo de frontend; si luego el back manda id, se usa raw.id
      id: String(raw?.id ?? `${place?.id ?? 'place'}-${commentDateIso}-${Math.random()}`),
      placeTitle: place?.title ?? 'Alojamiento',
      guestName: user.name ?? 'Huésped',
      rating: Number(raw?.rating ?? 0),
      comment: raw?.comment ?? '',
      date: commentDateIso,
      reply: null
    };
  }

  private loadHostCommentsFromPlaces(places: PlaceListItemDTO[]): void {
    if (!places || !places.length) {
      this.comments = [];
      this.filteredComments = [];
      return;
    }

    this.commentsLoading = true;
    this.commentsError = undefined;

    // Un observable por alojamiento
    const requests = places.map(p =>
      this.placesApi.listComments(p.id, 0).pipe(
        // Si el backend tira 404 cuando no hay comentarios, lo mapeamos a []
        catchError(() => of([] as CommentDTO[])),
        map((comments) =>
          comments.map<HostComment>(c => ({
            id: c.id,                        // ← CommentDTO.id
            placeId: p.id,
            placeTitle: p.title,
            guestName: c.user?.name ?? 'Huésped',
            rating: c.rating,
            comment: c.comment,
            date: c.commentDate,
            reply: null
          }))
        )
      )
    );

    forkJoin(requests).subscribe({
      next: (arrays) => {
        // aplanamos todos los comentarios de todos los alojamientos
        this.comments = arrays.flat();

        // los ordenamos del más reciente al más antiguo
        this.comments.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // aplicamos filtros actuales (texto + fecha)
        this.applyCommentFilters();

        this.commentsLoading = false;
      },
      error: (err) => {
        console.error('[HostDashboard] loadHostComments error', err);
        this.commentsLoading = false;
        this.commentsError = 'No se pudieron cargar los comentarios.';
      }
    });
  }
  // Cargar comentarios reales del backend para el alojamiento seleccionado
  loadCommentsForPlace(): void {
    const pid = this.selectedPlaceId();
    if (!pid) {
      Swal.fire({
        icon: 'info',
        title: 'Selecciona un alojamiento',
        text: 'Elige un alojamiento para ver sus comentarios.'
      });
      return;
    }

    this.commentsLoading = true;
    this.commentsError = undefined;
    this.comments = [];
    this.filteredComments = [];

    const place = this.places().find(p => String((p as any).id) === String(pid)) ?? null;

    this.placesApi.listComments(String(pid), 0).subscribe({
      next: (list) => {
        const rawComments = list ?? [];
        this.comments = rawComments.map(raw => this.mapToHostComment(raw, place));
        this.applyCommentFilters();  // reutilizamos tu filtro por texto/fechas
        this.commentsLoading = false;
      },
      error: (err) => {
        console.error('[HostDashboard] listComments error', err);
        this.commentsLoading = false;
        this.comments = [];
        this.filteredComments = [];
        this.commentsError = err?.error?.message ?? 'No se pudieron cargar los comentarios.';
      }
    });
  }

}
