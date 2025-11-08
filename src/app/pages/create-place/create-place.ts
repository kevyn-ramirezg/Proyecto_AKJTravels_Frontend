import {Component, OnInit, OnDestroy, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

// ⬇️ Ajusta esta ruta a la real en tu proyecto
import { MapService } from '../../services/map-service';

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
  private mapCreatedForStep1= false;
  step = 0;// 0: info, 1: ubicacion, 2: servicios, 3: fotos/precio

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



  constructor(private fb: FormBuilder, private mapService: MapService,private cdr: ChangeDetectorRef ) {
    this.createForm();
  }

  private createForm(): void {
    this.createPlaceForm = this.fb.group({
      // Paso 0 – Info básica
      title: ['', [Validators.required, Validators.maxLength(120)]],
      guests: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],

      // Paso 1 – Ubicación (form plano)
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
  decGuests(): void { const v = this.createPlaceForm.value.guests || 1; if (v > 1) this.createPlaceForm.patchValue({ guests: v - 1 }); }
  incGuests(): void { const v = this.createPlaceForm.value.guests || 1; this.createPlaceForm.patchValue({ guests: v + 1 }); }

  // Wizard
  canNext(): boolean { return this.currentGroupValid(); }
  back(): void { if (this.step > 0) this.step--; }

  private currentGroupValid(): boolean {
    switch (this.step) {
      case 0: return this.createPlaceForm.get('title')!.valid && this.createPlaceForm.get('guests')!.valid && this.createPlaceForm.get('description')!.valid;
      case 1: return this.createPlaceForm.get('street')!.valid && this.createPlaceForm.get('city')!.valid; // lat/long opcionales
      case 2: return this.createPlaceForm.get('placeType')!.valid && this.createPlaceForm.get('pricePerNight')!.valid;
      case 3: return true;
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
  }

  // DTO final
  private buildPayload() {
    const selectedAmenities = this.servicesList
      .map((s, i) => (this.amenitiesFA.at(i).value ? s.code : null))
      .filter(Boolean) as string[];

    return {
      title: this.createPlaceForm.value.title,
      description: this.createPlaceForm.value.description,
      guests: Number(this.createPlaceForm.value.guests),
      street: this.createPlaceForm.value.street,
      city: this.createPlaceForm.value.city,
      latitude: this.createPlaceForm.value.latitude ?? null,
      longitude: this.createPlaceForm.value.longitude ?? null,
      placeType: this.createPlaceForm.value.placeType,
      amenities: selectedAmenities,
      pricePerNight: Number(this.createPlaceForm.value.pricePerNight),
    };
  }

  submit(): void {
    if (!this.currentGroupValid()) return;

    if (this.step < 3) {
      this.step++;

      // 👇 Cuando acabas de pasar al paso 1, crea el mapa
      if (this.step === 1 && !this.mapCreatedForStep1) {
        // Fuerza render del DOM del paso 1
        this.cdr.detectChanges();
        // Espera al siguiente tick para que exista <div id="map">
        requestAnimationFrame(() => this.initStep1Map());
      }

      return;
    }

    const payload = this.buildPayload();
    console.log('CreatePlaceDTO', payload);
    // TODO: this.placesApi.create(payload).subscribe(...)
  }

  private initStep1Map(): void {
    this.mapService.create('map'); // el ID existe ahora (step === 1)
    this.mapService.mapInstance?.on('load', () => {
      // Si el stepper oculta/animó contenedores, re-calcula tamaño
      this.mapService.mapInstance?.resize();
    });

    // Suscríbete y guarda la sub para limpiar luego
    this.markerSub = this.mapService.addMarker().subscribe((lngLat) => {
      // 👇 Setea los controles que SÍ existen en tu form
      this.createPlaceForm.patchValue({
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      });
    });

    this.mapCreatedForStep1 = true;
  }

  // UI
  currencyCOP(v: number | null | undefined): string {
    const n = Number(v || 0);
    return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }

  // ============= MAPA =============
  ngOnInit(): void {
    // Inicializa el mapa con la configuración predeterminada
    //this.mapService.create();
    // Se suscribe al evento de agregar marcador y actualiza el formulario
    //this.mapService.addMarker().subscribe((marker) => {
      //this.createPlaceForm.get('location')?.setValue({
        //latitude: marker.lat,
        //longitude: marker.lng,
      //});
   // });
  }

  ngOnDestroy(): void {
    this.markerSub?.unsubscribe();
  }
}
