export interface EditPlaceDTO {
  title?: string;
  description?: string;
  capacity?: number;
  price?: number;
  country?: string;
  department?: string;
  city?: string;
  neighborhood?: string | null;
  street?: string | null;
  postalCode?: string;
  pics_url?: string[];      // snake_case en Edit (¡ojo!)
  amenities?: string[];     // enum luego
  placeType?: string;
}
