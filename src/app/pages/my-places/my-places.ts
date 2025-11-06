import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { PlacesApiService } from '../../services/places-api-service';
import { PlaceListItemDTO } from '../../model/place-list-item-dto';

@Component({
  selector: 'app-my-places',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-places.html',
  styleUrl: './my-places.css'
})
export class MyPlaces implements OnInit {
  places: PlaceListItemDTO[] = [];

  constructor(private api: PlacesApiService) {}

  ngOnInit(): void {
    this.api.getAll().subscribe({
      next: (items) => this.places = items,
      error: () => Swal.fire('Error', 'No fue posible cargar los alojamientos', 'error')
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
