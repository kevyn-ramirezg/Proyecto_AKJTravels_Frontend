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
  userDetailDTO: any;
}
