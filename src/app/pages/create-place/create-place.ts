import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {Subscription, forkJoin} from 'rxjs';


// Servicios propios
import { MapService } from '../../services/map-service';
import { PlacesApiService } from '../../services/places-api-service';
import {CreatePlaceDTO} from '../../model/place-dto/create-place-dto';
import Swal from 'sweetalert2';
import {Router} from '@angular/router';
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

  step = 0; // 0: info, 1: ubicacion, 2: servicios, 3: fotos/precio

  placeTypes: string[] = ['APARTMENT', 'HOUSE', 'FARM'];

  placeTypesWithIcons = [
    { code: 'HOUSE', label: 'Casa', icon: 'cottage' },
    { code: 'APARTMENT', label: 'Apartamento', icon: 'apartment' },
    { code: 'FARM', label: 'Finca', icon: 'agriculture' }
  ];

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
    private placesApi: PlacesApiService,
    private router: Router
  ) {
    this.createForm();
  }

  private createForm(): void {
    this.createPlaceForm = this.fb.group({
      // Paso 0 – Info básica
      title: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
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

  // Getters para campos
  get titleControl() { return this.createPlaceForm.get('title'); }
  get descriptionControl() { return this.createPlaceForm.get('description'); }

  // Validación visual para título y descripción
  isTitleTouched(): boolean { return !!this.titleControl?.touched; }
  isDescriptionTouched(): boolean { return !!this.descriptionControl?.touched; }

  getTitleError(): string {
    const c = this.titleControl;
    if (!c || !c.errors || !this.isTitleTouched()) return '';
    if (c.errors['required']) return 'El título es requerido';
    if (c.errors['minlength']) return `El título debe tener mínimo ${c.errors['minlength'].requiredLength} caracteres (tienes ${c.errors['minlength'].actualLength})`;
    if (c.errors['maxlength']) return `El título no puede exceder ${c.errors['maxlength'].requiredLength} caracteres`;
    return '';
  }

  getDescriptionError(): string {
    const c = this.descriptionControl;
    if (!c || !c.errors || !this.isDescriptionTouched()) return '';
    if (c.errors['required']) return 'La descripción es requerida';
    if (c.errors['minlength']) return `La descripción debe tener mínimo ${c.errors['minlength'].requiredLength} caracteres (tienes ${c.errors['minlength'].actualLength})`;
    if (c.errors['maxlength']) return `La descripción no puede exceder ${c.errors['maxlength'].requiredLength} caracteres`;
    return '';
  }

  hasInvalidTitle(): boolean {
    return !!this.titleControl?.invalid && this.isTitleTouched();
  }

  hasInvalidDescription(): boolean {
    return !!this.descriptionControl?.invalid && this.isDescriptionTouched();
  }

  // Contador de huéspedes
  decCapacity(): void { const v = this.createPlaceForm.value.capacity || 1; if (v > 1) this.createPlaceForm.patchValue({ capacity: v - 1 }); }
  incCapacity(): void { const v = this.createPlaceForm.value.capacity || 1; this.createPlaceForm.patchValue({ capacity: v + 1 }); }

  // Wizard
  canNext(): boolean { return this.currentGroupValid(); }
  back(): void {
    if (this.step > 0) {
      this.step--;

      // Si volvemos al paso 1, hay que recrear el mapa
      if (this.step === 1) {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.initStep1Map());
      }
    }
  }
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
  // soluciona error container 'map' not found in domm
  private initMapWhenReady(attempt = 0): void {
    // si el contenedor aún no existe, reintenta un poquito
    const el = document.getElementById('map');
    if (!el) {
      if (attempt >= 10) return; // evita loop infinito
      setTimeout(() => this.initMapWhenReady(attempt + 1), 50);
      return;
    }

    // ya existe: inicializa mapa
    this.initStep1Map();

    // por si el div aparece con tamaño 0 al renderizar, fuerza resize
    setTimeout(() => this.mapService.mapInstance?.resize(), 0);
  }
  // ============= MAPA =============
  private initStep1Map(): void {
    // Si ya teníamos un listener de clicks, lo limpiamos
    this.markerSub?.unsubscribe();

    // Crea/recrea el mapa en el contenedor 'map'
    this.mapService.create('map');

    const map = this.mapService.mapInstance;
    if (!map) return;

    map.on('load', () => {
      map.resize();
    });

    // Suscribimos el click para obtener lat/lng
    this.markerSub = this.mapService.addMarker().subscribe((lngLat) => {
      this.createPlaceForm.patchValue({
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      });
    });
  }

  // DTO → backend (mapeamos tus nombres a los esperados en el API)
  private buildPayload(): CreatePlaceDTO {
    const selectedAmenities = this.servicesList
      .map((s, i) => (this.amenitiesFA.at(i).value ? s.code : null))
      .filter(Boolean) as string[];

    const lat = Number(this.createPlaceForm.value.latitude);
    const lng = Number(this.createPlaceForm.value.longitude);
    const postalCode = String(this.createPlaceForm.value.postalCode ?? '').trim();

    const payload: CreatePlaceDTO = {
      title:       String(this.createPlaceForm.value.title ?? '').trim(),
      description: String(this.createPlaceForm.value.description ?? '').trim(),
      price:       Number(this.createPlaceForm.value.pricePerNight ?? 0),
      pics_url: [],

      placeType:   String(this.createPlaceForm.value.placeType ?? 'APARTMENT'),
      capacity:    Number(this.createPlaceForm.value.capacity ?? 1),

      country:     String(this.createPlaceForm.value.country ?? '').trim(),
      department:  String(this.createPlaceForm.value.department ?? '').trim(),
      city:        String(this.createPlaceForm.value.city ?? '').trim(),
      neighborhood:String(this.createPlaceForm.value.neighborhood ?? '').trim(),
      street:      String(this.createPlaceForm.value.street ?? '').trim(),
      postalCode,

      amenities:   selectedAmenities,
      latitude:    lat,
      longitude:   lng
    };

    return payload;
  }



  submit(): void {
    // Validación del paso actual
    if (!this.currentGroupValid()) {
      // Mensaje específico para el paso 0 (info básica)
      if (this.step === 0) {
        const errors: string[] = [];
        if (this.titleControl?.invalid) {
          if (this.titleControl.errors?.['required']) {
            errors.push('El título es requerido');
          } else if (this.titleControl.errors?.['minlength']) {
            errors.push(`El título debe tener mínimo ${this.titleControl.errors['minlength'].requiredLength} caracteres`);
          }
        }
        if (this.descriptionControl?.invalid) {
          if (this.descriptionControl.errors?.['required']) {
            errors.push('La descripción es requerida');
          } else if (this.descriptionControl.errors?.['minlength']) {
            errors.push(`La descripción debe tener mínimo ${this.descriptionControl.errors['minlength'].requiredLength} caracteres`);
          }
        }
        
        Swal.fire({
          icon: 'warning',
          title: 'Faltan datos requeridos',
          html: errors.length > 0 ? `<ul style="text-align: left">` + errors.map(e => `<li>${e}</li>`).join('') + `</ul>` : 'Completa los campos correctamente',
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Faltan datos',
          text: 'Completa los campos del paso actual antes de continuar.',
        });
      }
      return;
    }

    // Avanza de paso 0→1→2→3
    if (this.step < 3) {
      this.step++;

      // Al entrar al paso 1 desde el 0
      if (this.step === 1) {
        this.cdr.detectChanges();
        this.initMapWhenReady();
      }
      return;
    }

    // --- helpers locales ---
    const cleanupFiles = () => {
      this.files.forEach((_, i) => {
        try { URL.revokeObjectURL(this.previews[i]); } catch {}
      });
      this.previews = [];
      this.files = [];
    };

    const afterCreated = () => {
      cleanupFiles();
      this.router.navigate(['/host-dashboard']);
    };

    // Paso final: confirmación
    const basePayload = this.buildPayload();

    Swal.fire({
      icon: 'question',
      title: '¿Guardar alojamiento?',
      text: 'Podrás editarlo luego en “Mis alojamientos”.',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
    }).then(res => {
      if (!res.isConfirmed) return;

      Swal.fire({
        title: 'Guardando...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      // ✅ 1) Crear SIEMPRE sin fotos en el JSON
      const createPayload = { ...basePayload, pics_url: [] };

      this.placesApi.create(createPayload).subscribe({
        next: (placeId: string) => {
          const finishOk = () => {
            Swal.fire({
              icon: 'success',
              title: '¡Alojamiento creado!',
              text: 'Se creó correctamente.',
            }).then(() => afterCreated());
          };

          // ✅ 2) Si no hay fotos, terminamos
          if (this.files.length === 0) {
            finishOk();
            return;
          }

          // ✅ 3) Si hay fotos: subirlas asociadas al placeId
          this.placesApi.uploadImages(placeId, this.files, this.mainIndex ?? 0).subscribe({
            next: () => finishOk(),
            error: (err) => {
              Swal.fire({
                icon: 'warning',
                title: 'Creado (con aviso)',
                text: 'Se creó el alojamiento, pero no se pudieron subir las imágenes. Intenta de nuevo desde editar alojamiento.',
              }).then(() => afterCreated());
            }
          });
        },
        error: (err) => {
          console.error('CREATE ERROR FULL', err);

          Swal.fire({
            icon: 'error',
            title: 'No se pudo crear el alojamiento',
            text: 'Hubo un problema al guardar tu alojamiento. Por favor revisa los datos e intenta nuevamente.',
          });
        }
      });
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
