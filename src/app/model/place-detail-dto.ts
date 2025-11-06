export interface PlaceDetailDTO {

  id: string;
  latitude: number;
  longitude: number;
  price: number;
  pics_url: string[];
  description: string;
  services: string[];     // luego tipas con enum
  title: string;
  capacity: number;
  averageRatings: number; // camelCase (¡ojo!)
  userDetailDTO: any;

}
