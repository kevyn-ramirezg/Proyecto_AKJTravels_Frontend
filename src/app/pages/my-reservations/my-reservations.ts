import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ReservationCardVM {
  placeTitle: string;
  mainImage: string;
  capacity: number;
  checkIn: string;   // yyyy-MM-dd
  checkOut: string;  // yyyy-MM-dd
  nights: number;
  guests: number;
  total: number;
  state: 'ACTIVA' | 'PASADA';
}

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-reservations.html',
  styleUrls: ['./my-reservations.css']
})
export class MyReservations implements OnInit {

  reservas: ReservationCardVM[] = [];

  ngOnInit(): void {
    const state: any = history.state;

    if (state?.booking && state?.place) {
      const { booking, place } = state;

      const nights =
        booking.nights ??
        this.calcularNoches(booking.checkIn, booking.checkOut);

      const card: ReservationCardVM = {
        placeTitle: place.title,
        mainImage: place.pics_url?.[0] ?? '',
        capacity: place.capacity,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights,
        guests: booking.guest_number,
        total: booking.total ?? 0,
        state: 'ACTIVA' // la acabas de crear, así que la tratamos como activa
      };

      this.reservas = [card];
    }
  }

  private calcularNoches(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = d2.getTime() - d1.getTime();
    return diff / (1000 * 60 * 60 * 24);
  }
}
