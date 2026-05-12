import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { PlacesApiService } from '../../services/places-api-service';
import { BookingsApiService } from '../../services/bookings-api-service';
import { PlaceDetailDTO } from '../../model/place-dto/place-detail-dto';
import { SERVICES_LIST, ServiceItem } from '../../constants/services';

interface OccupiedRange {
  checkIn: Date;
  checkOut: Date;
}

@Component({
  selector: 'app-create-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-booking.html',
  styleUrls: ['./create-booking.css']
})
export class CreateBooking implements OnInit, OnDestroy {

  place!: PlaceDetailDTO;
  form!: FormGroup;
  nights = 0;
  total = 0;
  occupiedRanges: OccupiedRange[] = [];
  showCheckInCalendar = false;
  showCheckOutCalendar = false;
  currentCalendarMonth: Date = new Date();
  
  servicesList: ServiceItem[] = SERVICES_LIST;
  mappedServices: ServiceItem[] = [];
  
  private destroy$ = new Subject<void>();
  private placeId: string = '';


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

    this.placeId = placeId;

    // ✅ FIX: Inicializar formulario ANTES de la suscripción
    this.form = this.fb.group({
      checkIn: ['', [Validators.required]],
      checkOut: ['', [Validators.required]],
      guests: [1, [Validators.required, Validators.min(1)]]
    }, { validators: this.bookingRangeValidator.bind(this) });

    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calcularTotal());

    this.placesApi.getDetail(placeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: place => {
          this.place = place;

          // Mapear los códigos a iconos+labels
          this.mappedServices = (place.services || [])
            .map(code => this.servicesList.find(s => s.code === code))
            .filter((s): s is ServiceItem => !!s);
          
          // ✅ FIX: Actualizar validador de guests con capacity del lugar
          const guestControl = this.form.get('guests');
          if (guestControl && place?.capacity) {
            guestControl.setValidators([
              Validators.required,
              Validators.min(1),
              Validators.max(place.capacity)
            ]);
            guestControl.updateValueAndValidity();
          }
          
          // Cargar reservas confirmadas para obtener fechas ocupadas
          this.loadOccupiedRanges(String(place.id));
        },
        error: () => Swal.fire('Error', 'No se pudo cargar el lugar', 'error')
      });

    // ✅ FIX: Detectar cuando el usuario vuelve a esta página y refrescar fechas ocupadas inmediatamente
    // Esto cubre el caso: usuario crea reserva → navega a mis-reservaciones → cancela → vuelve atrás
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.placeId) {
          this.loadOccupiedRanges(this.placeId);
        }
      });

    // ✅ FIX: También refrescar automáticamente cada 15 segundos por si acaso
    // Esto cubre el caso: usuario está viendo el calendario, otra pestaña cancela una reserva
    interval(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.placeId) {
          this.loadOccupiedRanges(this.placeId);
        }
      });
  }

  private parseDateString(dateString: string): Date {
    // Parsear fechas como local (ej: "2025-09-05" → 5 de septiembre medianoche local)
    // NO como UTC para evitar desfases de zona horaria
    const parts = dateString.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }

  private loadOccupiedRanges(placeId: string): void {
    /**
     * CONVENCIÓN DE OCUPACIÓN: [checkIn, checkOut] - RANGO CERRADO
     * 
     * Una reserva con checkIn=11 y checkOut=14 ocupa: DÍAS 11, 12, 13, 14
     * - El día 11 SÍ está ocupado (entrada)
     * - El día 14 SÍ está ocupado (salida)
     * 
     * Esta regla se aplica en:
     * 1. Visualización del calendario (isDateOccupiedInRange)
     * 2. Validación de solapamientos (bookingRangeValidator)
     * 3. Selección de fechas en el calendario (selectDate)
     */
    this.bookingApi.listByPlace(placeId, { state: 'CONFIRMED', page: 0 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ rows }) => {
          this.occupiedRanges = rows.map(b => ({
            checkIn: this.parseDateString(b.checkIn),
            checkOut: this.parseDateString(b.checkOut)
          }));
        },
        error: (err) => {
          console.warn('No se pudieron cargar fechas ocupadas:', err);
        }
      });
  }

  private bookingRangeValidator(): ValidationErrors | null {
    if (!this.form) return null;

    const checkInStr = this.form.get('checkIn')?.value;
    const checkOutStr = this.form.get('checkOut')?.value;

    if (!checkInStr || !checkOutStr) return null;

    // Usar parseDateString para convertir strings a fechas locales de forma consistente
    const d1 = this.parseDateString(checkInStr);
    const d2 = this.parseDateString(checkOutStr);

    if (d1 >= d2) {
      return { invalidRange: true };
    }

    // Verificar que ninguna fecha en el rango está ocupada
    // Regla: [checkIn, checkOut] - rango cerrado
    for (const range of this.occupiedRanges) {
      const rangeStart = range.checkIn;  // Ya está parseado correctamente
      const rangeEnd = range.checkOut;    // Ya está parseado correctamente

      // Hay conflicto si:
      // 1. Mi entrada cae en días ocupados [rangeStart, rangeEnd]
      const entradaOcupada = d1 >= rangeStart && d1 <= rangeEnd;
      // 2. Mi salida cae dentro del rango ocupado
      const salidaOcupada = d2 >= rangeStart && d2 <= rangeEnd;
      // 3. Mi rango envuelve completamente uno existente
      const rangoEnvuelto = d1 <= rangeStart && d2 >= rangeEnd;

      if (entradaOcupada || salidaOcupada || rangoEnvuelto) {
        return { dateOccupied: true };
      }
    }

    return null;
  }

  // Métodos para calendario
  isDateOccupiedInRange(date: Date): boolean {
    // Normalizar la fecha del calendario a medianoche sin ajustes de hora
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Regla: [checkIn, checkOut] - ocupa tanto entrada como salida
    // Si checkOut es el 14, SÍ ocupa el 14 (no puede entrar una nueva reserva ese día)
    return this.occupiedRanges.some(range => {
      return checkDate >= range.checkIn && checkDate <= range.checkOut;
    });
  }

  getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  getFirstDayOfMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  }

  selectDate(day: number, isCheckIn: boolean): void {
    const selected = new Date(this.currentCalendarMonth.getFullYear(), this.currentCalendarMonth.getMonth(), day);
    // Generar string de fecha en formato local YYYY-MM-DD (sin UTC conversion)
    const dateStr = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;

    if (isCheckIn) {
      this.form.get('checkIn')?.setValue(dateStr);
      this.showCheckInCalendar = false;
    } else {
      this.form.get('checkOut')?.setValue(dateStr);
      this.showCheckOutCalendar = false;
    }
  }

  toggleCheckInCalendar(): void {
    if (this.form.get('checkIn')?.value) {
      const parts = this.form.get('checkIn')?.value.split('-');
      // ✅ FIX: Parse year as number, not string
      this.currentCalendarMonth = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    } else {
      this.currentCalendarMonth = new Date();
    }
    this.showCheckInCalendar = !this.showCheckInCalendar;
    this.showCheckOutCalendar = false;
  }

  toggleCheckOutCalendar(): void {
    if (this.form.get('checkOut')?.value) {
      const parts = this.form.get('checkOut')?.value.split('-');
      // ✅ FIX: Parse year as number, not string
      this.currentCalendarMonth = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    } else {
      this.currentCalendarMonth = new Date();
    }
    this.showCheckOutCalendar = !this.showCheckOutCalendar;
    this.showCheckInCalendar = false;
  }

  previousMonth(): void {
    this.currentCalendarMonth = new Date(this.currentCalendarMonth.getFullYear(), this.currentCalendarMonth.getMonth() - 1, 1);
  }

  nextMonth(): void {
    this.currentCalendarMonth = new Date(this.currentCalendarMonth.getFullYear(), this.currentCalendarMonth.getMonth() + 1, 1);
  }

  getDateForDay(day: number): Date {
    return new Date(this.currentCalendarMonth.getFullYear(), this.currentCalendarMonth.getMonth(), day);
  }

  getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  calcularTotal() {
    const { checkIn, checkOut } = this.form.value;
    if (!checkIn || !checkOut) return;

    // ✅ FIX: Use parseDateString for consistency (local time, not UTC)
    const d1 = this.parseDateString(checkIn);
    const d2 = this.parseDateString(checkOut);

    const diff = d2.getTime() - d1.getTime();
    // ✅ FIX: Round up nights (ceil, not floor) - 2.5 nights = 3 noches a pagar
    this.nights = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (this.nights > 0 && this.place) {
      this.total = this.nights * this.place.price;
    }
  }

  reservar() {
    const error = this.bookingRangeValidator();
    if (error) {
      if (error['dateOccupied']) {
        Swal.fire('Fechas no disponibles', 'El rango seleccionado contiene fechas ocupadas. Por favor, elige otras fechas.', 'warning');
      } else if (error['invalidRange']) {
        Swal.fire('Rango inválido', 'La fecha de salida debe ser posterior a la de entrada.', 'warning');
      }
      return;
    }

    if (this.form.invalid) {
      Swal.fire('Datos incompletos', 'Por favor completa todos los campos', 'warning');
      return;
    }

    const { checkIn, checkOut, guests } = this.form.value;

    const dto = {
      // ✅ FIX: Use consistent times (midnight) to match backend convention
      checkIn: `${checkIn}T00:00:00`,
      checkOut: `${checkOut}T00:00:00`,
      guest_number: guests
    };

    this.bookingApi.create(this.place.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
          Swal.fire('Error', 'No se pudo crear la reserva. Por favor intenta de nuevo.', 'error');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
