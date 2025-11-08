import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface ServiceItem { code: string; label: string; icon?: string }

@Component({
  selector: 'app-create-place',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-place.html',
  styleUrls: ['./create-place.css']
})
export class CreatePlace {
  form!: FormGroup;
  step = 0; // 0: info, 1: ubicacion, 2: servicios, 3: fotos/precio

  placeTypes: string[] = ['APARTMENT', 'HOUSE', 'FARM'];

  // Enum Services del backend
  servicesList: ServiceItem[] = [
    { code: 'WIFI', label: 'Wi‑Fi', icon: 'wifi' },
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
  files:File[] = [];

  constructor(private fb: FormBuilder) { this.buildForm(); }

  private buildForm(): void {
    this.form = this.fb.group({
      // Paso 0 – Info básica
      title: ['', [Validators.required, Validators.maxLength(120)]],
      guests: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],

      // Paso 1 – Ubicación
      street: ['', [Validators.required, Validators.maxLength(80)]],
      city: ['', [Validators.required, Validators.maxLength(60)]],
      latitude: [null],
      longitude: [null],

      // Paso 2 – Servicios y tipo
      placeType: [this.placeTypes[0], Validators.required],
      amenities: this.fb.array(this.servicesList.map(() => this.fb.control(false))),
      pricePerNight: [430000, [Validators.required, Validators.min(10000)]],

      // Paso 3 – Fotos
      photoFiles: [null]
    });
  }

  // Helpers
  get amenitiesFA(): FormArray { return this.form.get('amenities') as FormArray; }
  amenityActive(i: number): boolean { return !!this.amenitiesFA.at(i).value; }
  toggleAmenity(i: number): void { this.amenitiesFA.at(i).setValue(!this.amenitiesFA.at(i).value); }

  // Lista derivada de servicios seleccionados (para mostrar chips y visibilidad)
  get selectedServices() {
    return this.servicesList.filter((_, i) => this.amenityActive(i));
  }
  hasSelectedAmenities(): boolean { return this.selectedServices.length > 0; }

  // Contador de huéspedes
  decGuests(): void { const v = this.form.value.guests || 1; if (v > 1) this.form.patchValue({ guests: v - 1 }); }
  incGuests(): void { const v = this.form.value.guests || 1; this.form.patchValue({ guests: v + 1 }); }

  // Wizard
  canNext(): boolean { return this.currentGroupValid(); }
  back(): void { if (this.step > 0) this.step--; }

  private currentGroupValid(): boolean {
    switch (this.step) {
      case 0: return this.form.get('title')!.valid && this.form.get('guests')!.valid && this.form.get('description')!.valid;
      case 1: return this.form.get('street')!.valid && this.form.get('city')!.valid; // lat/long opcionales
      case 2: return this.form.get('placeType')!.valid && this.form.get('pricePerNight')!.valid;
      case 3: return true;
      default: return false;
    }
  }

  // Fotos (preview local)
  onFilesSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files) return;
    this.addFiles(Array.from(input.files));
    input.value = ''; // permite re-seleccionar los mismos
  }
  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(_: DragEvent) {
    this.isDragOver = false;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver = false;
    if (!e.dataTransfer) return;
    this.addFiles(Array.from(e.dataTransfer.files));
  }

  private addFiles(list: File[]) {
    const images = list.filter(f => f.type.startsWith('image/'));
    const remaining = Math.max(0, 10 - this.previews.length);
    const toAdd = images.slice(0, remaining);

    toAdd.forEach(f => {
      this.files.push(f);
      // Puedes mantener FileReader si prefieres, pero con URL es más ligero:
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
      title: this.form.value.title,
      description: this.form.value.description,
      guests: Number(this.form.value.guests),
      street: this.form.value.street,
      city: this.form.value.city,
      latitude: this.form.value.latitude ?? null,
      longitude: this.form.value.longitude ?? null,
      placeType: this.form.value.placeType,
      amenities: selectedAmenities,
      pricePerNight: Number(this.form.value.pricePerNight),
      // fotos reales: súbelas por multipart en tu servicio; aquí sólo previews
    };
  }

  submit(): void {
    if (!this.currentGroupValid()) return;
    if (this.step < 3) { this.step++; return; }
    const payload = this.buildPayload();
    console.log('CreatePlaceDTO', payload);
    // TODO: this.http.post('/api/places', formData or payload)
  }

  // UI
  currencyCOP(v: number | null | undefined): string {
    const n = Number(v || 0);
    return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }
}
