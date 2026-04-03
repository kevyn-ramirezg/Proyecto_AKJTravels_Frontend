// src/app/pages/detail-place/detail-place.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlacesApiService } from '../../services/places-api-service';
import { PlaceDetailDTO } from '../../model/place-dto/place-detail-dto';
import { ResponseDTO } from '../../model/response-dto';
import { MapService } from '../../services/map-service';
import {CommentDTO} from '../../model/comment-dto/comment-dto';
import {FavoritesApiService} from '../../services/favorites-api-service';
import {TokenService} from '../../services/token-service';
import Swal from 'sweetalert2';

interface ServiceItem {
  code: string;
  label: string;
  icon: string;
}

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
  private favoritesApi = inject(FavoritesApiService);
  private token        = inject(TokenService);


  loading = true;
  error?: string;

  place?: PlaceDetailDTO;
  selectedImage?: string;
  // FAVORITE
  favoriteCount: number | null = null;
  favoriteLoading = false;
  isFavorite = false;
  // COMMENTS
  comments: CommentDTO[] = [];
  commentsLoading = false;
  commentsError?: string;
  // SERVICIOS
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

        // Mapear los servicios disponibles
        this.mappedServices = (this.place?.services || [])
          .map(code => this.servicesList.find(s => s.code === code))
          .filter((s): s is ServiceItem => !!s);

        this.loading = false;

// 🔹 NUEVO
        this.loadFavoriteMeta();

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
        this.commentsError = 'No pudimos cargar los comentarios. Por favor recarga la página.';
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
  private loadFavoriteMeta(): void {
    if (!this.place) return;
    const placeId = this.place.id;

    // Conteo de favoritos
    this.favoritesApi.countFavorites(placeId).subscribe({
      next: n => this.favoriteCount = (n ?? 0),
      error: () => this.favoriteCount = null
    });

    // Estado "es mi favorito" solo si es huésped logueado
    if (this.canFavorite()) {
      this.favoritesApi.isMyFavorite(placeId).subscribe({
        next: flag => this.isFavorite = !!flag,
        error: () => this.isFavorite = false
      });
    }
  }

  /** Solo huéspedes logueados pueden guardar favoritos */
  canFavorite(): boolean {
    return this.token.isLogged() && this.token.getRole() !== 'HOST';
  }

  toggleFavorite(): void {
    if (!this.place) return;

    if (!this.canFavorite()) {
      Swal.fire({
        icon: 'info',
        title: 'Inicia sesión como huésped',
        text: 'Solo los huéspedes pueden guardar alojamientos como favoritos.'
      });
      return;
    }

    this.favoriteLoading = true;
    const placeId = this.place.id;
    const obs = this.isFavorite
      ? this.favoritesApi.remove(placeId)
      : this.favoritesApi.add(placeId);

    obs.subscribe({
      next: () => {
        this.isFavorite = !this.isFavorite;
        if (this.favoriteCount == null) this.favoriteCount = 0;
        this.favoriteCount += this.isFavorite ? 1 : -1;
        if (this.favoriteCount < 0) this.favoriteCount = 0;
        this.favoriteLoading = false;
      },
      error: (err) => {
        console.error('[DetailPlace] toggleFavorite error', err);
        this.favoriteLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'No se pudo actualizar tu favorito',
          text: 'Hubo un problema al procesar tu solicitud. Por favor intenta de nuevo.'
        });
      }
    });
  }

  // Construir dirección legible
  get fullAddress(): string {
    const parts: string[] = [];
    if (this.place?.street) parts.push(this.place.street);
    if (this.place?.neighborhood) parts.push(this.place.neighborhood);
    if (this.place?.city) parts.push(this.place.city);
    if (this.place?.department) parts.push(this.place.department);
    if (this.place?.country) parts.push(this.place.country);
    if (this.place?.postalCode) parts.push(this.place.postalCode);
    return parts.filter(p => p).join(', ');
  }

  hasAddress(): boolean {
    return !!this.fullAddress;
  }

}
