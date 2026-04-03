export interface FavoritePlaceDTO {
  id: string;
  title: string;
  city: string;
  address: string;
  price: number;
  photoUrl: string | null;
  averageRating: number;
  capacity: number;
}
