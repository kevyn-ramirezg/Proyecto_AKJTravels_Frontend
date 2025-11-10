import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

// Servicios propios
import { MapService } from '../../services/map-service';
import { PlacesApiService } from '../../services/places-api-service';
import {CreatePlaceDTO} from '../../model/create-place-dto';
// Ajusta si necesitas un tipo fuerte para tu backend


interface ServiceItem { code: string; label: string; icon?: string }

@Component({
  selector: 'app-create-place',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-place.html',
  styleUrls: ['./create-place.css']
})
export class CreatePlace implements OnInit, OnDestroy {
  createPlaceForm!: FormGroup;
  private markerSub?: Subscription;
  private mapCreatedForStep1 = false;
  step = 0; // 0: info, 1: ubicacion, 2: servicios, 3: fotos/precio

  placeTypes: string[] = ['APARTMENT', 'HOUSE', 'FARM'];

  // Enum Services del backend
  servicesList: ServiceItem[] = [
    { code: 'WIFI', label: 'Wi-Fi', icon: 'wifi' },
    { code: 'BREAKFAST_INCLUDED', label: 'Desayuno', icon: 'restaurant' },
    { code: 'AIR_CONDITIONING', label: 'Aire acondicionado', icon: 'ac_unit' },
    { code: 'POOL', label: 'Piscina', icon: 'pool' },
    { code: 'TELEVISION', label: 'Televisión', icon: 'tv' },
    { code: 'PARKING', label: 'Parqueadero', icon: 'local_parking' },
    { code: 'GYM', label: 'Gimnasio', icon: 'fitness_center' },
    { code: 'SPA', label: 'Spa', icon: 'spa' },
    { code: 'RESTAURANT', label: 'Restaurante', icon: 'restaurant_menu' },
    { code: 'BAR', label: 'Bar', icon: 'local_bar' }
  ];

  previews: string[] = [];
  isDragOver = false;
  files: File[] = [];
  mainIndex = 0; // índice de la foto principal

  constructor(
    private fb: FormBuilder,
    private mapService: MapService,
    private cdr: ChangeDetectorRef,
    private placesApi: PlacesApiService
  ) {
    this.createForm();
  }

  private createForm(): void {
    this.createPlaceForm = this.fb.group({
      // Paso 0 – Info básica
      title: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      capacity: [1, [Validators.required, Validators.min(1), Validators.max(50)]],

      country: ['', Validators.required],
      department: ['', Validators.required],
      postalCode: ['', Validators.required],
      // Paso 1 – Ubicación
      neighborhood: [''],
      street: ['', [Validators.required, Validators.maxLength(80)]],
      city: ['', [Validators.required, Validators.maxLength(60)]],
      latitude: [''],
      longitude: [''],

      // Paso 2 – Servicios y tipo
      placeType: [this.placeTypes[0], Validators.required],
      amenities: this.fb.array(this.servicesList.map(() => this.fb.control(false))),
      pricePerNight: [430000, [Validators.required, Validators.min(10000)]],

      // Paso 3 – Fotos
      photoFiles: [null]
    });
  }

  // Helpers
  get amenitiesFA(): FormArray { return this.createPlaceForm.get('amenities') as FormArray; }
  amenityActive(i: number): boolean { return !!this.amenitiesFA.at(i).value; }
  toggleAmenity(i: number): void { this.amenitiesFA.at(i).setValue(!this.amenitiesFA.at(i).value); }

  get selectedServices() { return this.servicesList.filter((_, i) => this.amenityActive(i)); }
  hasSelectedAmenities(): boolean { return this.selectedServices.length > 0; }

  // Contador de huéspedes
  decCapacity(): void { const v = this.createPlaceForm.value.capacity || 1; if (v > 1) this.createPlaceForm.patchValue({ capacity: v - 1 }); }
  incCapacity(): void { const v = this.createPlaceForm.value.capacity || 1; this.createPlaceForm.patchValue({ capacity: v + 1 }); }

  // Wizard
  canNext(): boolean { return this.currentGroupValid(); }
  back(): void { if (this.step > 0) this.step--; }

  private currentGroupValid(): boolean {
    switch (this.step) {
      case 0:
        // En el paso 0 solo validamos los campos que se muestran en la UI
        // (title, description, capacity). Otros campos pertenecen a pasos
        // posteriores y no deben bloquear el avance desde aquí.
        return this.createPlaceForm.get('title')!.valid
          && this.createPlaceForm.get('description')!.valid
          && this.createPlaceForm.get('capacity')!.valid;
      case 1: {
        const v = this.createPlaceForm.value;
        const ok =
          v.country && v.department && v.postalCode &&
          v.street && v.neighborhood &&v.city &&
          v.latitude !== '' && v.longitude !== '';
        return !!ok;
      }
      case 2: {
        const hasAmenity = this.selectedServices.length > 0;
        return this.createPlaceForm.get('placeType')!.valid
          && this.createPlaceForm.get('pricePerNight')!.valid
          && hasAmenity;
      }
      case 3: {
        // Al menos 1 foto, el backend lo exige
        return this.files.length >= 1 && this.files.length <= 10;
      }
      default: return false;
    }
  }

  // Fotos (preview local)
  onFilesSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files) return;
    this.addFiles(Array.from(input.files));
    input.value = '';
  }
  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragOver = true; }
  onDragLeave(_: DragEvent) { this.isDragOver = false; }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.isDragOver = false;
    if (!e.dataTransfer) return;
    this.addFiles(Array.from(e.dataTransfer.files));
  }
  private addFiles(list: File[]) {
    const images = list.filter(f => f.type.startsWith('image/'));
    const remaining = Math.max(0, 10 - this.previews.length);
    const toAdd = images.slice(0, remaining);
    toAdd.forEach(f => {
      this.files.push(f);
      const url = URL.createObjectURL(f);
      this.previews.push(url);
    });
  }
  remove(i: number): void {
    try { URL.revokeObjectURL(this.previews[i]); } catch {}
    this.previews.splice(i, 1);
    if (this.files[i]) this.files.splice(i, 1);
    if (this.mainIndex >= this.previews.length) this.mainIndex = Math.max(0, this.previews.length - 1);
  }
  setMain(i: number) { this.mainIndex = i; }

  // ============= MAPA =============
  private initStep1Map(): void {
    this.mapService.create('map'); // el ID existe ahora (step === 1)
    this.mapService.mapInstance?.on('load', () => {
      this.mapService.mapInstance?.resize();
    });

    this.markerSub = this.mapService.addMarker().subscribe((lngLat) => {
      this.createPlaceForm.patchValue({
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      });
    });

    this.mapCreatedForStep1 = true;
  }

  // DTO → backend (mapeamos tus nombres a los esperados en el API)
  private buildPayload(): CreatePlaceDTO {
    const selectedAmenities = this.servicesList
      .map((s, i) => (this.amenitiesFA.at(i).value ? s.code : null))
      .filter(Boolean) as string[];

    // lat/lng: número obligatorio (el back pide @NotNull float)
    const lat = Number(this.createPlaceForm.value.latitude);
    const lng = Number(this.createPlaceForm.value.longitude);

    // postalCode: alfanumérico 4-10
    const postalCode = String(this.createPlaceForm.value.postalCode ?? '').trim();

    // picsUrl: MÍNIMO 1 → usa nombres de archivos como placeholder
    // (cuando el back devuelva ID, podrás subir y luego actualizar reales)
    const picsUrl = this.files.length ? this.files.map(f => `local:${f.name}`) : ['local:placeholder'];

    const payload: CreatePlaceDTO = {
      title: String(this.createPlaceForm.value.title ?? '').trim(),
      description: String(this.createPlaceForm.value.description ?? '').trim(),
      // El back espera 'price' → lo mapearemos en el servicio (sección B)
      price: Number(this.createPlaceForm.value.pricePerNight ?? 0),

      picsUrl,
      placeType: String(this.createPlaceForm.value.placeType ?? 'APARTMENT'),
      capacity: Number(this.createPlaceForm.value.capacity ?? 1),

      country: String(this.createPlaceForm.value.country ?? '').trim(),
      department: String(this.createPlaceForm.value.department ?? '').trim(),
      city: String(this.createPlaceForm.value.city ?? '').trim(),
      neighborhood: String(this.createPlaceForm.value.neighborhood ?? '').trim(),
      street: String(this.createPlaceForm.value.street ?? '').trim(),
      postalCode,

      amenities: selectedAmenities,
      latitude: lat,
      longitude: lng
    };

    console.table(Object.entries(payload).map(([k, v]) => ({ campo: k, tipo: typeof v, valor: v })));
    return payload;
  }


  submit(): void {
    if (!this.currentGroupValid()) return;

    if (this.step < 3) {
      this.step++;

      // Al entrar al paso 1, crea el mapa (una sola vez)
      if (this.step === 1 && !this.mapCreatedForStep1) {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.initStep1Map());
      }
      return;
    }

    // Paso final: POST + (opcional) upload images
    const payload = this.buildPayload();

    this.placesApi.create(payload).subscribe({
      next: (msg) => {
        console.log('[CreatePlace] creado:', msg);
        alert('Alojamiento creado correctamente.');

        // Limpieza simple
        this.files.forEach((_, i) => { try { URL.revokeObjectURL(this.previews[i]); } catch {} });
        this.previews = [];
        this.files = [];

        // TODO: redirige a /my-places o al detalle cuando lo tengas
        // this.router.navigateByUrl('/my-places');
      },
      error: (err) => {
        console.error('[CreatePlace] create error:', err);
        const backendMsg = err?.error?.message ?? 'No fue posible crear el alojamiento.';
        alert(backendMsg);
      }
    });

  }

  // UI
  currencyCOP(v: number | null | undefined): string {
    const n = Number(v || 0);
    return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }

  ngOnInit(): void {
    // (si necesitas inicializaciones extra, déjalas aquí)
  }

  ngOnDestroy(): void {
    this.markerSub?.unsubscribe();
    // Libera blobs
    this.previews.forEach(src => { try { URL.revokeObjectURL(src); } catch {} });
  }
}
