import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, JsonPipe } from '@angular/common';
import { PlacesApiService } from '../../services/places-api-service';
import { PlaceDetailDTO } from '../../model/place-detail-dto';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detail-place',
  standalone: true,
  imports: [CommonModule, JsonPipe],
  templateUrl: './detail-place.html',
  styleUrls: ['./detail-place.css']
})
export class DetailPlace {
  place?: PlaceDetailDTO;

  constructor(private route: ActivatedRoute, private api: PlacesApiService) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getDetail(id).subscribe({
      next: (p) => this.place = p,
      error: () => Swal.fire('Error', 'No fue posible cargar el detalle', 'error')
    });
  }
}
