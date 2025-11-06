export interface CreatePlaceDTO {
  title: string;
  description: string;
  price: number;
  picsUrl: string[];        // camelCase (¡diferente a Edit!)
  placeType: string;        // luego lo reemplazas por enum
  capacity: number;
  country: string;
  department: string;
  city: string;
  neighborhood?: string | null;
  street?: string | null;
  postalCode: string;
  amenities: string[];      // enum luego
  latitude: number;
  longitude: number;

}
