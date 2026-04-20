import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingsApiService } from '../../services/bookings-api-service';
import { UserBookingDTO, BookingState } from '../../model/booking-dto/user-booking-dto';
import Swal from 'sweetalert2';
import { CommentsApiService } from '../../services/comments-api-service';

interface ReservationCardVM {
  id: string;
  placeTitle: string;
  mainImage: string;
  capacity: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  bookingState: BookingState;
  statusLabel: string;   // PENDIENTE / ACTIVA / PASADA / CANCELADA
  statusClass: 'status-pendiente' | 'status-activa' | 'status-pasada' | 'status-cancelada';
  placeId: string;
}

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-reservations.html',
  styleUrls: ['./my-reservations.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyReservations implements OnInit {

  reservas: ReservationCardVM[] = [];
  cargando = true;

  constructor(
    private bookingsApi: BookingsApiService,
    private commentsApi: CommentsApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.bookingsApi.listUserBookings().subscribe({
      next: res => {
        const data = res.message || [];
        this.reservas = data.map(b => this.toCardVM(b));
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error cargando reservas', err);
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  private toCardVM(b: UserBookingDTO): ReservationCardVM {
    const nights = this.calcularNoches(b.checkIn, b.checkOut);
    const { label, cssClass } = this.calculateStatus(b);

    return {
      id: b.id,
      placeTitle: b.placeTitle,
      mainImage: b.mainImage || '',
      capacity: b.capacity,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      nights,
      guests: b.guest_number,
      bookingState: b.bookingState,
      statusLabel: label,
      statusClass: cssClass,
      placeId: b.placeId
    };
  }

  private calcularNoches(checkIn: string, checkOut: string): number {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = d2.getTime() - d1.getTime();
    return diff / (1000 * 60 * 60 * 24);
  }

  private isPast(checkOut: string): boolean {
    const today = new Date();
    const out = new Date(checkOut);
    return out.getTime() < today.getTime();
  }

  private calculateStatus(b: UserBookingDTO): { label: string; cssClass: 'status-pendiente' | 'status-activa' | 'status-pasada' | 'status-cancelada' } {
    if (b.bookingState === 'CANCELED' || b.bookingState === 'REJECTED') {
      return { label: 'CANCELADA', cssClass: 'status-cancelada' };
    }

    if (b.bookingState === 'PENDING') {
      return { label: 'PENDIENTE', cssClass: 'status-pendiente' };
    }

    if (this.isPast(b.checkOut)) {
      return { label: 'PASADA', cssClass: 'status-pasada' };
    }

    return { label: 'ACTIVA', cssClass: 'status-activa' };
  }

  puedeCancelar(r: ReservationCardVM): boolean {
    // Las reservas PENDING pueden cancelarse en cualquier momento (no confirmadas aún)
    if (r.bookingState === 'PENDING') {
      return true;
    }

    // Las CONFIRMED se pueden cancelar solo si faltan 48+ horas
    if (r.bookingState !== 'CONFIRMED') {
      return false;
    }

    const checkInDate = new Date(r.checkIn);
    const now = new Date();
    const diffMs = checkInDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours >= 48;
  }

  /**
   * Solo se puede calificar cuando la reserva YA FINALIZÓ
   * (fecha de salida en el pasado) y no está cancelada/rechazada.
   */
  puedeCalificar(r: ReservationCardVM): boolean {
    if (r.bookingState === 'CANCELED' || r.bookingState === 'REJECTED') {
      return false;
    }
    return this.isPast(r.checkOut);
  }

  cancelar(r: ReservationCardVM) {
    Swal.fire({
      title: 'Cancelar reserva',
      text: '¿Seguro que deseas cancelar esta reserva? Solo puedes cancelarla hasta 48 horas antes del check-in.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.bookingsApi.cancel(r.id).subscribe({
        next: res => {
          Swal.fire('Reserva cancelada', res.message || 'La reserva fue cancelada correctamente', 'success');

          r.bookingState = 'CANCELED';
          const { label, cssClass } = this.calculateStatus({
            id: r.id,
            placeId: r.placeId,
            placeTitle: r.placeTitle,
            mainImage: r.mainImage,
            capacity: r.capacity,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            guest_number: r.guests,
            bookingState: 'CANCELED'
          });
          r.statusLabel = label;
          r.statusClass = cssClass;
          this.cdr.markForCheck();
        },
        error: err => {
          Swal.fire('Error', 'No se pudo cancelar la reserva. Por favor intenta nuevamente.', 'error');
          this.cdr.markForCheck();
        }
      });
    });
  }

  abrirCalificar(r: ReservationCardVM) {
    // Seguridad extra
    if (!this.puedeCalificar(r)) {
      return;
    }

    let selectedRating = 0;

    Swal.fire({
      title: '',
      html: `
        <div class="rating-modal">
          <h2 class="rating-title">Califica tu estadía</h2>

          <div class="rating-stars">
            <span class="star" data-value="1">&#9733;</span>
            <span class="star" data-value="2">&#9733;</span>
            <span class="star" data-value="3">&#9733;</span>
            <span class="star" data-value="4">&#9733;</span>
            <span class="star" data-value="5">&#9733;</span>
          </div>

          <label class="rating-label">Realiza un comentario:</label>
          <textarea
            id="rating-comment"
            class="rating-textarea"
            rows="4"
            placeholder="Hola, me encantó..."
          ></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Publicar',
      cancelButtonText: 'Cerrar',
      customClass: {
        popup: 'rating-popup',
        confirmButton: 'rating-confirm-btn',
        cancelButton: 'rating-cancel-btn'
      },
      focusConfirm: false,
      preConfirm: () => {
        if (selectedRating === 0) {
          Swal.showValidationMessage('Por favor selecciona una calificación.');
          return;
        }
        const textarea = document.getElementById('rating-comment') as HTMLTextAreaElement | null;
        const comment = textarea?.value.trim() || '';
        return { rating: selectedRating, comment };
      },
      didOpen: () => {
        const popup = Swal.getPopup() as HTMLElement | null;
        if (!popup) return;

        const stars = Array.from(
          popup.querySelectorAll<HTMLElement>('.rating-stars .star')
        );

        stars.forEach(star => {
          star.addEventListener('click', () => {
            const value = Number(star.dataset['value'] || '0');
            selectedRating = value;

            stars.forEach(s => {
              const v = Number(s.dataset['value'] || '0');
              if (v <= value) {
                s.classList.add('active');
              } else {
                s.classList.remove('active');
              }
            });
          });
        });
      }
    }).then(result => {
      if (!result.isConfirmed || !result.value) return;

      const { rating, comment } = result.value as { rating: number; comment: string };

      // Usar el endpoint correcto: POST /api/bookings/{bookingId}/comments
      this.commentsApi.createForBooking(r.id, { rating, comment }).subscribe({
        next: msg => {
          Swal.fire('¡Gracias!', msg || 'Tu calificación ha sido registrada.', 'success');
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          // Intentar obtener mensaje de error específico del backend
          const errorMsg = err?.error?.message || err?.message || 'No se pudo registrar tu calificación. Por favor intenta nuevamente.';
          Swal.fire('Error', errorMsg, 'error');
          this.cdr.markForCheck();
        }
      });
    });
  }
}
