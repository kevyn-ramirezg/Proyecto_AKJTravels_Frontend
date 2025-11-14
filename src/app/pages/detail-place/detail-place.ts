// src/app/pages/detail-place/detail-place.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlacesApiService } from '../../services/places-api-service';
import { PlaceDetailDTO } from '../../model/place-dto/place-detail-dto';
import { ResponseDTO } from '../../model/response-dto';
import { MapService } from '../../services/map-service';
import {CommentDTO} from '../../model/comment-dto/comment-dto';

@Component({
  selector: 'app-detail-place',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail-place.html',
  styleUrl: './detail-place.css'
})
export default class DetailPlace {

  private route = inject(ActivatedRoute);
  private placesApi = inject(PlacesApiService);
  private router = inject(Router);
  private mapService = inject(MapService);

  loading = true;
  error?: string;

  place?: PlaceDetailDTO;
  selectedImage?: string;

  // COMMENTS
  comments: CommentDTO[] = [];
  commentsLoading = false;
  commentsError?: string;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error = 'No se encontró el alojamiento solicitado.';
      this.loading = false;
      return;
    }

    this.loadComments(id);


    this.placesApi.getDetail(id).subscribe({
      next: (res: ResponseDTO<PlaceDetailDTO> | PlaceDetailDTO) => {
        // Por si tu backend envuelve en ResponseDTO o no
        this.place = ('data' in res ? res.data : res) as PlaceDetailDTO;

        if (this.place?.pics_url && this.place.pics_url.length > 0) {
          this.selectedImage = this.place.pics_url[0];
        }

        this.loading = false;

        // Damos un pequeño tiempo para que el div del mapa exista en el DOM
        this.initMap();
      },
      error: () => {
        this.error = 'No se pudo cargar la información del sitio.';
        this.loading = false;
      }
    });
  }

  private initMap(attempt: number = 0): void {
    if (!this.place || this.place.latitude == null || this.place.longitude == null) {
      return;
    }

    const containerId = 'place-map';
    const container = document.getElementById(containerId);

    if (!container) {
      // El DOM todavía no pintó el div; reintentamos un par de veces
      if (attempt < 5) {
        setTimeout(() => this.initMap(attempt + 1), 100);
      } else {
        console.warn(`No se encontró el contenedor '${containerId}' después de varios intentos`);
      }
      return;
    }

    console.log('Creando mapa de detalle en', containerId, 'con:', this.place.latitude, this.place.longitude);

    this.mapService.createReadonlyMap(containerId, {
      lat: this.place.latitude,
      lng: this.place.longitude,
      zoom: 14,
    });
  }

  private loadComments(placeId: string): void {
    this.commentsLoading = true;
    this.commentsError = undefined;

    this.placesApi.listComments(placeId, 0).subscribe({
      next: (list) => {
        this.comments = list ?? [];
        this.commentsLoading = false;
      },
      error: (err) => {
        // Si no hay comentarios, tu back lanza ResourceNotFound
        if (err?.status === 404) {
          this.comments = [];
          this.commentsLoading = false;
          return;
        }
        console.error('Error al cargar comentarios', err);
        this.commentsError = err?.error?.message ?? 'No se pudieron cargar los comentarios.';
        this.commentsLoading = false;
      }
    });
  }

  changeImage(imageUrl: string): void {
    this.selectedImage = imageUrl;
  }

  goToBooking(): void {
    if (!this.place) {
      return;
    }

    // Ajusta la ruta de creación de reserva si es distinta
    this.router.navigate(['/create-booking'], {
      queryParams: { placeId: this.place.id }
    });
  }

  get roundedRating(): number[] {
    const value = Math.round(this.place?.averageRatings ?? 0); // o averageScore, etc.
    return Array.from({ length: 5 }, (_, i) => (i < value ? 1 : 0));
  }

  getCommentUserName(c: CommentDTO): string {
    const u: any = c.user ?? {};
    return (
      u.fullName ??
      u.name ??
      u.nombreCompleto ??
      u.username ??
      'Huésped'
    );
  }

  getCommentUserAvatar(c: CommentDTO): string | null {
    const u: any = c.user ?? {};
    return (
      u.profilePicUrl ??
      u.photoUrl ??
      u.avatarUrl ??
      u.imageUrl ??
      null
    );
  }

  getCommentUserInitials(c: CommentDTO): string {
    const name = this.getCommentUserName(c);
    if (!name.trim()) return 'H';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }


  get hostRaw(): any {
    return this.place?.userDetailDTO ?? null;
  }

  get hasHost(): boolean {
    return !!this.hostRaw;
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

}
