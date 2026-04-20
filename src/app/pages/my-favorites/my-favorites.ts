import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FavoritesApiService } from '../../services/favorites-api-service';
import { PlaceListItemDTO } from '../../model/place-dto/place-list-item-dto';
import { TokenService } from '../../services/token-service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-my-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-favorites.html',
  styleUrl: './my-favorites.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyFavorites implements OnInit {

  loading = signal(false);
  error = signal<string | undefined>(undefined);
  favorites = signal<PlaceListItemDTO[]>([]);

  hasFavorites = computed(() => this.favorites().length > 0);

  constructor(
    private readonly favoritesApi: FavoritesApiService,
    private readonly router: Router,
    private readonly token: TokenService
  ) {}

  ngOnInit(): void {
    if (!this.token.isLogged()) {
      Swal.fire({
        icon: 'info',
        title: 'Inicia sesión',
        text: 'Debes estar logueado para ver tus favoritos.'
      }).then(() => {
        this.router.navigateByUrl('/login');
      });
      return;
    }

    this.loadFavorites();
  }

  loadFavorites(): void {
    this.loading.set(true);
    this.error.set(undefined);

    this.favoritesApi.listMyFavorites().subscribe({
      next: (list) => {
        this.favorites.set(list ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[MyFavorites] listMyFavorites error', err);
        this.error.set('No pudimos cargar tus favoritos. Intenta recargando la página.');
        this.loading.set(false);
      }
    });
  }

  goToDetail(place: PlaceListItemDTO): void {
    this.router.navigate(['/detail-place', place.id]);
  }

  removeFromFavorites(place: PlaceListItemDTO): void {
    this.favoritesApi.remove(String(place.id)).subscribe({
      next: () => {
        this.favorites.set(this.favorites().filter(p => p.id !== place.id));
        Swal.fire({
          icon: 'success',
          title: 'Favorito eliminado',
          text: `${place.title} ha sido quitado de tus favoritos`,
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        console.error('[MyFavorites] removeFromFavorites error', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No pudimos quitar el favorito. Intenta de nuevo.'
        });
      }
    });
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/img/place-placeholder.jpg';
  }
}
