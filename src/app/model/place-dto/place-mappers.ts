import { PlaceListItemDTO } from './place-list-item-dto';
import { CreatePlaceDTO } from './create-place-dto';

// Si tu tabla/plantillas prefieren camelCase:
export interface PlaceListItemView {
  id?: number | string;
  title: string;
  price: number;
  photoUrl: string;        // camelCase para plantillas
  averageRating: number;
  city: string;
}

/* -------- Listado: API -> View -------- */
export function toPlaceListItemView(api: PlaceListItemDTO): PlaceListItemView {
  return {
    id: (api as any).id,  // por si el backend la envía
    title: api.title,
    price: api.price,
    photoUrl: api.photo_url,
    averageRating: api.average_rating,
    city: api.city
  };
}

/* -------- Creación/Edición: ViewModel/Form -> API -------- */
// Si tu formulario usa el mismo CreatePlaceDTO, puedes enviar tal cual.
// Si en tu form usas camelCase diferentes, crea un mapper inverso cuando lo necesites.
export function toCreatePlaceApi(payload: CreatePlaceDTO): CreatePlaceDTO {
  // Aquí puedes normalizar si hace falta (trims, defaults, etc.)
  return payload;
}
