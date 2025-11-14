import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

import { PlacesApiService } from '../../services/places-api-service';
import { BookingsApiService } from '../../services/bookings-api-service';
import { PlaceDetailDTO } from '../../model/place-dto/place-detail-dto';

interface ServiceItem {
  code: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-create-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-booking.html',
  styleUrls: ['./create-booking.css']
})
export class CreateBooking implements OnInit {

  place!: PlaceDetailDTO;
  form!: FormGroup;
  nights = 0;
  total = 0;
  servicesList: ServiceItem[] = [
    { code: 'WIFI',               label: 'Wi-Fi',              icon: 'wifi' },
    { code: 'BREAKFAST_INCLUDED', label: 'Desayuno',           icon: 'restaurant' },
    { code: 'AIR_CONDITIONING',   label: 'Aire acondicionado', icon: 'ac_unit' },
    { code: 'POOL',               label: 'Piscina',            icon: 'pool' },
    { code: 'TELEVISION',         label: 'Televisión',         icon: 'tv' },
    { code: 'PARKING',            label: 'Parqueadero',        icon: 'local_parking' },
    { code: 'GYM',                label: 'Gimnasio',           icon: 'fitness_center' },
    { code: 'SPA',                label: 'Spa',                icon: 'spa' },
    { code: 'RESTAURANT',         label: 'Restaurante',        icon: 'restaurant_menu' },
    { code: 'BAR',                label: 'Bar',                icon: 'local_bar' }
  ];

  mappedServices: ServiceItem[] = [];


  constructor(
    private route: ActivatedRoute,
    private placesApi: PlacesApiService,
    private bookingApi: BookingsApiService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    const placeId = this.route.snapshot.queryParamMap.get('placeId');
    if (!placeId) {
      Swal.fire('Error', 'Sitio no encontrado', 'error');
      return;
    }

    this.placesApi.getDetail(placeId).subscribe({
      next: place => {
        this.place = place;

        // Mapear los códigos a iconos+labels
        this.mappedServices = (place.services || [])
          .map(code => this.servicesList.find(s => s.code === code))
          .filter((s): s is ServiceItem => !!s);
      },
      error: () => Swal.fire('Error', 'No se pudo cargar el lugar', 'error')
    });

    // Formulario
    this.form = this.fb.group({
      checkIn: ['', Validators.required],
      checkOut: ['', Validators.required],
      guests: [1, [Validators.required, Validators.min(1)]]
    });

    this.form.valueChanges.subscribe(() => this.calcularTotal());
  }

  calcularTotal() {
    const { checkIn, checkOut } = this.form.value;
    if (!checkIn || !checkOut) return;

    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);

    const diff = d2.getTime() - d1.getTime();
    this.nights = diff / (1000 * 60 * 60 * 24);

    if (this.nights > 0 && this.place) {
      this.total = this.nights * this.place.price;
    }
  }

  reservar() {
    if (this.form.invalid) {
      Swal.fire('Datos incompletos', 'Por favor completa todos los campos', 'warning');
      return;
    }

    const { checkIn, checkOut, guests } = this.form.value;

    const dto = {
      checkIn: `${checkIn}T15:00:00`,
      checkOut: `${checkOut}T11:00:00`,
      guest_number: guests
    };

    this.bookingApi.create(this.place.id, dto).subscribe({
      next: () => {
        // 👇 armamos info para la pantalla "Mis reservas"
        const state = {
          booking: {
            checkIn,              // solo la fecha (para mostrarla bonita)
            checkOut,
            guest_number: guests,
            total: this.total,
            nights: this.nights
          },
          place: this.place
        };

        Swal.fire(
          '¡Reserva creada!',
          'Tu reserva ha sido registrada correctamente',
          'success'
        ).then(() => {
          this.router.navigate(['/my-reservations'], { state });
        });
      },
      error: err => {
        Swal.fire('Error', err.error?.message || 'No se pudo crear la reserva', 'error');
      }
    });
  }
}
