import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

import Swal from 'sweetalert2';

// Servicios / modelos
import { PlacesApiService } from '../../services/places-api-service';
import { PlaceDetailDTO } from '../../model/place-dto/place-detail-dto';
import { EditPlaceDTO } from '../../model/place-dto/edit-place-dto';

interface ServiceItem { code: string; label: string; icon?: string }

@Component({
  selector: 'app-edit-place',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-place.html',
  styleUrls: ['./edit-place.css']
})
export class EditPlace implements OnInit, OnDestroy {
  form!: FormGroup;
  step = 0; // 0: info, 1: servicios/precio, 2: fotos/resumen

  // Id del place a editar
  private placeId!: string;

  // Tipos con iconos
  placeTypesWithIcons = [
    { code: 'HOUSE', label: 'Casa', icon: 'cottage' },
    { code: 'APARTMENT', label: 'Apartamento', icon: 'apartment' },
    { code: 'FARM', label: 'Finca', icon: 'agriculture' }
  ];

  // Enum Services del backend
  servicesList: ServiceItem[] = [
    { code: 'WIFI',                 label: 'Wi-Fi',               icon: 'wifi' },
    { code: 'BREAKFAST_INCLUDED',   label: 'Desayuno',            icon: 'restaurant' },
    { code: 'AIR_CONDITIONING',     label: 'Aire acondicionado',  icon: 'ac_unit' },
    { code: 'POOL',                 label: 'Piscina',             icon: 'pool' },
    { code: 'TELEVISION',           label: 'Televisión',          icon: 'tv' },
    { code: 'PARKING',              label: 'Parqueadero',         icon: 'local_parking' },
    { code: 'GYM',                  label: 'Gimnasio',            icon: 'fitness_center' },
    { code: 'SPA',                  label: 'Spa',                 icon: 'spa' },
    { code: 'RESTAURANT',           label: 'Restaurante',         icon: 'restaurant_menu' },
    { code: 'BAR',                  label: 'Bar',                 icon: 'local_bar' },
  ];

  // Imágenes (carga local)
  previews: string[] = [];
  files: File[] = [];
  isDragOver = false;
  mainIndex = 0;

  private subs: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private placesApi: PlacesApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.buildForm();
  }

  // ===== Form =====
  private buildForm(): void {
    this.form = this.fb.group({
      // Paso 0 – Info básica
      title:        ['', [Validators.required, Validators.maxLength(120)]],
      description:  ['', [Validators.required, Validators.maxLength(2000)]],
      capacity:     [1,  [Validators.required, Validators.min(1), Validators.max(50)]],
      city:         ['', Validators.required],

      // Paso 1 – Servicios + tipo + precio
      placeType:     ['APARTMENT', Validators.required],
      amenities:     this.fb.array(this.servicesList.map(() => this.fb.control(false))),
      pricePerNight: [430000, [Validators.required, Validators.min(10000)]],

      // Paso 2 – Fotos (no se envían como parte del PUT; se suben por endpoint aparte)
      photoFiles: [null]
    });
  }

  get amenitiesFA(): FormArray { return this.form.get('amenities') as FormArray; }
  amenityActive(i: number): boolean { return !!this.amenitiesFA.at(i).value; }
  toggleAmenity(i: number): void { this.amenitiesFA.at(i).setValue(!this.amenitiesFA.at(i).value); }
  get selectedServices() { return this.servicesList.filter((_, i) => this.amenityActive(i)); }
  hasSelectedAmenities(): boolean { return this.selectedServices.length > 0; }

  // Counter
  decCapacity(): void { const v = this.form.value.capacity || 1; if (v > 1) this.form.patchValue({ capacity: v - 1 }); }
  incCapacity(): void { const v = this.form.value.capacity || 1; this.form.patchValue({ capacity: v + 1 }); }

  // Wizard
  canNext(): boolean {
    switch (this.step) {
      case 0:
        return this.form.get('title')!.valid
          && this.form.get('description')!.valid
          && this.form.get('capacity')!.valid;
      case 1:
        return this.form.get('placeType')!.valid
          && this.form.get('pricePerNight')!.valid
          && this.hasSelectedAmenities();
      case 2:
        // En edición las fotos son opcionales (si no cambia, no sube)
        return true;
      default: return false;
    }
  }
  back(): void { if (this.step > 0) this.step--; }

  // ===== Imágenes (frontend) =====
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


  // ===== Carga inicial =====
  ngOnInit(): void {
    this.placeId = this.route.snapshot.paramMap.get('id') as string;

    Swal.fire({ title: 'Cargando…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    const s = this.placesApi.getDetail(this.placeId)
      .pipe(catchError(err => {
        Swal.fire({ icon: 'error', title: 'No se pudo cargar', text: 'Hubo un problema al cargar los datos del alojamiento. Por favor intenta de nuevo.' });
        return of(null as unknown as PlaceDetailDTO);
      }))
      .subscribe(detail => {
        Swal.close();
        if (!detail) return;

        // Patch de campos editables
        this.form.patchValue({
          title:        (detail as any).title ?? '',
          description:  (detail as any).description ?? '',
          capacity:     (detail as any).capacity ?? 1,
          city:         (detail as any).city ?? '',
          placeType:    (detail as any).place_type ?? (detail as any).placeType ?? 'APARTMENT',
          pricePerNight:(detail as any).price ?? (detail as any).pricePerNight ?? 430000,
        });

        // Servicios → checkboxes
        const amenitiesCodes: string[] = (detail as any).amenities ?? (detail as any).services ?? [];
        this.servicesList.forEach((s, i) => {
          this.amenitiesFA.at(i).setValue(amenitiesCodes?.includes(s.code));
        });

        // Previews (si quieres mostrar las actuales)
        const pics: string[] = (detail as any).pics_url ?? (detail as any).picsUrl ?? [];
        this.previews = Array.isArray(pics) ? pics.slice(0, 10) : [];
        this.cdr.markForCheck();
      });
    this.subs.push(s);
  }

  // ===== Guardar =====
  private buildEditPayload(): EditPlaceDTO {
    const selectedAmenities = this.servicesList
      .map((s, i) => (this.amenitiesFA.at(i).value ? s.code : null))
      .filter(Boolean) as string[];

    const payload: any = {
      title:       String(this.form.value.title ?? '').trim(),
      description: String(this.form.value.description ?? '').trim(),
      placeType:   String(this.form.value.placeType ?? 'APARTMENT'),
      capacity:    Number(this.form.value.capacity ?? 1),
      price:       Number(this.form.value.pricePerNight ?? 0),
      amenities:   selectedAmenities
    };

    return payload as EditPlaceDTO;
  }

  submit(): void {
    // Validación/avance de pasos
    if (!this.canNext()) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Completa los campos del paso actual.' });
      return;
    }

    if (this.step < 2) { this.step++; return; }

    // Paso final: PUT + (opcional) uploadImages
    const payload = this.buildEditPayload();

    Swal.fire({ title: 'Guardando…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    this.placesApi.update(this.placeId, payload).subscribe({
      next: () => {
        // Si subió nuevas imágenes, súbelas ahora
        const afterUpdate = () => {
          Swal.fire({ icon: 'success', title: 'Alojamiento actualizado' }).then(() => {
            this.router.navigate(['/host-dashboard']);
          });
        };

        if (this.files.length > 0) {
          this.placesApi.uploadImages(this.placeId, this.files, this.mainIndex).subscribe({
            next: () => afterUpdate(),
            error: (err) => {
              Swal.fire({
                icon: 'warning',
                title: 'Actualizado (con aviso)',
                text: 'Los datos se guardaron, pero las imágenes no se pudieron subir. Por favor intenta de nuevo desde editar.'
              }).then(() => this.router.navigate(['/host-dashboard']));
            }
          });
        } else {
          afterUpdate();
        }
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'No se pudo actualizar', text: 'Hubo un problema al guardar los cambios. Por favor intenta de nuevo.' });
      }
    });
  }

  // UI
  currencyCOP(v: number | null | undefined): string {
    const n = Number(v || 0);
    return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.previews.forEach(src => { try { URL.revokeObjectURL(src); } catch {} });
  }
}
