import { UserDetailDTO } from '../user-dto/user-detail-dto';

export interface PlaceDetailDTO {
  id: string;
  latitude: number;
  longitude: number;
  price: number;
  pics_url: string[];
  description: string;
  services: string[];       // <- usamos este para precargar amenities
  title: string;
  capacity: number;
  averageRatings: number;
  userDetailDTO: UserDetailDTO;
  // Dirección / ubicación
  street?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  department?: string | null;
  country?: string | null;
  postalCode?: string | null;
}
