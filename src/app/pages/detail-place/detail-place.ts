// src/app/pages/detail-place/detail-place.ts
import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';
import { PlacesApiService } from '../../services/places-api-service';
import { PlaceDetailDTO } from '../../model/place-dto/place-detail-dto';
import { ResponseDTO } from '../../model/response-dto';
import { MapService } from '../../services/map-service';
import {CommentDTO} from '../../model/comment-dto/comment-dto';
import {FavoritesApiService} from '../../services/favorites-api-service';
import {TokenService} from '../../services/token-service';
import Swal from 'sweetalert2';
import { SERVICES_LIST, ServiceItem } from '../../constants/services';
import { UserDetailDTO } from '../../model/user-dto/user-detail-dto';
import { SafeHtmlPipe } from '../../pipes/sanitization.pipe';

@Component({
  selector: 'app-detail-place',
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  templateUrl: './detail-place.html',
  styleUrl: './detail-place.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class DetailPlace implements OnInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private placesApi = inject(PlacesApiService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private mapService = inject(MapService);
  private favoritesApi = inject(FavoritesApiService);
  private token        = inject(TokenService);
  private cdr          = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();


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
  // SERVICIOS desde constante centralizada
  servicesList: ServiceItem[] = SERVICES_LIST;
  mappedServices: ServiceItem[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error = 'No se encontró el alojamiento solicitado.';
      this.loading = false;
      return;
    }

    this.loadComments(id);

    this.placesApi.getDetail(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudo cargar la información del sitio.';
        this.loading = false;
        this.cdr.markForCheck();
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

    this.placesApi.listComments(placeId, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (list) => {
        this.comments = list ?? [];
        this.commentsLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.commentsLoading = false;
        
        // 404 = Sin comentarios (no es un error real)
        // El backend devuelve 404 cuando no hay comentarios registrados
        if (err?.status === 404) {
          this.comments = [];
          console.log('[DetailPlace] No hay comentarios registrados para este alojamiento');
          this.cdr.markForCheck();
          return;
        }

        // Para todos los otros errores (500, network, etc), mostrar mensaje al usuario
        // El error interceptor global ya notificó al usuario, aquí solo informamos localmente
        console.error('[DetailPlace] Error al cargar comentarios:', err);
        this.commentsError = 'No pudimos cargar los comentarios en este momento.';
        this.comments = [];
        this.cdr.markForCheck();
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
    const u = c.user;
    // ✅ FIX: Validar que user no sea null/undefined
    if (!u) return 'Huésped';
    
    // ✅ FIX: Validar también strings vacíos
    const fullName = u.fullName?.trim();
    const name = u.name?.trim();
    
    return (
      (fullName && fullName.length > 0 ? fullName : undefined) ??
      (name && name.length > 0 ? name : undefined) ??
      'Huésped'
    );
  }

  getCommentUserAvatar(c: CommentDTO): string | null {
    const u = c.user;
    // ✅ FIX: Validar que user no sea null/undefined
    if (!u) return null;
    
    return (
      u.profilePicUrl ??
      u.photoUrl ??
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

  getCommentText(c: any): string {
    // Maneja múltiples nombres posibles para el campo de comentario
    return (
      c?.comment ??
      c?.text ??
      c?.message ??
      c?.description ??
      c?.contenido ??
      c?.comentario ??
      ''
    );
  }

  getCommentReply(c: any): string {
    // Maneja múltiples nombres posibles para la respuesta del anfitrión
    return (
      c?.reply ??
      c?.replyText ??
      c?.replyMessage ??
      c?.respuesta ??
      ''
    );
  }


  get hostRaw(): UserDetailDTO | null {
    return this.place?.userDetailDTO ?? null;
  }

  get hasHost(): boolean {
    return !!this.hostRaw;
  }

  get hostName(): string {
    const h = this.hostRaw;
    if (!h) return 'Anfitrión';
    return (
      h.fullName ??
      h.name ??
      h.nombreCompleto ??
      h.username ??
      'Anfitrión'
    );
  }

  get hostAvatar(): string | null {
    const h = this.hostRaw;
    if (!h) return null;
    return (
      h.profilePicUrl ??
      h.photoUrl ??
      h.avatarUrl ??
      h.imageUrl ??
      h.avatar ??
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
    this.favoritesApi.countFavorites(placeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: n => {
        this.favoriteCount = (n ?? 0);
        this.cdr.markForCheck();
      },
      error: () => {
        this.favoriteCount = null;
        this.cdr.markForCheck();
      }
    });

    // Estado "es mi favorito" solo si es huésped logueado
    if (this.canFavorite()) {
      this.favoritesApi.isMyFavorite(placeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: flag => {
          this.isFavorite = !!flag;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isFavorite = false;
          this.cdr.markForCheck();
        }
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

    // ✅ FIX: Bloquear si ya hay una petición en flight (prevenir race condition)
    if (this.favoriteLoading) return;

    this.favoriteLoading = true;
    const placeId = this.place.id;
    // ✅ FIX: Determinar estado ANTES de enviar para evitar inconsistencia
    const newState = !this.isFavorite;
    const obs = newState
      ? this.favoritesApi.add(placeId)
      : this.favoritesApi.remove(placeId);

    obs
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isFavorite = newState;  // ✅ Usar state predeterminado
          if (this.favoriteCount == null) this.favoriteCount = 0;
          this.favoriteCount += newState ? 1 : -1;
          if (this.favoriteCount < 0) this.favoriteCount = 0;
          this.favoriteLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('[DetailPlace] toggleFavorite error', err);
          this.favoriteLoading = false;  // ✅ Desbloquear en error
          this.cdr.markForCheck();
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
