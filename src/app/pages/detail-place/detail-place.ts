// src/app/pages/detail-place/detail-place.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlacesApiService } from '../../services/places-api-service';
import { PlaceDetailDTO } from '../../model/place-detail-dto';
import { ResponseDTO } from '../../model/response-dto';
import { MapService } from '../../services/map-service';

@Component({
  selector: 'app-detail-place',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail-place.html',
  styleUrl: './detail-place.css'
})
export default class DetailPlaceComponent {

  private route = inject(ActivatedRoute);
  private placesApi = inject(PlacesApiService);
  private router = inject(Router);
  private mapService = inject(MapService);

  loading = true;
  error?: string;

  place?: PlaceDetailDTO;
  selectedImage?: string;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error = 'No se encontró el alojamiento solicitado.';
      this.loading = false;
      return;
    }

    this.placesApi.getDetail(id).subscribe({
      next: (res: ResponseDTO<PlaceDetailDTO> | PlaceDetailDTO) => {
        this.place = ('message' in res ? res.message : res) as PlaceDetailDTO;

        if (this.place?.pics_url && this.place.pics_url.length > 0) {
          this.selectedImage = this.place.pics_url[0];
        }

        this.loading = false;
        setTimeout(() => this.initMap(), 0);
      },
      error: () => {
        this.error = 'No se pudo cargar la información del sitio.';
        this.loading = false;
      }
    });
  }

  private initMap(): void {
    if (!this.place || this.place.latitude == null || this.place.longitude == null) {
      return;
    }

    this.mapService.createReadonlyMap('place-map', {
      lat: this.place.latitude,
      lng: this.place.longitude,
      zoom: 14
    });
  }

  changeImage(imageUrl: string): void {
    this.selectedImage = imageUrl;
  }

  goToBooking(): void {
    if (!this.place) return;

    this.router.navigate(['/create-booking'], {
      queryParams: { placeId: this.place.id }
    });
  }

  get roundedRating(): number[] {
    const value = Math.round(this.place?.averageRatings ?? 0);
    return Array.from({ length: 5 }, (_, i) => (i < value ? 1 : 0));
  }

  // === HOST GETTERS ===

  get hostRaw(): any {
    return this.place?.userDetailDTO ?? null;
  }

  get hostName(): string {
    const h = this.hostRaw;
    return (
      h?.fullName ??
      h?.name ??
      h?.nombreCompleto ??
      h?.username ??
      'Anfitrión'
    );
  }

  get hostAvatar(): string | null {
    const h = this.hostRaw;
    return (
      h?.profilePicUrl ??
      h?.photoUrl ??
      h?.avatarUrl ??
      h?.imageUrl ??
      null
    );
  }

  get hostInitials(): string {
    const name = this.hostName ?? '';
    if (!name.trim()) return 'A';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  get hasHost(): boolean {
    return !!this.hostRaw;
  }
}
