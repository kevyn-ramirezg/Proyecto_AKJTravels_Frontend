import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { PlacesApiService } from '../../services/places-api-service';
import { PlaceListItemDTO } from '../../model/place-dto/place-list-item-dto';

@Component({
  selector: 'app-my-places',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-places.html',
  styleUrl: './my-places.css'
})
export class MyPlaces implements OnInit, OnDestroy {
  places: PlaceListItemDTO[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private api: PlacesApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Carga inicial solo si estás en /my-places
    if (this.router.url.startsWith('/my-places')) {
      this.load();
    }

    // Recarga SOLO cuando la navegación termina en /my-places
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        map(() => this.router.url),
        filter(url => url.startsWith('/my-places')),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(): void {
    this.api.getAll().subscribe({
      next: (items: PlaceListItemDTO[]) => (this.places = items),
      error: () => Swal.fire('Error', 'No fue posible cargar los alojamientos', 'error'),
    });
  }

  onDelete(id: string) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará el alojamiento.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        this.api.delete(id).subscribe({
          next: () => {
            this.places = this.places.filter(p => p.id !== id);
            Swal.fire('Eliminado', 'El alojamiento ha sido eliminado', 'success');
          },
          error: () => Swal.fire('Error', 'No fue posible eliminar', 'error')
        });
      }
    });
  }
}
