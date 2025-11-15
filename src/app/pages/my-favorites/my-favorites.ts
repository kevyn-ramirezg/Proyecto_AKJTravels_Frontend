import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FavoritesApiService } from '../../services/favorites-api-service';
import { PlaceListItemDTO } from '../../model/place-dto/place-list-item-dto';
import { TokenService } from '../../services/token-service';

@Component({
  selector: 'app-my-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-favorites.html',
  styleUrls: ['./my-favorites.css']
})
export class MyFavorites implements OnInit {

  loading = signal(false);
  error = signal<string | undefined>(undefined);
  favorites = signal<PlaceListItemDTO[]>([]);

  hasFavorites = computed(() => (this.favorites() ?? []).length > 0);

  constructor(
    private readonly favoritesApi: FavoritesApiService,
    private readonly router: Router,
    private readonly token: TokenService
  ) {}

  ngOnInit(): void {
    // Si no está logueado, puedes decidir redirigir
    if (!this.token.isLogged()) {
      // opcional: this.router.navigateByUrl('/login');
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
        this.error.set(err?.error?.message ?? 'No se pudieron cargar tus favoritos.');
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
      },
      error: (err) => {
        console.error('[MyFavorites] removeFavorite error', err);
        // Opcional: mostrar algún mensaje visual
      }
    });
  }
}
