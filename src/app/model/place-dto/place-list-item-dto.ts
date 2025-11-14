export type PlaceState = 'ACTIVE' | 'INACTIVE' | 'DELETED';

export interface PlaceListItemDTO {
  id: string;                // <— nuevo
  title: string;
  price: number;
  photo_url: string;
  average_rating: number;
  city: string;
  state?: 'ACTIVE' | 'INACTIVE' | 'DELETED';
}
